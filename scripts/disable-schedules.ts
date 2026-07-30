import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const before = await db.payrollSchedule.findMany({
    select: { id: true, enabled: true, name: true, amount: true },
  });
  console.log("before", JSON.stringify(before, null, 2));
  const res = await db.payrollSchedule.updateMany({
    where: { enabled: true },
    data: { enabled: false },
  });
  console.log("disabled", res.count);
  const after = await db.payrollSchedule.findMany({
    select: { id: true, enabled: true, name: true },
  });
  console.log("after", JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
