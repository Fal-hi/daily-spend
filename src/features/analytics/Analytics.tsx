import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExpenses, getCategories } from "../../lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

export function Analytics() {
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, { name: string; color: string; total: number }> =
      {};
    for (const exp of expenses) {
      if (exp.type !== "expense") continue;
      const cat = categoryMap[exp.category_id];
      if (!cat) continue;
      if (!map[cat.id])
        map[cat.id] = { name: cat.name, color: cat.color, total: 0 };
      map[cat.id].total += exp.amount;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [expenses, categoryMap]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const exp of expenses) {
      const key = getMonthKey(exp.date);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (exp.type === "income") map[key].income += exp.amount;
      else map[key].expense += exp.amount;
    }
    const sorted = Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);
    return sorted.map(([k, v]) => ({
      month: getMonthLabel(k),
      income: v.income,
      expense: v.expense,
    }));
  }, [expenses]);

  const incomeMonthly = useMemo(() => {
    const map: Record<string, { name: string; total: number }> = {};
    for (const exp of expenses) {
      if (exp.type !== "income") continue;
      const cat = categoryMap[exp.category_id];
      if (!cat) continue;
      if (!map[cat.id]) map[cat.id] = { name: cat.name, total: 0 };
      map[cat.id].total += exp.amount;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [expenses, categoryMap]);

  const totalIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenses
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const thisMonthKey = getMonthKey(new Date().toISOString());
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = getMonthKey(lastMonthDate.toISOString());

  const thisMonthExpense = expenses
    .filter((e) => e.type === "expense" && getMonthKey(e.date) === thisMonthKey)
    .reduce((s, e) => s + e.amount, 0);
  const lastMonthExpense = expenses
    .filter((e) => e.type === "expense" && getMonthKey(e.date) === lastMonthKey)
    .reduce((s, e) => s + e.amount, 0);

  const diff =
    lastMonthExpense > 0
      ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100
      : 0;
  const isUp = diff > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-lg">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Wallet className="h-8 w-8 text-zinc-400" />
        </div>
        <div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            Belum ada data
          </p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Tambahkan transaksi untuk melihat analitik.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengeluaran
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-500">
              {formatCurrency(totalExpense)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Semua waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pemasukan
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Semua waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Bersih</CardTitle>
            <Wallet
              className={`h-4 w-4 ${balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${balance >= 0 ? "" : "text-rose-500"}`}
            >
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {balance >= 0 ? "Surplus" : "Defisit"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
            {isUp ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${isUp ? "text-emerald-500" : "text-rose-500"}`}
            >
              {formatCurrency(thisMonthExpense)}
            </p>
            <p
              className={`text-xs mt-1 ${isUp ? "text-emerald-500" : "text-rose-500"}`}
            >
              {isUp ? "+" : ""}
              {diff.toFixed(1)}% dari bulan lalu
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">
              Pengeluaran per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {categoryTotals.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {categoryTotals.map((c) => {
                const pct =
                  totalExpense > 0
                    ? ((c.total / totalExpense) * 100).toFixed(1)
                    : "0";
                return (
                  <li
                    key={c.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: c.color }}
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {c.name}
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 flex gap-3">
                      <span>{pct}%</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 w-28 text-right">
                        {formatCurrency(c.total)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Tren Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {incomeMonthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sumber Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {incomeMonthly.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30"
                >
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {item.name}
                  </span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
