import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="daily-tracker-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/date/:dateStr" element={<DailyPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

export default App;
