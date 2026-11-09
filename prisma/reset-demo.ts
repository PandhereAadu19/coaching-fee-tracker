import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Payments created through the app's mock gateway
  const mock = await db.payment.findMany({
    where: { method: "MOCK_GATEWAY" },
    select: { id: true },
  });
  const paymentIds = mock.map((p) => p.id);
  const receipts = await db.receipt.deleteMany({ where: { paymentId: { in: paymentIds } } });
  const payments = await db.payment.deleteMany({ where: { id: { in: paymentIds } } });

  // Refunds, and the students who exited because of them
  const refunds = await db.refund.findMany({ select: { studentId: true } });
  const studentIds = [...new Set(refunds.map((r) => r.studentId))];
  await db.refund.deleteMany({});
  const students = await db.student.updateMany({
    where: { id: { in: studentIds } },
    data: { status: "ACTIVE", exitDate: null },
  });

  console.log(
    `Reset done: ${payments.count} payments, ${receipts.count} receipts removed, ${students.count} students reactivated.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());