import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { WeightHistoryPage } from "@/pages/WeightHistoryPage";
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="daily-tracker-theme">
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/date/:dateStr" element={<DailyPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/weight-history" element={<WeightHistoryPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
