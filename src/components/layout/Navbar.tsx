import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full glass-nav">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          to="/"
          className="font-semibold text-lg tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        >
          Daily
        </Link>
        {/* Theme toggle removed - dark mode only */}
      </div>
    </header>
  );
}
