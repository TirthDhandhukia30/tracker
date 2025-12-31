import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link to="/" className="font-bold text-lg tracking-tight">
          Daily
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
