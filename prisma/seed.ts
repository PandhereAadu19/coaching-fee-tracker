import {
  FlagStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ReminderStatus,
  Role,
  StudentStatus,
  TaskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TODAY = "2026-11-02";
const GST_DIVISOR = 1.18;

const ACCOUNTS_PHONE = "9000000001";
const PARENT_PHONE_START = 9000000003;

type Category =
  | "paid"
  | "part"
  | "overdue_1_30"
  | "overdue_31_60"
  | "overdue_60"
  | "upcoming";

type InstalmentSpec = {
  seq: number;
  due: string;
  amountRupees: number;
  paidRupees: number;
};

type StudentSeed = {
  code: string;
  name: string;
  batchKey: string;
  parentName: string;
  language: "en" | "hi";
  consentAt: string | null;
  category: Category;
  instalments: InstalmentSpec[];
  falling: boolean;
  flag?: {
    score: number;
    status: FlagStatus;
    aiNote: string | null;
    aiNoteSource: string | null;
    taskStatus: TaskStatus;
    taskNote: string | null;
  };
};

const CENTRES = [
  { key: "malviya", name: "Jaipur Malviya Nagar" },
  { key: "vaishali", name: "Jaipur Vaishali Nagar" },
  { key: "mansarovar", name: "Jaipur Mansarovar" },
] as const;

const BATCHES = [
  { key: "jee-morning", name: "JEE 2027 Morning", centreKey: "malviya" },
  { key: "jee-evening", name: "JEE 2027 Evening", centreKey: "vaishali" },
  { key: "neet-morning", name: "NEET 2027 Morning", centreKey: "mansarovar" },
  { key: "neet-evening", name: "NEET 2027 Evening", centreKey: "malviya" },
] as const;

const BATCH_KEYS = BATCHES.map((batch) => batch.key);

const EXTRA_STUDENTS: Array<{ name: string; category: Category; parent: string }> = [
  { name: "Vihaan Agarwal", category: "paid", parent: "Rekha Agarwal" },
  { name: "Ananya Jain", category: "paid", parent: "Nitin Jain" },
  { name: "Kabir Singh", category: "paid", parent: "Pooja Singh" },
  { name: "Diya Rathore", category: "paid", parent: "Mahesh Rathore" },
  { name: "Arjun Choudhary", category: "paid", parent: "Seema Choudhary" },
  { name: "Myra Kapoor", category: "paid", parent: "Vikram Kapoor" },
  { name: "Aditya Verma", category: "paid", parent: "Neha Verma" },
  { name: "Sara Khan", category: "paid", parent: "Imran Khan" },
  { name: "Reyansh Gupta", category: "part", parent: "Alka Gupta" },
  { name: "Aisha Qureshi", category: "part", parent: "Farhan Qureshi" },
  { name: "Vivaan Sharma", category: "part", parent: "Kiran Sharma" },
  { name: "Navya Bansal", category: "part", parent: "Rajesh Bansal" },
  { name: "Krish Patel", category: "part", parent: "Hetal Patel" },
  { name: "Anika Joshi", category: "part", parent: "Sanjay Joshi" },
  { name: "Shaurya Yadav", category: "overdue_1_30", parent: "Manoj Yadav" },
  { name: "Kiara Malhotra", category: "overdue_1_30", parent: "Anil Malhotra" },
  { name: "Atharv Tiwari", category: "overdue_1_30", parent: "Shalini Tiwari" },
  { name: "Pihu Saxena", category: "overdue_1_30", parent: "Deepak Saxena" },
  { name: "Dev Sharma", category: "overdue_1_30", parent: "Ritu Sharma" },
  { name: "Aanya Reddy", category: "overdue_1_30", parent: "Suresh Reddy" },
  { name: "Yuvraj Chauhan", category: "overdue_1_30", parent: "Kavya Chauhan" },
  { name: "Meera Iyer", category: "overdue_1_30", parent: "Ramesh Iyer" },
  { name: "Harshvardhan Singh", category: "overdue_31_60", parent: "Dinesh Singh" },
  { name: "Zara Sheikh", category: "overdue_31_60", parent: "Asif Sheikh" },
  { name: "Lakshya Pandey", category: "overdue_31_60", parent: "Geeta Pandey" },
  { name: "Riya Dubey", category: "overdue_31_60", parent: "Prakash Dubey" },
  { name: "Omkar Joshi", category: "overdue_31_60", parent: "Swati Joshi" },
  { name: "Saanvi Nair", category: "overdue_31_60", parent: "Arun Nair" },
  { name: "Kartik Mishra", category: "overdue_60", parent: "Vinod Mishra" },
  { name: "Ishaan Bhatt", category: "overdue_60", parent: "Lata Bhatt" },
  { name: "Tara Kulkarni", category: "overdue_60", parent: "Nikhil Kulkarni" },
  { name: "Neil Dsouza", category: "overdue_60", parent: "Maria Dsouza" },
  { name: "Avni Khandelwal", category: "upcoming", parent: "Gaurav Khandelwal" },
  { name: "Rohan Shekhawat", category: "upcoming", parent: "Bhavna Shekhawat" },
  { name: "Pari Goyal", category: "upcoming", parent: "Amit Goyal" },
  { name: "Ayaan Siddiqui", category: "upcoming", parent: "Nazia Siddiqui" },
  { name: "Inaaya Khan", category: "upcoming", parent: "Salman Khan" },
];

const FALLING_FLAGS: Record<
  string,
  StudentSeed["flag"]
> = {
  "Shaurya Yadav": {
    score: 64,
    status: FlagStatus.FALSE_FLAG,
    aiNote:
      "Attendance fell from 90 to 58 and test scores from 82 to 51 over three months, with one late instalment. Ask whether the drop is temporary and whether the family still wants to continue. Confirm the overdue instalment.",
    aiNoteSource: "template",
    taskStatus: TaskStatus.DONE,
    taskNote: "Reviewed with the parent. Drop was due to travel. Marked false flag.",
  },
  "Harshvardhan Singh": {
    score: 78,
    status: FlagStatus.OPEN,
    aiNote: null,
    aiNoteSource: null,
    taskStatus: TaskStatus.OPEN,
    taskNote: null,
  },
  "Zara Sheikh": {
    score: 84,
    status: FlagStatus.OPEN,
    aiNote: null,
    aiNoteSource: null,
    taskStatus: TaskStatus.OPEN,
    taskNote: null,
  },
  "Kartik Mishra": {
    score: 91,
    status: FlagStatus.OPEN,
    aiNote: null,
    aiNoteSource: null,
    taskStatus: TaskStatus.OPEN,
    taskNote: null,
  },
  "Ishaan Bhatt": {
    score: 73,
    status: FlagStatus.OPEN,
    aiNote: null,
    aiNoteSource: null,
    taskStatus: TaskStatus.OPEN,
    taskNote: null,
  },
};

function paise(rupees: number): number {
  return rupees * 100;
}

function day(iso: string): Date {
  const [year, month, date] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function addDays(iso: string, days: number): string {
  const [year, month, date] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + days));
  return shifted.toISOString().slice(0, 10);
}

