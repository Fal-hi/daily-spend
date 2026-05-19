import { getDb } from "./db";
import { Expense, Category, Budget } from "../types";

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select<Category[]>("SELECT * FROM categories ORDER BY name ASC");
}

export async function addCategory(
  category: Omit<Category, "id" | "is_default">
): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO categories (id, name, color, icon, is_default) VALUES ($1, $2, $3, $4, 0)",
    [id, category.name, category.color, category.icon]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM categories WHERE id = $1 AND is_default = 0", [id]);
}

export async function seedDefaultCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db.select<Category[]>("SELECT * FROM categories LIMIT 1");
  if (existing.length === 0) {
    const defaults: Category[] = [
      { id: crypto.randomUUID(), name: "Makanan & Minuman", color: "#10b981", icon: "Utensils", is_default: true },
      { id: crypto.randomUUID(), name: "Transportasi", color: "#3b82f6", icon: "Car", is_default: true },
      { id: crypto.randomUUID(), name: "Belanja", color: "#f59e0b", icon: "ShoppingBag", is_default: true },
      { id: crypto.randomUUID(), name: "Tagihan", color: "#ef4444", icon: "Receipt", is_default: true },
      { id: crypto.randomUUID(), name: "Hiburan", color: "#8b5cf6", icon: "Film", is_default: true },
      { id: crypto.randomUUID(), name: "Kesehatan", color: "#06b6d4", icon: "Heart", is_default: true },
      { id: crypto.randomUUID(), name: "Pendidikan", color: "#f97316", icon: "BookOpen", is_default: true },
      { id: crypto.randomUUID(), name: "Gaji", color: "#10b981", icon: "Briefcase", is_default: true },
      { id: crypto.randomUUID(), name: "Lainnya", color: "#6b7280", icon: "MoreHorizontal", is_default: true },
    ];
    for (const cat of defaults) {
      await db.execute(
        "INSERT INTO categories (id, name, color, icon, is_default) VALUES ($1, $2, $3, $4, 1)",
        [cat.id, cat.name, cat.color, cat.icon]
      );
    }
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const db = await getDb();
  return db.select<Expense[]>(
    "SELECT * FROM expenses ORDER BY date DESC, created_at DESC"
  );
}

export async function addExpense(
  expense: Omit<Expense, "id" | "created_at">
): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO expenses (id, amount, date, category_id, notes, location, payment_method, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      expense.amount,
      expense.date,
      expense.category_id,
      expense.notes ?? null,
      expense.location ?? null,
      expense.payment_method ?? null,
      expense.type ?? "expense",
    ]
  );
}

