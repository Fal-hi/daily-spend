import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getExpenses,
  getBudgets,
  getAllTimeStats,
  getDailyStats,
  getCategories,
} from "../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

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

export function Dashboard() {
  const now = new Date();
  const thisMonth = getMonthKey(now.toISOString());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = getMonthKey(lastMonthDate.toISOString());

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });
  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: allTimeStats } = useQuery({
    queryKey: ["stats", "all"],
    queryFn: getAllTimeStats,
  });
  const { data: dailyStats = [] } = useQuery({
    queryKey: ["stats", "daily", thisMonth],
    queryFn: () => getDailyStats(thisMonth),
  });

  // This month stats
  const thisMonthExpenses = expenses.filter(
    (e) => getMonthKey(e.date) === thisMonth,
  );
  const lastMonthExpenses = expenses.filter(
    (e) => getMonthKey(e.date) === lastMonth,
  );

  const thisMonthIncome = thisMonthExpenses
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const thisMonthSpent = thisMonthExpenses
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const lastMonthSpent = lastMonthExpenses
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  const spentChange =
    lastMonthSpent > 0
      ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100
      : 0;

  // Budget progress
  const monthBudgets = useMemo(() => {
    return budgets
      .filter((b) => b.month === thisMonth)
      .map((b) => {
        const spent = b.category_id
          ? thisMonthExpenses
              .filter(
                (e) => e.type === "expense" && e.category_id === b.category_id,
              )
              .reduce((s, e) => s + e.amount, 0)
          : thisMonthExpenses
              .filter((e) => e.type === "expense")
              .reduce((s, e) => s + e.amount, 0);
        const catName = b.category_id
          ? (categories.find((c) => c.id === b.category_id)?.name ?? "Semua")
          : "Semua Kategori";
        const catColor =
          categories.find((c) => c.id === b.category_id)?.color ?? "#10b981";
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { ...b, spent, catName, catColor, pct };
      });
  }, [budgets, thisMonthExpenses, categories, thisMonth]);

  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = monthBudgets.reduce((s, b) => s + b.spent, 0);
  const overallUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Recent transactions
  const recentTransactions = expenses.slice(0, 5);

  const chartData = useMemo(() => {
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const map: Record<string, { income: number; expense: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      map[key] = { income: 0, expense: 0 };
    }
    for (const row of dailyStats) {
      if (map[row.day]) {
        map[row.day] = { income: row.income, expense: row.expense };
      }
    }
    return Object.entries(map).map(([day, vals]) => ({
      date: parseInt(day.split("-")[2], 10),
      income: vals.income,
      expense: vals.expense,
    }));
  }, [dailyStats, now]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-lg">
          <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Hari {label}
          </p>
          {payload.map((p: any, i: number) => (
            <p
              key={i}
              className={
                p.name === "Pemasukan" ? "text-emerald-600" : "text-rose-500"
              }
            >
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="row-span-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Saat Ini
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(allTimeStats?.balance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {allTimeStats
                ? `Pemasukan ${formatCurrency(allTimeStats.income)}`
                : "Memuat..."}
            </p>
          </CardContent>
        </Card>
        <Card className="row-span-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pengeluaran Bulan Ini
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthSpent)}
            </div>
            <p
              className={`text-xs ${spentChange > 0 ? "text-rose-500" : "text-emerald-500"}`}
            >
              {spentChange > 0 ? "+" : ""}
              {spentChange.toFixed(1)}% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card className="row-span-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pemasukan Bulan Ini
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pemasukan bulan ini
            </p>
          </CardContent>
        </Card>
        <Card className="row-span-6 max-h-[200px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anggaran</CardTitle>
            <PiggyBank className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="max-h-[200px] overflow-y-auto">
            {monthBudgets.length === 0 ? (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Belum ada anggaran
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  {overallUsed.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
                </p>
                <div className="space-y-2 pt-2 border-t">
                  {monthBudgets.map((b) => (
                    <div key={b.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: b.catColor }}
                          />
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {b.catName}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "font-medium text-[10px]",
                            b.pct > 100
                              ? "text-rose-500"
                              : b.pct > 80
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                        </p>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            b.pct > 100
                              ? "bg-rose-500"
                              : b.pct > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                          style={{ width: `${Math.min(b.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Grafik Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="expenseGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                    name="Pemasukan"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                    name="Pengeluaran"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((expense) => (
                <div key={expense.id} className="flex items-center">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${expense.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}
                  >
                    {expense.type === "income" ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                  <div className="ml-3 space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      {expense.notes ||
                        (expense.type === "income"
                          ? "Pemasukan"
                          : "Pengeluaran")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div
                    className={`ml-auto font-medium text-sm ${expense.type === "income" ? "text-emerald-600" : "text-rose-500"}`}
                  >
                    {expense.type === "income" ? "+" : "-"}
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Belum ada transaksi. Mulai catat pemasukan atau pengeluaran!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