function gstSplit(totalPaise: number): { baseAmount: number; gstAmount: number; total: number } {
  const baseAmount = Math.round(totalPaise / GST_DIVISOR);
  return { baseAmount, gstAmount: totalPaise - baseAmount, total: totalPaise };
}

function phoneAt(index: number): string {
  return String(PARENT_PHONE_START + index);
}

function instalmentsFor(category: Category, amount: number, shift: number): InstalmentSpec[] {
  const due = (iso: string) => addDays(iso, shift);
  if (category === "paid") {
    return [
      { seq: 1, due: due("2026-04-10"), amountRupees: amount, paidRupees: amount },
      { seq: 2, due: due("2026-07-10"), amountRupees: amount, paidRupees: amount },
      { seq: 3, due: due("2026-10-01"), amountRupees: amount, paidRupees: amount },
    ];
  }
  if (category === "part") {
    return [
      { seq: 1, due: due("2026-04-10"), amountRupees: amount, paidRupees: amount },
      { seq: 2, due: due("2026-10-18"), amountRupees: amount, paidRupees: amount / 2 },
      { seq: 3, due: due("2027-01-18"), amountRupees: amount, paidRupees: 0 },
    ];
  }
  if (category === "overdue_1_30") {
    return [
      { seq: 1, due: due("2026-05-10"), amountRupees: amount, paidRupees: amount },
      { seq: 2, due: due("2026-10-12"), amountRupees: amount, paidRupees: 0 },
      { seq: 3, due: due("2027-01-12"), amountRupees: amount, paidRupees: 0 },
    ];
  }
  if (category === "overdue_31_60") {
    return [
      { seq: 1, due: due("2026-05-10"), amountRupees: amount, paidRupees: amount },
      { seq: 2, due: due("2026-09-10"), amountRupees: amount, paidRupees: 0 },
      { seq: 3, due: due("2027-01-10"), amountRupees: amount, paidRupees: 0 },
    ];
  }
  if (category === "overdue_60") {
    return [
      { seq: 1, due: due("2026-04-20"), amountRupees: amount, paidRupees: amount },
      { seq: 2, due: due("2026-08-01"), amountRupees: amount, paidRupees: 0 },
      { seq: 3, due: due("2026-12-01"), amountRupees: amount, paidRupees: 0 },
    ];
  }
  return [
    { seq: 1, due: due("2026-06-01"), amountRupees: amount, paidRupees: amount },
    { seq: 2, due: due("2026-11-18"), amountRupees: amount, paidRupees: 0 },
    { seq: 3, due: due("2027-02-18"), amountRupees: amount, paidRupees: 0 },
  ];
}

