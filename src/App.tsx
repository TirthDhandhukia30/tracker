import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
