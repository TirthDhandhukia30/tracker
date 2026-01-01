import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { haptics } from "@/lib/haptics"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const handleToggle = () => {
    haptics.light();
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="glass"
      size="icon"
      onClick={handleToggle}
      className="rounded-full h-9 w-9"
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" aria-hidden="true" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" aria-hidden="true" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