function buildStudents(): StudentSeed[] {
  const samples: StudentSeed[] = [
    {
      code: "STU-0412",
      name: "Aarav Meena",
      batchKey: "jee-morning",
      parentName: "Suman Meena",
      language: "hi",
      consentAt: null,
      category: "paid",
      falling: false,
      instalments: [
        { seq: 1, due: "2026-04-10", amountRupees: 30000, paidRupees: 30000 },
        { seq: 2, due: "2026-06-10", amountRupees: 30000, paidRupees: 30000 },
        { seq: 3, due: "2026-08-10", amountRupees: 30000, paidRupees: 30000 },
        { seq: 4, due: "2026-10-10", amountRupees: 30000, paidRupees: 30000 },
      ],
    },
    {
      code: "STU-0587",
      name: "Ishita Sharma",
      batchKey: "jee-evening",
      parentName: "Rakesh Sharma",
      language: "en",
      consentAt: null,
      category: "part",
      falling: false,
      instalments: [
        { seq: 1, due: "2026-04-10", amountRupees: 30000, paidRupees: 30000 },
        { seq: 2, due: "2026-07-10", amountRupees: 30000, paidRupees: 30000 },
        { seq: 3, due: "2026-10-10", amountRupees: 30000, paidRupees: 15000 },
        { seq: 4, due: "2027-01-10", amountRupees: 30000, paidRupees: 0 },
      ],
    },
    {
      code: "STU-0219",
      name: "Mohit Gurjar",
      batchKey: "neet-morning",
      parentName: "Sunita Gurjar",
      language: "hi",
      consentAt: null,
      category: "upcoming",
      falling: false,
      instalments: [
        { seq: 1, due: "2026-05-15", amountRupees: 40000, paidRupees: 40000 },
        { seq: 2, due: "2026-11-15", amountRupees: 40000, paidRupees: 0 },
        { seq: 3, due: "2027-03-15", amountRupees: 40000, paidRupees: 0 },
      ],
    },
  ];

  const amounts = [30000, 32000, 36000, 40000];
  const extras = EXTRA_STUDENTS.map((student, index): StudentSeed => {
    const amount = amounts[index % amounts.length];
    return {
      code: `STU-${String(1101 + index)}`,
      name: student.name,
      batchKey: BATCH_KEYS[index % BATCH_KEYS.length],
      parentName: student.parent,
      language: index % 2 === 0 ? "en" : "hi",
      consentAt: index < 3 ? "2026-09-01" : null,
      category: student.category,
      instalments: instalmentsFor(student.category, amount, index % 5),
      falling: student.name in FALLING_FLAGS,
      flag: FALLING_FLAGS[student.name],
    };
  });

  return [...samples, ...extras];
}