export async function updateExpense(
  id: string,
  expense: Omit<Expense, "id" | "created_at">
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE expenses
     SET amount = $1, date = $2, category_id = $3, notes = $4,
         location = $5, payment_method = $6, type = $7
     WHERE id = $8`,
    [
      expense.amount,
      expense.date,
      expense.category_id,
      expense.notes ?? null,
      expense.location ?? null,
      expense.payment_method ?? null,
      expense.type ?? "expense",
      id,
    ]
  );
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM expenses WHERE id = $1", [id]);
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(): Promise<Budget[]> {
  const db = await getDb();
  return db.select<Budget[]>("SELECT * FROM budgets ORDER BY month DESC");
}

export async function getMonthlyBudgets(month: string): Promise<Budget[]> {
  const db = await getDb();
  return db.select<Budget[]>(
    "SELECT * FROM budgets WHERE month = $1 ORDER BY created_at DESC",
    [month]
  );
}

export async function setBudget(
  budget: Omit<Budget, "id" | "created_at">
): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO budgets (id, category_id, amount, period, month)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, budget.category_id, budget.amount, budget.period, budget.month]
  );
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM budgets WHERE id = $1", [id]);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getMonthStats(month: string) {
  const db = await getDb();
  const rows = await db.select<{ type: string; total: number }[]>(
    `SELECT type, SUM(amount) as total FROM expenses
     WHERE strftime('%Y-%m', date) = $1
     GROUP BY type`,
    [month]
  );
  const income = rows.find((r) => r.type === "income")?.total ?? 0;
  const expense = rows.find((r) => r.type === "expense")?.total ?? 0;
  return { income, expense, balance: income - expense };
}

export async function getAllTimeStats() {
  const db = await getDb();
  const rows = await db.select<{ type: string; total: number }[]>(
    `SELECT type, SUM(amount) as total FROM expenses GROUP BY type`
  );
  const income = rows.find((r) => r.type === "income")?.total ?? 0;
  const expense = rows.find((r) => r.type === "expense")?.total ?? 0;
  return { income, expense, balance: income - expense };
}

export async function getDailyStats(month: string) {
  const db = await getDb();
  return db.select<{ day: string; income: number; expense: number }[]>(
    `SELECT date as day,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
     FROM expenses
     WHERE strftime('%Y-%m', date) = $1
     GROUP BY date
     ORDER BY date ASC`,
    [month]
  );
}

export async function getCategoryStats(month: string | null) {
  const db = await getDb();
  const monthFilter = month
    ? "WHERE strftime('%Y-%m', e.date) = $1 AND e.type = 'expense'"
    : "WHERE e.type = 'expense'";
  const params: string[] = month ? [month] : [];
  return db.select<{ category_id: string; name: string; color: string; total: number }[]>(
    `SELECT e.category_id, c.name, c.color, SUM(e.amount) as total
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     ${monthFilter}
     GROUP BY e.category_id
     ORDER BY total DESC`,
    params
  );
}

// ─── Seed Sample Data ────────────────────────────────────────────────────────

export async function hasAnyData(): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM expenses");
    return rows[0]?.count > 0;
  } catch {
    return false;
  }
}

export async function seedSampleData(): Promise<void> {
  const db = await getDb();
  const cats = await getCategories();
  if (cats.length === 0) return;

  const catMap = new Map(cats.map((c) => [c.name, c.id]));
  const today = new Date();
  const sampleData: { daysAgo: number; amount: number; cat: string; notes: string; type: "income" | "expense"; method: string }[] = [
    // Income
    { daysAgo: 1, amount: 15000000, cat: "Gaji", notes: "Gaji Bulanan", type: "income", method: "Transfer" },
    { daysAgo: 5, amount: 500000, cat: "Lainnya", notes: "Proyek Lepas", type: "income", method: "Transfer" },
    // Expenses
    { daysAgo: 0, amount: 75000, cat: "Makanan & Minuman", notes: "Makan siang dengan tim", type: "expense", method: "E-Wallet" },
    { daysAgo: 0, amount: 25000, cat: "Makanan & Minuman", notes: "Kopi pagi", type: "expense", method: "Tunai" },
    { daysAgo: 1, amount: 150000, cat: "Transportasi", notes: "Gojek ke kantor", type: "expense", method: "E-Wallet" },
    { daysAgo: 1, amount: 20000, cat: "Transportasi", notes: "Parkir", type: "expense", method: "Tunai" },
    { daysAgo: 2, amount: 350000, cat: "Belanja", notes: "Beli baju di Shopee", type: "expense", method: "E-Wallet" },
    { daysAgo: 2, amount: 1200000, cat: "Tagihan", notes: "Listrik bulanan", type: "expense", method: "Transfer" },
    { daysAgo: 3, amount: 50000, cat: "Hiburan", notes: "Langganan Netflix", type: "expense", method: "Kartu Kredit" },
    { daysAgo: 3, amount: 200000, cat: "Makanan & Minuman", notes: "Makan malam", type: "expense", method: "Kartu Debit" },
    { daysAgo: 4, amount: 100000, cat: "Transportasi", notes: "Grab ke mall", type: "expense", method: "E-Wallet" },
    { daysAgo: 5, amount: 500000, cat: "Belanja", notes: "Belanja bulanan", type: "expense", method: "Kartu Debit" },
    { daysAgo: 6, amount: 300000, cat: "Kesehatan", notes: "Obat & vitamin", type: "expense", method: "Tunai" },
    { daysAgo: 7, amount: 250000, cat: "Hiburan", notes: "Tiket bioskop", type: "expense", method: "E-Wallet" },
    { daysAgo: 8, amount: 800000, cat: "Pendidikan", notes: "Beli buku online", type: "expense", method: "Transfer" },
    { daysAgo: 10, amount: 150000, cat: "Makanan & Minuman", notes: "Makan di restoran", type: "expense", method: "Kartu Kredit" },
    { daysAgo: 12, amount: 450000, cat: "Bills", notes: "Bayar internet", type: "expense", method: "Transfer" },
    { daysAgo: 14, amount: 100000, cat: "Transportation", notes: "Isi bensin", type: "expense", method: "Cash" },
  ];

  for (const item of sampleData) {
    const date = new Date(today);
    date.setDate(date.getDate() - item.daysAgo);
    const dateStr = date.toISOString().slice(0, 10);
    const catId = catMap.get(item.cat);
    if (!catId) continue;

    await db.execute(
      `INSERT INTO expenses (id, amount, date, category_id, notes, location, payment_method, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        item.amount,
        dateStr,
        catId,
        item.notes,
        null,
        item.method,
        item.type,
      ]
    );
  }
}
