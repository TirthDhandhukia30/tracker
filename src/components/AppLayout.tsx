import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

// SVG nav icons
const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
    <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M4 11h16" />
    <path d="M11 15h1" />
    <path d="M12 15v3" />
  </svg>
);

const NavIcon = ({ type, className }: { type: 'home' | 'calendar'; className?: string }) => (
  type === 'home' ? <HomeIcon className={className} /> : <CalendarIcon className={className} />
);

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const navItems = [
    { type: 'home' as const, label: 'Home', path: '/' },
    { type: 'calendar' as const, label: 'Calendar', path: '/calendar' },
  ];

  const handleNavigation = (path: string) => {
    haptics.light();
    navigate(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans overscroll-none">
      <main className="flex-1 pb-20 overscroll-none">
        <Outlet />
      </main>

      <nav 
        className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full space-y-1",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-0 w-8 h-1 rounded-full bg-primary"
                    transition={prefersReducedMotion 
                      ? { duration: 0 } 
                      : { type: "spring", stiffness: 500, damping: 30 }
                    }
                  />
                )}
                <NavIcon type={item.type} className={cn("transition-transform", isActive && "scale-110")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {/* Theme Toggle */}
          <div className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground">
            <ThemeToggle />
            <span className="text-[10px] font-medium">Theme</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
