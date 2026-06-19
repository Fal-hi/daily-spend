import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/layout/ThemeProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Expenses } from "./features/expenses/Expenses";
import { Analytics } from "./features/analytics/Analytics";
import { SettingsPage } from "./features/settings/SettingsPage";
import { CalendarEventPage } from "./features/calendar/CalendarEvent";
import { seedDefaultCategories, hasAnyData, seedSampleData } from "./lib/api";
import { getDbError } from "./lib/db";
import "./index.css";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    async function init() {
      try {
        await seedDefaultCategories();
        const hasData = await hasAnyData();
        if (!hasData) {
          await seedSampleData();
        }
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["budgets"] });
      } catch (e: any) {
        const dbErr = getDbError();
        console.error(
          "Init error:",
          e?.message || e,
          dbErr ? `(DB: ${dbErr})` : ""
        );
      }
    }
    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HashRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/calendar" element={<CalendarEventPage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AppLayout>
        </HashRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
