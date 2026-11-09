import type { Prisma, PrismaClient } from "@prisma/client";
import { getInstalmentState } from "./instalments";
import { generateRiskNote, signalsFromReasons } from "./llm";
import { computeRisk, shouldCreateFlag } from "./risk";

interface StudentForRisk {
  feePlan: {
    instalments: { amount: number; dueDate: Date; payments: { amount: number }[] }[];
  } | null;
  attendance: { percent: number }[];
  testScores: { score: number }[];
}

function riskFor(s: StudentForRisk, today: Date) {
  const instalments = (s.feePlan?.instalments ?? []).map((i) => ({
    amount: i.amount,
    dueDate: i.dueDate,
    paid: i.payments.reduce((sum, p) => sum + p.amount, 0),
  }));
  const result = computeRisk({
    instalments,
    attendanceByMonth: s.attendance.map((a) => a.percent),
    testScores: s.testScores.map((t) => t.score),
    today,
  });
  return { ...result, instalments };
}

export async function runRiskJob(db: PrismaClient, today: Date) {
  const students = await db.student.findMany({
    where: { status: "ACTIVE", feePlan: { isNot: null } },
    include: {
      feePlan: {
        include: {
          instalments: { include: { payments: { where: { status: "SUCCESS" }, select: { amount: true } } } },
        },
      },
      attendance: { orderBy: { month: "asc" } },
      testScores: { orderBy: { date: "asc" } },
      riskFlags: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  let created = 0;

  for (const s of students) {
    const { score, reasons, instalments } = riskFor(s, today);

    const prev = s.riskFlags[0] ?? null;
    const hasNewOverdue = prev
      ? instalments.some(
          (i) => getInstalmentState({ ...i, today }).status === "overdue" && i.dueDate > prev.createdAt
        )
      : false;

    const create = shouldCreateFlag({
      score,
      previousFlag: prev ? { score: prev.score, status: prev.status } : null,
      hasNewOverdue,
    });
    if (!create) continue;

    const { note, source } = await generateRiskNote(signalsFromReasons(reasons, score));
    // A flag only ever creates a counsellor task. It never messages a parent or touches fees.
    await db.riskFlag.create({
      data: {
        studentId: s.id,
        score,
        reasonsJson: reasons as unknown as Prisma.InputJsonValue,
        aiNote: note,
        aiNoteSource: source,
        status: "OPEN",
        tasks: { create: { status: "OPEN" } },
      },
    });
    created += 1;
  }

  // Backfill open flags that have no note, or whose stored reasons carry no signals
  // (for example the seeded ones). Reasons and score are recomputed from live data.
  const byId = new Map(students.map((s) => [s.id, s]));
  const open = await db.riskFlag.findMany({ where: { status: "OPEN" } });
  let notes = 0;

  for (const f of open) {
    const stored = signalsFromReasons(f.reasonsJson, f.score);
    const hasSignals = Object.keys(stored).length > 1; // more than just "score"
    if (f.aiNote && hasSignals) continue;

    let reasons: unknown = f.reasonsJson;
    let score = f.score;
    const s = byId.get(f.studentId);
    if (!hasSignals && s) {
      const live = riskFor(s, today);
      reasons = live.reasons;
      score = live.score;
    }

    const { note, source } = await generateRiskNote(signalsFromReasons(reasons, score));
    await db.riskFlag.update({
      where: { id: f.id },
      data: {
        score,
        reasonsJson: reasons as Prisma.InputJsonValue,
        aiNote: note,
        aiNoteSource: source,
      },
    });
    notes += 1;
  }

  return { created, notes };
}