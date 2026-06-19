import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../../lib/api";
import { CalendarEvent } from "../../types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Field, FieldLabel, FieldError } from "../../components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Clock,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react";

const EVENT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = [
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
];

const eventSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional(),
  date: z.string().min(1, "Tanggal wajib diisi"),
  time: z.string().optional(),
  color: z.string(),
});

type EventFormValues = z.infer<typeof eventSchema>;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isToday(year: number, month: number, day: number) {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

function EventModal({
  open,
  onClose,
  editing,
  selectedDate,
}: {
  open: boolean;
  onClose: () => void;
  editing: CalendarEvent | null;
  selectedDate: string;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      date: selectedDate,
      time: "",
      color: EVENT_COLORS[0],
    },
  });

  const selectedColor = watch("color");

  function normalizeTime(time?: string | null) {
    if (!time) return "";

    // ambil HH:mm saja
    const match = time.match(/^(\d{2}:\d{2})/);

    return match ? match[1] : "";
  }

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        title: editing.title,
        description: editing.description ?? "",
        date: editing.date,
        time: normalizeTime(editing.time),
        color: editing.color,
      });
    } else {
      reset({
        title: "",
        description: "",
        date: selectedDate,
        time: "",
        color: EVENT_COLORS[0],
      });
    }
  }, [open]);

  async function onSubmit(values: EventFormValues) {
    if (editing) {
      await updateCalendarEvent(editing.id, {
        title: values.title,
        description: values.description ?? null,
        date: values.date,
        time: values.time || null,
        color: values.color,
      });
    } else {
      await addCalendarEvent({
        title: values.title,
        description: values.description ?? null,
        date: values.date,
        time: values.time || null,
        color: values.color,
      });
    }
    await qc.invalidateQueries({ queryKey: ["calendarEvents"] });
    reset();
    onClose();
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      onClose();
    }
  }

  const timeValue = watch("time") || "00:00";

  const [hour, minute] = timeValue.split(":");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Event" : "Tambah Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Field data-invalid={!!errors.title}>
            <FieldLabel>Judul Event</FieldLabel>
            <Input
              placeholder="Mis: Meeting tim, Deadline proyek"
              {...register("title")}
            />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.date}>
            <FieldLabel>Tanggal</FieldLabel>
            <Input
              type="date"
              readOnly
              className="cursor-default bg-zinc-50 dark:bg-zinc-800/50"
              {...register("date")}
            />
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Waktu (opsional)</FieldLabel>

            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => {
                  const newHour = e.target.value;
                  setValue("time", `${newHour}:${minute}`);
                }}
                className={cn(
                  "flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:bg-zinc-900 dark:border-zinc-800",
                )}
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const val = String(i).padStart(2, "0");

                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>

              <div className="text-zinc-400 text-sm font-medium">:</div>

              <select
                value={minute}
                onChange={(e) => {
                  const newMinute = e.target.value;
                  setValue("time", `${hour}:${newMinute}`);
                }}
                className={cn(
                  "flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:bg-zinc-900 dark:border-zinc-800",
                )}
              >
                {Array.from({ length: 60 }).map((_, i) => {
                  const val = String(i).padStart(2, "0");

                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          </Field>

          {/* <Field>
            <FieldLabel>Waktu (opsional)</FieldLabel>
            <Input type="time" step="1" {...register("time")} />
          </Field> */}

          <Field>
            <FieldLabel>Deskripsi (opsional)</FieldLabel>
            <Input
              placeholder="Catatan tambahan..."
              {...register("description")}
            />
          </Field>

          <Field>
            <FieldLabel>Warna</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    selectedColor === c
                      ? "border-zinc-900 dark:border-white scale-110"
                      : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
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
                  : "Tambah Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const dateObj = new Date(event.date + "T00:00:00");
  const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
  const dayNum = dateObj.getDate();
  const monthName = MONTHS_ID[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div
              className="h-4 w-4 rounded-full mt-0.5 flex-shrink-0"
              style={{ background: event.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {event.title}
              </h3>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Tanggal</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {dayName}, {dayNum} {monthName} {year}
                </p>
              </div>
            </div>

            {event.time && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Waktu</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {event.time}
                  </p>
                </div>
              </div>
            )}

            {event.description && (
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 flex-shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-zinc-400"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Deskripsi</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
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
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendarEvents"] });
      onClose();
    },
  });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus Event</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Yakin ingin menghapus event ini? Tindakan ini tidak bisa dibatalkan.
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

export function CalendarEventPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    formatDateStr(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  const { data: events = [] as CalendarEvent[] } = useQuery({
    queryKey: ["calendarEvents"],
    queryFn: getCalendarEvents,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    return eventsByDate[selectedDate] ?? [];
  }, [eventsByDate, selectedDate]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays = useMemo(() => {
    const days: { day: number; currentMonth: boolean; dateStr: string }[] = [];

    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({
        day: d,
        currentMonth: false,
        dateStr: formatDateStr(prevYear, prevMonth, d),
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        currentMonth: true,
        dateStr: formatDateStr(viewYear, viewMonth, d),
      });
    }

    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d,
        currentMonth: false,
        dateStr: formatDateStr(nextYear, nextMonth, d),
      });
    }

    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(
      formatDateStr(now.getFullYear(), now.getMonth(), now.getDate()),
    );
  }

  function openAdd(dateStr?: string) {
    setEditing(null);
    if (dateStr) setSelectedDate(dateStr);
    setModalOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditing(ev);
    setModalOpen(true);
  }

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const selectedDayName = selectedDateObj.toLocaleDateString("id-ID", {
    weekday: "long",
  });
  const selectedDayNum = selectedDateObj.getDate();
  const selectedMonthName = MONTHS_ID[selectedDateObj.getMonth()];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kalender</CardTitle>
              <Button variant="outline" size="sm" onClick={goToday}>
                Hari Ini
              </Button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={prevMonth}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-base font-semibold">
                {MONTHS_ID[viewMonth]} {viewYear}
              </span>
              <button
                onClick={nextMonth}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_ID.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 py-2"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                const dayEvents = eventsByDate[day.dateStr] ?? [];
                const hasEvents = dayEvents.length > 0;
                const isSelected = day.dateStr === selectedDate;
                const isTodayCell = (() => {
                  const parts = day.dateStr.split("-").map(Number);
                  return isToday(parts[0], parts[1] - 1, parts[2]);
                })();

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day.dateStr)}
                    onDoubleClick={() => openAdd(day.dateStr)}
                    className={cn(
                      "relative rounded-lg text-sm font-medium transition-colors flex flex-col items-start justify-start p-1.5 gap-0.5 overflow-hidden min-h-[60px]",
                      !day.currentMonth && "text-zinc-300 dark:text-zinc-600",
                      day.currentMonth && "text-zinc-700 dark:text-zinc-300",
                      isSelected &&
                        "bg-emerald-500 text-white hover:bg-emerald-600",
                      isTodayCell &&
                        !isSelected &&
                        "ring-2 ring-emerald-500 ring-inset",
                      !isSelected &&
                        day.currentMonth &&
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      hasEvents &&
                        !isSelected &&
                        "bg-zinc-100 dark:bg-zinc-800/70",
                    )}
                    style={
                      hasEvents && !isSelected
                        ? {
                            borderLeft: `3px solid ${dayEvents[0].color}`,
                          }
                        : undefined
                    }
                  >
                    <span className="leading-none">{day.day}</span>
                    {hasEvents && (
                      <div className="w-full mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev, j) => (
                          <div
                            key={j}
                            className={cn(
                              "text-[10px] truncate leading-tight font-normal",
                              isSelected
                                ? "text-white/90"
                                : "text-zinc-600 dark:text-zinc-400",
                            )}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div
                            className={cn(
                              "text-[10px] font-normal",
                              isSelected
                                ? "text-white/70"
                                : "text-zinc-400 dark:text-zinc-500",
                            )}
                          >
                            +{dayEvents.length - 2} lainnya
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedDayName}, {selectedDayNum} {selectedMonthName}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedEvents.length} event
                </p>
              </div>
              <Button size="sm" onClick={() => openAdd()}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Tidak ada event
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    Klik "Tambah" untuk membuat event baru
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto px-4">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="group relative rounded-lg border border-zinc-200 dark:border-zinc-700/50 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => setViewingEvent(ev)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-3 w-3 rounded-full mt-1 flex-shrink-0"
                        style={{ background: ev.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {ev.title}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                        {ev.time && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-400">
                            <Clock className="h-3 w-3" />
                            <span>{ev.time}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(ev);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Ubah
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(ev.id);
                            }}
                            className="text-rose-500 focus:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingEventsList
            events={events}
            onViewEvent={(ev) => setViewingEvent(ev)}
          />
        </CardContent>
      </Card>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        selectedDate={selectedDate}
      />
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
      />
      <DeleteDialog id={deleteId} onClose={() => setDeleteId(null)} />
    </div>
  );
}

