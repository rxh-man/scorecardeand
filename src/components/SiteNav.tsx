import { Link } from "@tanstack/react-router";
import eandLogo from "@/assets/eand-logo.svg";

export function SiteNav() {
  return (
    <header className="no-print sticky top-0 z-30 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 font-semibold text-foreground tracking-tight">
          <img src={eandLogo} alt="e&" className="h-6 w-auto" />
          <span className="hidden sm:inline border-l border-border pl-3">IoT Ops Scorecard</span>
        </Link>
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          IoT Delivery &amp; Operations
        </span>
      </div>
    </header>
  );
}
