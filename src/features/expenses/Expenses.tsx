import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getExpenses,
  getCategories,
  addExpense,
  updateExpense,
  deleteExpense,
} from "../../lib/api";
import { Expense, Category, TransactionType } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CurrencyInput } from "../../components/ui/currency-input";
import * as XLSX from "xlsx";
import { Badge } from "../../components/ui/badge";
import { Field, FieldLabel, FieldError } from "../../components/ui/field";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Receipt,
  Download,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  category_id: z.string().min(1, "Kategori wajib diisi"),
  notes: z.string().optional(),
  location: z.string().optional(),
  payment_method: z.string().optional(),
  type: z.enum(["income", "expense"]),
});

type FormValues = z.infer<typeof schema>;

const PAYMENT_METHODS = [
  "Tunai",
  "Kartu Debit",
  "Kartu Kredit",
  "Transfer",
  "E-Wallet",
  "Lainnya",
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadExcel(
  expenses: Expense[],
  categories: Category[],
  filterYear?: string,
  filterMonth?: string,
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  let totalExpense = 0;
  let totalIncome = 0;

  const rows = expenses.map((e, i) => {
    const catName = catMap.get(e.category_id) || "Tidak Diketahui";
    const amount = Number(e.amount);
    if (e.type === "expense") totalExpense += amount;
    else totalIncome += amount;

    return [
      i + 1,
      formatDate(e.date),
      e.type === "expense" ? "Pengeluaran" : "Pemasukan",
      catName,
      e.notes || "-",
      e.location || "-",
      e.payment_method || "-",
      amount,
    ];
  });

  const periodParts: string[] = [];
  if (filterYear) periodParts.push(filterYear);
  if (filterMonth && filterMonth !== "all") {
    const monthName = new Date(
      2000,
      Number(filterMonth) - 1,
    ).toLocaleDateString("id-ID", { month: "long" });
    periodParts.push(monthName);
  }

  const data = [
    ["Laporan Transaksi - Dana Harian"],
    [
      `Tanggal Export: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    ],
    ...(periodParts.length > 0 ? [[`Periode: ${periodParts.join(" ")}`]] : []),
    [`Total Data: ${expenses.length} transaksi`],
    [],
    [
      "No",
      "Tanggal",
      "Tipe",
      "Kategori",
      "Catatan",
      "Lokasi / Toko",
      "Metode Pembayaran",
      "Jumlah (IDR)",
    ],
    ...rows,
    [],
    ["", "", "", "", "", "", "Total Pemasukan", totalIncome],
    ["", "", "", "", "", "", "Total Pengeluaran", totalExpense],
    ["", "", "", "", "", "", "Saldo", totalIncome - totalExpense],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 30 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
  ];

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
    { s: { r: rows.length + 6, c: 0 }, e: { r: rows.length + 6, c: 5 } },
    { s: { r: rows.length + 7, c: 0 }, e: { r: rows.length + 7, c: 5 } },
    { s: { r: rows.length + 8, c: 0 }, e: { r: rows.length + 8, c: 5 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
  const fileSuffix =
    [filterYear, filterMonth && filterMonth !== "all" ? filterMonth : null]
      .filter(Boolean)
      .join("-") || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `transaksi-${fileSuffix}.xlsx`);
}

function ExpenseModal({
  open,
  onClose,
  editing,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  editing: Expense | null;
  categories: Category[];
}) {
  const qc = useQueryClient();
  const [amountInput, setAmountInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      location: "",
      payment_method: "",
      type: "expense",
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        amount: editing.amount,
        date: editing.date.slice(0, 10),
        category_id: editing.category_id,
        notes: editing.notes ?? "",
        location: editing.location ?? "",
        payment_method: editing.payment_method ?? "",
        type: editing.type ?? "expense",
      });
      setAmountInput(String(editing.amount));
    } else {
      reset({
        date: new Date().toISOString().slice(0, 10),
        notes: "",
        location: "",
        payment_method: "",
        type: "expense",
      });
      setAmountInput("");
    }
  }, [editing, reset]);

  const selectedCategory = watch("category_id") ?? "";
  const selectedPayment = watch("payment_method") ?? "";
  const selectedType = watch("type");

  async function onSubmit(values: FormValues) {
    const amount = Number(amountInput);
    if (editing) {
      await updateExpense(editing.id, {
        amount,
        date: values.date,
        category_id: values.category_id,
        notes: values.notes ?? null,
        location: values.location ?? null,
        payment_method: values.payment_method ?? null,
        type: values.type,
      });
    } else {
      await addExpense({
        amount,
        date: values.date,
        category_id: values.category_id,
        notes: values.notes ?? null,
        location: values.location ?? null,
        payment_method: values.payment_method ?? null,
        type: values.type,
      });
    }
    await qc.invalidateQueries({ queryKey: ["expenses"] });
    reset();
    setAmountInput("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Transaksi" : "Tambah Transaksi"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue("type", "expense")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                selectedType === "expense"
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500",
              )}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setValue("type", "income")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                selectedType === "income"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500",
              )}
            >
              Pemasukan
            </button>
          </div>

          <Field data-invalid={!!errors.amount}>
            <FieldLabel>Jumlah (IDR)</FieldLabel>
            <CurrencyInput
              value={amountInput}
              onChange={(raw) => {
                setAmountInput(raw);
                setValue("amount", Number(raw), { shouldValidate: true });
              }}
              placeholder="0"
            />
            {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.date}>
            <FieldLabel>Tanggal</FieldLabel>
            <Input
              type="date"
              aria-invalid={!!errors.date}
              {...register("date")}
            />
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.category_id}>
            <FieldLabel>Kategori</FieldLabel>
            <Select
              value={selectedCategory}
              onValueChange={(v) => setValue("category_id", v ?? "")}
            >
              <SelectTrigger aria-invalid={!!errors.category_id}>
                <SelectValue placeholder="Pilih kategori">
                  {(() => {
                    const cat = categories.find(
                      (c) => c.id === selectedCategory,
                    );
                    return cat ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: cat.color }}
                        />
                        {cat.name}
                      </span>
                    ) : null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <FieldError>{errors.category_id.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel>Metode Pembayaran</FieldLabel>
            <Select
              value={selectedPayment}
              onValueChange={(v) => setValue("payment_method", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Catatan</FieldLabel>
            <Input
              placeholder="Mis: Makan siang dengan tim"
              {...register("notes")}
            />
          </Field>

          <Field>
            <FieldLabel>Lokasi / Toko</FieldLabel>
            <Input
              placeholder="Mis: McDonald's, Lazada"
              {...register("location")}
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : editing
                  ? "Simpan Perubahan"
                  : "Tambah Transaksi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      onClose();
    },
  });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus Transaksi</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa
          dibatalkan.
        </p>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => id && del.mutate(id)}
            disabled={del.isPending}
          >
            {del.isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Expenses() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );
  const [filterMonth, setFilterMonth] = useState("all");
  const [sortColumn, setSortColumn] = useState<
    "date" | "type" | "notes" | "category" | "payment" | "amount"
  >("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
  });
  const { data: categories = [], error: catError } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (filterYear !== "all") {
      list = list.filter((e) => e.date.slice(0, 4) === filterYear);
    }
    if (filterMonth !== "all") {
      list = list.filter((e) => e.date.slice(5, 7) === filterMonth);
    }
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (filterCategory !== "all")
      list = list.filter((e) => e.category_id === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          (e.notes ?? "").toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          (categoryMap[e.category_id]?.name ?? "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "date":
          cmp = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "notes":
          cmp = (a.notes ?? "").localeCompare(b.notes ?? "");
          break;
        case "category": {
          const ca = categoryMap[a.category_id]?.name ?? "";
          const cb = categoryMap[b.category_id]?.name ?? "";
          cmp = ca.localeCompare(cb);
          break;
        }
        case "payment":
          cmp = (a.payment_method ?? "").localeCompare(b.payment_method ?? "");
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
    return list;
  }, [
    expenses,
    filterCategory,
    filterType,
    filterYear,
    filterMonth,
    search,
    sortOrder,
    categoryMap,
  ]);

  const incomeTotal = filtered
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expenseTotal = filtered
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(e: Expense) {
    setEditing(e);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }
  function handleSort(col: typeof sortColumn) {
    if (sortColumn === col) {
      setSortOrder((s) => (s === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(col);
      setSortOrder(col === "date" ? "desc" : "asc");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap sm:flex-row gap-3 items-start xl:items-center justify-between">
        <div className="flex flex-wrap lg:flex-nowrap gap-2 flex-1 w-full sm:max-w-xl items-end">
          <Field>
            <FieldLabel>Tahun</FieldLabel>
            <Select
              value={filterYear}
              onValueChange={(v) => {
                setFilterYear(v ?? String(new Date().getFullYear()));
                setFilterMonth("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const years = new Set<string>();
                  for (const e of expenses) {
                    years.add(e.date.slice(0, 4));
                  }
                  const current = new Date().getFullYear();
                  if (!years.has(String(current))) years.add(String(current));
                  return [...years]
                    .sort((a, b) => Number(b) - Number(a))
                    .map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ));
                })()}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Bulan</FieldLabel>
            <Select
              value={filterMonth}
              onValueChange={(v) => setFilterMonth(v ?? "all")}
            >
              <SelectTrigger>
                <SelectValue>
                  {filterMonth === "all"
                    ? "Semua"
                    : new Date(
                        2000,
                        Number(filterMonth) - 1,
                      ).toLocaleDateString("id-ID", { month: "long" })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {[
                  "Januari",
                  "Februari",
                  "Maret",
                  "April",
                  "Mei",
                  "Juni",
                  "Juli",
                  "Agustus",
                  "September",
                  "Oktober",
                  "November",
                  "Desember",
                ].map((label, i) => {
                  const m = String(i + 1).padStart(2, "0");
                  return (
                    <SelectItem key={m} value={m}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Tipe</FieldLabel>
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as "all" | TransactionType)}
            >
              <SelectTrigger>
                <SlidersHorizontal className="h-4 w-4 mr-2 text-zinc-400 flex-shrink-0" />
                <SelectValue>
                  {filterType === "all"
                    ? "Semua"
                    : filterType === "expense"
                      ? "Pengeluaran"
                      : "Pemasukan"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Kategori</FieldLabel>
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(v ?? "all")}
            >
              <SelectTrigger>
                <SlidersHorizontal className="h-4 w-4 mr-2 text-zinc-400 flex-shrink-0" />
                <SelectValue placeholder="Kategori">
                  {filterCategory === "all"
                    ? "Semua"
                    : categories.find((c) => c.id === filterCategory)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field className="!min-w-[20%] hidden xl:block">
          <FieldLabel>Cari Transaksi</FieldLabel>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="ex: Makan Siang"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap-reverse gap-4 items-center justify-between mb-2 mt-6">
        {filtered.length > 0 ? (
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{filtered.length} transaksi</span>
            {expenseTotal > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-500 font-medium">
                  Pengeluaran: {formatCurrency(expenseTotal)}
                </span>
              </>
            )}
            {incomeTotal > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-500 font-medium">
                  Pemasukan: {formatCurrency(incomeTotal)}
                </span>
              </>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex justify-between w-full xl:w-fit items-end">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setExporting(true);
                try {
                  await new Promise((r) => setTimeout(r, 500));
                  downloadExcel(filtered, categories, filterYear, filterMonth);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
            >
              <Download
                className={cn(
                  "h-4 w-4 mr-1.5 transition-all",
                  exporting && "animate-bounce",
                )}
              />
              {exporting ? "Mengekspor..." : "Ekspor Excel"}
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah
            </Button>
          </div>
          <Field className="min-w-[20%] block xl:hidden">
            <FieldLabel>Cari Transaksi</FieldLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="ex: Makan Siang"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        {catError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-rose-400" />
            </div>
            <p className="text-sm font-medium text-rose-500">
              Gagal terhubung ke database
            </p>
            <p className="text-xs text-zinc-400 max-w-xs text-center">
              Pastikan aplikasi dijalankan dengan{" "}
              <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                pnpm run tauri dev
              </code>
              , bukan{" "}
              <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                pnpm run dev
              </code>
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-zinc-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Receipt className="h-7 w-7 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {search || filterCategory !== "all" || filterType !== "all"
                ? "Tidak ada hasil"
                : "Belum ada transaksi"}
            </p>
            {!search && filterCategory === "all" && filterType === "all" && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> Tambah transaksi pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tanggal
                      {sortColumn === "date" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("type")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tipe
                      {sortColumn === "type" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("notes")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Catatan
                      {sortColumn === "notes" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("category")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Kategori
                      {sortColumn === "category" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("payment")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Pembayaran
                      {sortColumn === "payment" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                    onClick={() => handleSort("amount")}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      Jumlah
                      {sortColumn === "amount" && (
                        <span className="text-zinc-400">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((exp) => {
                  const cat = categoryMap[exp.category_id];
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-medium",
                            exp.type === "income"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                          )}
                        >
                          {exp.type === "income" ? "Pemasukan" : "Pengeluaran"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">
                        {exp.notes || (
                          <span className="text-zinc-400 italic text-xs">
                            —
                          </span>
                        )}
                        {exp.location && (
                          <span className="ml-1.5 text-xs text-zinc-400 font-normal">
                            @ {exp.location}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {cat ? (
                          <Badge
                            variant="secondary"
                            className="gap-1.5 text-xs font-medium"
                            style={{
                              background: cat.color + "22",
                              color: cat.color,
                              border: `1px solid ${cat.color}44`,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                              style={{ background: cat.color }}
                            />
                            {cat.name}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-sm">
                        {exp.payment_method || (
                          <span className="text-zinc-300 dark:text-zinc-600">
                            —
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-3.5 text-right font-semibold whitespace-nowrap",
                          exp.type === "income"
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-rose-500 dark:text-rose-400",
                        )}
                      >
                        {exp.type === "income" ? "+" : "-"}
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => openEdit(exp)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Ubah
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(exp.id)}
                              className="text-rose-500 focus:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal
        open={modalOpen}
        onClose={closeModal}
        editing={editing}
        categories={categories}
      />
      <DeleteDialog id={deleteId} onClose={() => setDeleteId(null)} />
    </div>
  );
}