async function clearDatabase(): Promise<void> {
  await prisma.counsellorTask.deleteMany();
  await prisma.riskFlag.deleteMany();
  await prisma.testScore.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.instalment.deleteMany();
  await prisma.feePlan.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.centre.deleteMany();
}

async function main(): Promise<void> {
  if (process.env.DEMO_TODAY && process.env.DEMO_TODAY !== DEMO_TODAY) {
    throw new Error(`Seed dates assume DEMO_TODAY=${DEMO_TODAY}`);
  }

  const students = buildStudents();
  if (students.length !== 40) {
    throw new Error(`Expected 40 students, got ${students.length}`);
  }

  await clearDatabase();

  const centreIds = new Map<string, string>();
  for (const centre of CENTRES) {
    const created = await prisma.centre.create({ data: { name: centre.name } });
    centreIds.set(centre.key, created.id);
  }

  const batchIds = new Map<string, string>();
  for (const batch of BATCHES) {
    const created = await prisma.batch.create({
      data: {
        name: batch.name,
        centreId: centreIds.get(batch.centreKey)!,
        startDate: day("2026-04-01"),
        endDate: day("2027-03-31"),
      },
    });
    batchIds.set(batch.key, created.id);
  }

  await prisma.user.createMany({
    data: [
      {
        role: Role.ACCOUNTS,
        phone: ACCOUNTS_PHONE,
        name: "Kavita Sharma",
        language: "en",
        consentAt: null,
      },
      {
        role: Role.ACCOUNTS,
        phone: "9000000002",
        name: "Amit Jain",
        language: "hi",
        consentAt: null,
      },
    ],
  });

  let receiptSeq = 1;
  let remindersLeft = 6;
  const reminderRows: Prisma.ReminderCreateManyInput[] = [];

  for (const [index, student] of students.entries()) {
    const parent = await prisma.user.create({
      data: {
        role: Role.PARENT,
        phone: phoneAt(index),
        name: student.parentName,
        language: student.language,
        consentAt: student.consentAt ? day(student.consentAt) : null,
      },
    });

    const createdStudent = await prisma.student.create({
      data: {
        code: student.code,
        name: student.name,
        batchId: batchIds.get(student.batchKey)!,
        parentUserId: parent.id,
        status: StudentStatus.ACTIVE,
      },
    });

    const totalRupees = student.instalments.reduce((sum, row) => sum + row.amountRupees, 0);
    const plan = await prisma.feePlan.create({
      data: {
        studentId: createdStudent.id,
        totalFee: paise(totalRupees),
        discount: 0,
        gstRate: 18,
      },
    });

    for (const instalment of student.instalments) {
      const createdInstalment = await prisma.instalment.create({
        data: {
          planId: plan.id,
          seq: instalment.seq,
          dueDate: day(instalment.due),
          amount: paise(instalment.amountRupees),
        },
      });

      if (instalment.paidRupees > 0) {
        const payment = await prisma.payment.create({
          data: {
            instalmentId: createdInstalment.id,
            amount: paise(instalment.paidRupees),
            method: index % 2 === 0 ? "UPI" : "CASH",
            reference: `PAY-${student.code}-${instalment.seq}`,
            status: PaymentStatus.SUCCESS,
            paidAt: day(instalment.due),
            idempotencyKey: `seed-${student.code}-${instalment.seq}`,
          },
        });
        const split = gstSplit(payment.amount);
        await prisma.receipt.create({
          data: {
            paymentId: payment.id,
            number: `RCPT-2026-${String(receiptSeq).padStart(4, "0")}`,
            baseAmount: split.baseAmount,
            gstAmount: split.gstAmount,
            total: split.total,
          },
        });
        receiptSeq += 1;
      }

      const overdue = instalment.due < DEMO_TODAY && instalment.paidRupees < instalment.amountRupees;
      if (overdue && remindersLeft > 0) {
        reminderRows.push({
          instalmentId: createdInstalment.id,
          scheduledFor: day(instalment.due),
          language: student.language,
          message:
            student.language === "hi"
              ? "फीस अनुस्मारक: एक किस्त बकाया है। कृपया जल्द भुगतान करें।"
              : "Fee reminder: an instalment is overdue. Please pay soon.",
          status: ReminderStatus.SENT,
        });
        remindersLeft -= 1;
      }
    }

    const months = ["2026-08-01", "2026-09-01", "2026-10-01"];
    const percents = student.falling ? [90, 74, 58] : [91, 89, 90];
    await prisma.attendance.createMany({
      data: months.map((month, monthIndex) => ({
        studentId: createdStudent.id,
        month: day(month),
        percent: percents[monthIndex],
      })),
    });

    const tests = [
      { testName: "August test", date: "2026-08-20" },
      { testName: "September test", date: "2026-09-20" },
      { testName: "October test", date: "2026-10-20" },
    ];
    const scores = student.falling ? [82, 68, 51] : [76, 78, 75];
    await prisma.testScore.createMany({
      data: tests.map((test, testIndex) => ({
        studentId: createdStudent.id,
        testName: test.testName,
        date: day(test.date),
        score: scores[testIndex],
      })),
    });

    if (student.flag) {
      const missed = student.instalments.filter(
        (row) => row.due < DEMO_TODAY && row.paidRupees < row.amountRupees,
      ).length;
      const flag = await prisma.riskFlag.create({
        data: {
          studentId: createdStudent.id,
          score: student.flag.score,
          reasonsJson: {
            missedOrLateInstalments: missed,
            attendancePercents: [90, 74, 58],
            testScores: [82, 68, 51],
          },
          aiNote: student.flag.aiNote,
          aiNoteSource: student.flag.aiNoteSource,
          status: student.flag.status,
          createdAt: day("2026-10-28"),
        },
      });
      await prisma.counsellorTask.create({
        data: {
          flagId: flag.id,
          status: student.flag.taskStatus,
          note: student.flag.taskNote,
        },
      });
    }
  }

  if (reminderRows.length > 0) {
    await prisma.reminder.createMany({ data: reminderRows });
  }

  await prisma.payment.create({
    data: {
      instalmentId: null,
      amount: paise(25000),
      method: "UPI",
      reference: "UNKNOWN-REF-8841",
      status: PaymentStatus.SUCCESS,
      paidAt: day("2026-10-28"),
      idempotencyKey: "seed-unmatched-unknown-ref",
    },
  });

  await verifySamples();

  const parentCount = await prisma.user.count({ where: { role: Role.PARENT } });
  const flagCount = await prisma.riskFlag.count();
  const falseFlags = await prisma.riskFlag.count({ where: { status: FlagStatus.FALSE_FLAG } });
  const unmatched = await prisma.payment.count({ where: { instalmentId: null } });

  console.log(`Seeded ${students.length} students, ${parentCount} parents, 2 accounts users.`);
  console.log(`Risk flags: ${flagCount} (${falseFlags} false flag). Unmatched payments: ${unmatched}.`);
  console.log(`Reminders sent: ${reminderRows.length}. Receipts: ${receiptSeq - 1}.`);
  console.log(`Demo parent phone: ${phoneAt(0)} (Suman Meena, parent of Aarav Meena)`);
  console.log(`Demo accounts phone: ${ACCOUNTS_PHONE} (Kavita Sharma)`);
}

async function verifySamples(): Promise<void> {
  const expected = [
    { code: "STU-0412", due: "2026-10-10", amount: 30000, paid: 30000 },
    { code: "STU-0587", due: "2026-10-10", amount: 30000, paid: 15000 },
    { code: "STU-0219", due: "2026-11-15", amount: 40000, paid: 0 },
  ];

  for (const row of expected) {
    const instalment = await prisma.instalment.findFirst({
      where: {
        dueDate: day(row.due),
        amount: paise(row.amount),
        plan: { student: { code: row.code } },
      },
      include: { payments: true, plan: { include: { student: true } } },
    });
    const paid = instalment?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? -1;
    if (!instalment || paid !== paise(row.paid)) {
      throw new Error(`Sample row mismatch for ${row.code}`);
    }
    const receipt = instalment.payments[0]
      ? await prisma.receipt.findUnique({ where: { paymentId: instalment.payments[0].id } })
      : null;
    if (row.paid > 0 && receipt && receipt.baseAmount + receipt.gstAmount !== receipt.total) {
      throw new Error(`GST split mismatch for ${row.code}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
