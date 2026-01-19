import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { Home01Icon, Calendar01Icon, SparklesIcon } from 'hugeicons-react';

type NavItemType = 'home' | 'calendar' | 'ai';

const NavIcon = ({ type, className }: { type: NavItemType; className?: string }) => {
  switch (type) {
    case 'home':
      return <Home01Icon className={className} size={24} />;
    case 'calendar':
      return <Calendar01Icon className={className} size={24} />;
    case 'ai':
      return <SparklesIcon className={className} size={24} />;
  }
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const navItems: { type: NavItemType; label: string; path: string }[] = [
    { type: 'home', label: 'Home', path: '/' },
    { type: 'ai', label: 'AI', path: '/ai-search' },
    { type: 'calendar', label: 'Calendar', path: '/calendar' },
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
        </div>
      </nav>
    </div>
  );
}
