import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { getDb } from "../../lib/db";
import {
  LayoutDashboard,
  Receipt,
  Settings,
  PieChart,
  Wallet,
  ChevronLeft,
  Database,
  AlertCircle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Beranda", icon: LayoutDashboard, href: "/" },
  { name: "Transaksi", icon: Receipt, href: "/expenses" },
  { name: "Kalender", icon: Calendar, href: "/calendar" },
  { name: "Analitik", icon: PieChart, href: "/analytics" },
  { name: "Pengaturan", icon: Settings, href: "/settings" },
];

const pageTitles: Record<string, string> = {
  "/": "Beranda",
  "/expenses": "Transaksi",
  "/calendar": "Kalender",
  "/analytics": "Analitik",
  "/settings": "Pengaturan",
};

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Daily Spend";
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    getDb()
      .then(() => setDbOk(true))
      .catch(() => setDbOk(false));
  }, []);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-60" : "w-[72px]",
        )}
      >
        {/* Logo / Toggle */}
        <div
          className={`h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800 ${sidebarOpen ? "gap-3" : "gap-1"}`}
        >
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-base tracking-tight truncate text-zinc-900 dark:text-zinc-50">
              Daily Spend
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "ml-auto flex-shrink-0 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
              !sidebarOpen ? "mx-auto h-4 w-4" : "h-7 w-7",
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100",
                )
              }
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  !sidebarOpen && "mx-auto",
                )}
              />
              {sidebarOpen && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom version tag */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              v0.2.0 – Beta
            </p>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {dbOk === false && (
              <span className="flex items-center gap-1.5 text-xs text-rose-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800/30">
                <AlertCircle className="h-3.5 w-3.5" />
                Database tidak terhubung
              </span>
            )}
            {dbOk === true && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/30">
                <Database className="h-3.5 w-3.5" />
                Database terhubung
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
