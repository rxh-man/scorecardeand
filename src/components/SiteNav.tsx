import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import eandLogo from "@/assets/eand.png";

export function SiteNav() {
  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-[#C0392B] tracking-tight text-lg">
          <img src={eandLogo} alt="e& Enterprise" className="h-7 w-auto" />
          <span>IoT Ops Scorecard</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/submit">Submit</NavLink>
          <NavLink to="/governance">Governance</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-[#555555] hover:text-[#C0392B] hover:bg-[#FDECEA] transition-colors font-medium"
      activeProps={{ className: "px-3 py-1.5 rounded-md bg-[#FDECEA] text-[#C0392B] font-semibold" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}
