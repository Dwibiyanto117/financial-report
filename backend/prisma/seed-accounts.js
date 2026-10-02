import prisma from "../src/config/prisma.js";

async function main() {
  console.log("Checking default accounts for all users...");
  const users = await prisma.user.findMany({
    include: { accounts: true }
  });

  for (const user of users) {
    if (user.accounts.length === 0) {
      console.log(`Creating default account for user ${user.id} (${user.email})...`);
      await prisma.account.create({
        data: {
          userId: user.id,
          name: "Kas Utama",
          institution: "CASH",
          type: "CASH",
          openingBalance: 0,
          color: "#10B981"
        }
      });
    }
  }
  console.log("Account seeding / migration complete!");
}

main()
  .catch((e) => {
    console.error("Account seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
