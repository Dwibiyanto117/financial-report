import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  // Income
  { name: "Gaji", type: "INCOME", icon: "briefcase", color: "#10B981", isDefault: true },
  { name: "Bonus & Tunjangan", type: "INCOME", icon: "gift", color: "#059669", isDefault: true },
  { name: "Investasi & Dividen", type: "INCOME", icon: "trending-up", color: "#047857", isDefault: true },
  { name: "Pendapatan Usaha", type: "INCOME", icon: "store", color: "#0D9488", isDefault: true },
  { name: "Pemasukan Lainnya", type: "INCOME", icon: "plus-circle", color: "#64748B", isDefault: true },

  // Expense
  { name: "Makanan & Minuman", type: "EXPENSE", icon: "utensils", color: "#EF4444", isDefault: true },
  { name: "Transportasi", type: "EXPENSE", icon: "car", color: "#F97316", isDefault: true },
  { name: "Tempat Tinggal & Sewa", type: "EXPENSE", icon: "home", color: "#F59E0B", isDefault: true },
  { name: "Tagihan & Utilitas", type: "EXPENSE", icon: "zap", color: "#84CC16", isDefault: true },
  { name: "Belanja Kebutuhan", type: "EXPENSE", icon: "shopping-bag", color: "#06B6D4", isDefault: true },
  { name: "Hiburan & Rekreasi", type: "EXPENSE", icon: "film", color: "#8B5CF6", isDefault: true },
  { name: "Kesehatan & Medis", type: "EXPENSE", icon: "activity", color: "#EC4899", isDefault: true },
  { name: "Pendidikan", type: "EXPENSE", icon: "book-open", color: "#3B82F6", isDefault: true },
  { name: "Donasi & Sosial", type: "EXPENSE", icon: "heart", color: "#14B8A6", isDefault: true },
  { name: "Pengeluaran Lainnya", type: "EXPENSE", icon: "tag", color: "#64748B", isDefault: true }
];

async function main() {
  console.log("Seeding default categories...");
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isDefault: true, userId: null }
    });

    if (!existing) {
      await prisma.category.create({
        data: cat
      });
    }
  }
  console.log("Default categories seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });