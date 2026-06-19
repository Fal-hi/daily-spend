import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../../store/useAppStore";
import { Budget } from "../../types";
import {
  getCategories,
  addCategory,
  deleteCategory,
  getBudgets,
  setBudget,
  updateBudget,
  deleteBudget,
  getExpenses,
} from "../../lib/api";
import { appDataDir } from "@tauri-apps/api/path";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CurrencyInput } from "../../components/ui/currency-input";
import { Field, FieldLabel } from "../../components/ui/field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Sun,
  Moon,
  Monitor,
  Plus,
  Trash2,
  PiggyBank,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#6b7280",
  "#84cc16",
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function getMonthKey(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function AddCategoryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    await addCategory({ name: name.trim(), color, icon: "Tag" });
    await qc.invalidateQueries({ queryKey: ["categories"] });
    setName("");
    setColor(PRESET_COLORS[0]);
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Kategori</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Field>
            <FieldLabel>Nama Kategori</FieldLabel>
            <Input
              placeholder="Mis: Gym, Hewan Peliharaan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </Field>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Warna</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c
                      ? "border-zinc-900 dark:border-white scale-110"
                      : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleAdd} disabled={loading || !name.trim()}>
            {loading ? "Menambah..." : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddBudgetModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Budget | null;
}) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const [categoryId, setCategoryId] = useState("all");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const thisMonth = getMonthKey();

  useEffect(() => {
    if (editing) {
      setCategoryId(editing.category_id ?? "all");
      setAmount(String(editing.amount));
    } else {
      setCategoryId("all");
      setAmount("");
    }
  }, [editing, open]);

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    if (editing) {
      await updateBudget(editing.id, {
        category_id: categoryId === "all" ? null : categoryId,
        amount: Number(amount),
        period: "monthly",
        month: editing.month,
      });
    } else {
      await setBudget({
        category_id: categoryId === "all" ? null : categoryId,
        amount: Number(amount),
        period: "monthly",
        month: thisMonth,
      });
    }
    await qc.invalidateQueries({ queryKey: ["budgets"] });
    setAmount("");
    setCategoryId("all");
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Anggaran" : "Tambah Anggaran"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bulan</label>
            <p className="text-sm text-zinc-500">{getMonthLabel(editing ? editing.month : thisMonth)}</p>
          </div>
          <Field>
            <FieldLabel>Kategori</FieldLabel>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua kategori">
                  {categoryId === "all"
                    ? "Semua Kategori"
                    : categories.find((c) => c.id === categoryId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Batas Anggaran (IDR)</FieldLabel>
            <CurrencyInput
              value={amount}
              onChange={(raw) => setAmount(raw)}
              placeholder="0"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </Field>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !amount || Number(amount) <= 0}
          >
            {loading ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useAppStore();
  const qc = useQueryClient();
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addBudgetOpen, setAddBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [dbPath, setDbPath] = useState("");

  useEffect(() => {
    appDataDir()
      .then((dir) => setDbPath(dir + "/daily_spend.db"))
      .catch(() => {});
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });

  const delCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const delBudgetMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });

  const themes: {
    label: string;
    value: "light" | "dark" | "system";
    icon: React.FC<any>;
  }[] = [
    { label: "Terang", value: "light", icon: Sun },
    { label: "Gelap", value: "dark", icon: Moon },
    { label: "Sistem", value: "system", icon: Monitor },
  ];

  const thisMonth = getMonthKey();

  const budgetWithSpending = useMemo(() => {
    return budgets
      .filter((b) => b.month === thisMonth)
      .map((b) => {
        const spent = b.category_id
          ? expenses
              .filter(
                (e) =>
                  e.type === "expense" &&
                  e.category_id === b.category_id &&
                  getMonthKey(e.date) === thisMonth,
              )
              .reduce((s, e) => s + e.amount, 0)
          : expenses
              .filter(
                (e) =>
                  e.type === "expense" && getMonthKey(e.date) === thisMonth,
              )
              .reduce((s, e) => s + e.amount, 0);
        const catName = b.category_id
          ? (categories.find((c) => c.id === b.category_id)?.name ?? "Semua")
          : "Semua Kategori";
        const catColor =
          categories.find((c) => c.id === b.category_id)?.color ?? "#10b981";
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { ...b, spent, catName, catColor, pct };
      });
  }, [budgets, expenses, categories, thisMonth]);

  return (
    <>
      <div className="flex flex-wrap md:flex-nowrap gap-4">
        <div className="flex flex-col gap-4 w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kategori</CardTitle>
                  <CardDescription className="mt-1">
                    Kelola kategori pengeluaran. Kategori default tidak bisa
                    dihapus.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddCatOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <li
                    key={cat.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ background: cat.color }}
                      />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {cat.name}
                      </span>
                      {cat.is_default ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                          D
                        </span>
                      ) : (
                        <button
                          onClick={() => delCatMutation.mutate(cat.id)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {categories.length === 0 && (
                  <li className="text-sm text-zinc-400 text-center py-6">
                    Belum ada kategori.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Anggaran Bulanan</CardTitle>
                  <CardDescription className="mt-1">
                    Atur batas pengeluaran untuk {getMonthLabel(thisMonth)}.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingBudget(null); setAddBudgetOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {budgetWithSpending.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <PiggyBank className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-400">
                    Belum ada anggaran bulan ini.
                  </p>
                  <Button size="sm" onClick={() => { setEditingBudget(null); setAddBudgetOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Buat anggaran
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {budgetWithSpending.map((b) => (
                    <li
                      key={b.id}
                      className="px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: b.catColor }}
                          />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            {b.catName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingBudget(b); setAddBudgetOpen(true); }}
                            className="text-zinc-400 hover:text-emerald-500 transition-colors p-1 rounded"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => delBudgetMutation.mutate(b.id)}
                            className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              b.pct > 100
                                ? "bg-red-500"
                                : b.pct > 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(b.pct, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium whitespace-nowrap",
                            b.pct > 100
                              ? "text-rose-500"
                              : b.pct > 80
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {b.pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-zinc-400">
                          {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                        </span>
                        {b.pct > 100 && (
                          <span className="text-xs text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Kelebihan{" "}
                            {formatCurrency(b.spent - b.amount)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan</CardTitle>
              <CardDescription>
                Pilih tema yang nyaman untuk mata Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {themes.map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all text-sm font-medium",
                      theme === value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tentang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="space-y-1">
                <p>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Aplikasi:
                  </span>{" "}
                  Daily Spend
                </p>
                <p>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Versi:
                  </span>{" "}
                  0.1.0 Beta
                </p>
                <p>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Fitur:
                  </span>{" "}
                  Pemasukan & Pengeluaran, Anggaran, Analitik, Eksport
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wide">
                  Basis Data
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="xl:flex-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded break-all select-all">
                    {dbPath || "Memuat..."}
                  </code>
                  {dbPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revealItemInDir(dbPath)}
                      className="shrink-0"
                    >
                      Buka Folder
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <AddCategoryModal
        open={addCatOpen}
        onClose={() => setAddCatOpen(false)}
      />
      <AddBudgetModal
        open={addBudgetOpen}
        onClose={() => { setAddBudgetOpen(false); setEditingBudget(null); }}
        editing={editingBudget}
      />
    </>
  );
}