function UpcomingEventsList({
  events,
  onViewEvent,
}: {
  events: CalendarEvent[];
  onViewEvent: (ev: CalendarEvent) => void;
}) {
  const today = formatDateStr(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const groupedEvents = useMemo(() => {
    const grouped: { date: string; events: CalendarEvent[] }[] = [];
    const filtered = events
      .filter((e) => e.date >= today)
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
      })
      .slice(0, 14);

    let currentDate = "";
    for (const ev of filtered) {
      if (ev.date !== currentDate) {
        currentDate = ev.date;
        grouped.push({ date: ev.date, events: [ev] });
      } else {
        grouped[grouped.length - 1].events.push(ev);
      }
    }
    return grouped;
  }, [events, today]);

  if (groupedEvents.length === 0) {
    return (
      <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
        Tidak ada event mendatang
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {groupedEvents.map((group) => {
        const dateObj = new Date(group.date + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("id-ID", {
          weekday: "short",
        });
        const dayNum = dateObj.getDate();
        const monthName = MONTHS_ID[dateObj.getMonth()];

        return (
          <div
            key={group.date}
            className="flex-shrink-0 w-56 rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {dayName}, {dayNum} {monthName}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {group.events.length} event
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2 space-y-2">
              {group.events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onViewEvent(ev)}
                  className="w-full flex items-start gap-2 px-2.5 py-2 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                  style={{
                    borderColor: ev.color + "44",
                    background: ev.color + "11",
                  }}
                >
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: ev.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate">
                      {ev.title}
                    </span>
                    {ev.time && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {ev.time}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
