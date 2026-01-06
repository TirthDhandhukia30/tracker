import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PinLock } from "@/components/PinLock";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { WeightHistoryPage } from "@/pages/WeightHistoryPage";
import { StepsHistoryPage } from "@/pages/StepsHistoryPage";
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

const SESSION_KEY = 'app-unlocked';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      const timestamp = parseInt(session, 10);
      if (Date.now() - timestamp < SESSION_DURATION) {
        return true;
      }
    }
    return false;
  });

  // Re-lock when tab becomes visible after being hidden for too long
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && isUnlocked) {
        // Lock after 5 minutes of being hidden
        if (Date.now() - hiddenAt > 5 * 60 * 1000) {
          setIsUnlocked(false);
          sessionStorage.removeItem(SESSION_KEY);
        }
        hiddenAt = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlocked]);

  const handleUnlock = () => {
    setIsUnlocked(true);
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
  };

  if (!isUnlocked) {
    return (
      <ErrorBoundary>
        <PinLock onUnlock={handleUnlock} />
      </ErrorBoundary>
    );
  }

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
              <Route path="/steps-history" element={<StepsHistoryPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
