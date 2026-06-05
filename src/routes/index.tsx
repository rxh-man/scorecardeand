import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { scorecardData, ROLES, type ScorecardEntry } from "@/data/scorecard";
import { SiteNav } from "@/components/SiteNav";
import { ProcessFlow } from "@/components/ProcessFlow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IoT Ops Scorecard — Governance Dashboard" },
      { name: "description", content: "KPI targets, measurements, and weights by role for IoT Delivery & Operations." },
    ],
  }),
  component: Dashboard,
});

const RED_SHADES = ["#C0392B", "#D55447", "#E07165", "#EB8B82", "#F2A8A1", "#F8C3BE", "#FADBD8"];

function Dashboard() {
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const rolesSummary = useMemo(() => {
    return ROLES.map((role) => {
      const entries = scorecardData.filter((e) => e.role === role);
      const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
      return {
        role,
        count: entries.length,
        avgWeight: entries.length ? Math.round(totalWeight / entries.length) : 0,
        totalWeight,
      };
    });
  }, []);

  const roleEntries: ScorecardEntry[] = useMemo(() => {
    if (!activeRole) return [];
    return scorecardData
      .filter((e) => e.role === activeRole)
      .filter((e) =>
        search.trim() === ""
          ? true
          : (e.kpi + " " + e.measurement + " " + e.target).toLowerCase().includes(search.toLowerCase()),
      );
  }, [activeRole, search]);

  const activeSummary = activeRole ? rolesSummary.find((r) => r.role === activeRole) : null;

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />

      <ProcessFlow />

      {/* Hero / filters */}
      <section className="no-print bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-center text-[28px] font-semibold text-[#1A1A1A] tracking-tight">
            Team Performance Scorecards
          </h1>
          <p className="text-center text-sm text-[#555555] mt-2">
            KPI targets, measurements, and weights by role
          </p>

          <div className="mt-7 flex flex-wrap gap-2 justify-center">
            <FilterPill
              label="All Roles"
              active={activeRole === null}
              onClick={() => {
                setActiveRole(null);
                setExpanded(null);
                setSearch("");
              }}
            />
            {ROLES.map((r) => (
              <FilterPill
                key={r}
                label={r}
                active={activeRole === r}
                onClick={() => {
                  setActiveRole(r);
                  setExpanded(null);
                  setSearch("");
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeRole === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rolesSummary.map((r) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(r.role)}
                className="text-left bg-white border border-border rounded-lg p-5 transition-all hover:border-[#C0392B] hover:shadow-[0_4px_12px_rgba(192,57,43,0.08)] group"
              >
                <div className="font-semibold text-[#1A1A1A] group-hover:text-[#C0392B] transition-colors">
                  {r.role}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[#555555]">
                    <span className="font-semibold text-[#1A1A1A]">{r.count}</span> KPIs
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FDECEA] text-[#C0392B] text-xs font-medium">
                    avg {r.avgWeight}% weight
                  </span>
                </div>
                <div className="mt-3 h-1 rounded-full bg-[#F5F5F5] overflow-hidden">
                  <div
                    className="h-full bg-[#C0392B]"
                    style={{ width: `${Math.min(r.totalWeight, 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <RoleView
            role={activeRole}
            entries={roleEntries}
            summary={activeSummary!}
            search={search}
            setSearch={setSearch}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}
      </main>

      <footer className="no-print border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-[#888888]">
          e& Enterprise · IoT Delivery & Operations · Internal Governance Tool
        </div>
      </footer>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap " +
        (active
          ? "bg-[#C0392B] text-white border-[#C0392B]"
          : "bg-white text-[#C0392B] border-[#C0392B] hover:bg-[#FDECEA]")
      }
    >
      {label}
    </button>
  );
}

function RoleView({
  role,
  entries,
  summary,
  search,
  setSearch,
  expanded,
  setExpanded,
}: {
  role: string;
  entries: ScorecardEntry[];
  summary: { count: number; totalWeight: number };
  search: string;
  setSearch: (s: string) => void;
  expanded: number | null;
  setExpanded: (n: number | null) => void;
}) {
  const allEntriesForRole = scorecardData.filter((e) => e.role === role);

  return (
    <div className="print-full">
      {/* Summary strip */}
      <div className="bg-white border border-border rounded-lg p-6 mb-6 print-full">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-2xl md:text-3xl font-semibold text-[#C0392B] tracking-tight">{role}</div>
            <div className="text-xs text-[#888888] mt-1">Click any row to see measurement details</div>
          </div>
          <div className="flex gap-6">
            <Stat label="Total KPIs" value={String(summary.count)} />
            <Stat
              label="Total Weight"
              value={`${summary.totalWeight}%`}
              accent={summary.totalWeight === 100}
            />
          </div>
        </div>
      </div>

      {/* Search + Export */}
      <div className="no-print flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search KPIs by keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B]"
        />
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium bg-white text-[#C0392B] border border-[#C0392B] rounded-md hover:bg-[#FDECEA] transition-colors"
        >
          Print / Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden print-full">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFA] border-b border-border">
              <tr className="text-[#555555]">
                <th className="text-left font-semibold px-4 py-3" style={{ width: "35%" }}>KPI</th>
                <th className="text-center font-semibold px-4 py-3">Target</th>
                <th className="text-left font-semibold px-4 py-3" style={{ width: "20%" }}>Measurement Method</th>
                <th className="text-left font-semibold px-4 py-3" style={{ width: "15%" }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, idx) => {
                const isExp = expanded === idx;
                return (
                  <Fragment key={idx}>
                    <tr
                      onClick={() => setExpanded(isExp ? null : idx)}
                      className={
                        "cursor-pointer border-b border-border transition-colors group relative " +
                        (idx % 2 === 0 ? "bg-white" : "bg-[#FDF5F5]") +
                        " hover:bg-[#FBE5E2]"
                      }
                      style={{
                        boxShadow: isExp ? "inset 4px 0 0 0 #C0392B" : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-[#1A1A1A]">
                        <span className="block group-hover:pl-1 transition-[padding]">{e.kpi}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded bg-[#FDECEA] text-[#C0392B] border border-[#F5C6C0]">
                          {e.target}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#555555] truncate max-w-0" title={e.measurement}>
                        <span className="block truncate">{e.measurement}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#1A1A1A] font-medium tabular-nums w-10">{e.weight}%</span>
                          <div className="w-20 h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
                            <div
                              className="h-full bg-[#C0392B]"
                              style={{ width: `${e.weight}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr className="bg-[#FDF5F5] border-b border-border">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="pl-6 border-l-2 border-[#C0392B]">
                            <div className="text-xs uppercase tracking-wide text-[#888888] font-semibold mb-1">
                              Measurement Method
                            </div>
                            <div className="text-sm text-[#1A1A1A]">{e.measurement}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#888888]">
                    No KPIs match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weight distribution */}
      <div className="no-print mt-8 bg-white border border-border rounded-lg p-6">
        <div className="text-sm font-semibold text-[#1A1A1A] mb-1">KPI Weight Distribution</div>
        <div className="text-xs text-[#888888] mb-4">Total weight: {summary.totalWeight}%</div>
        <div className="flex w-full h-6 rounded-md overflow-hidden border border-border">
          {allEntriesForRole.map((e, i) => (
            <div
              key={i}
              title={`${e.kpi} — ${e.weight}%`}
              className="h-full transition-opacity hover:opacity-80"
              style={{
                width: `${(e.weight / summary.totalWeight) * 100}%`,
                backgroundColor: RED_SHADES[i % RED_SHADES.length],
              }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {allEntriesForRole.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#555555]">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: RED_SHADES[i % RED_SHADES.length] }}
              />
              <span className="truncate max-w-[260px]" title={e.kpi}>
                {e.kpi}
              </span>
              <span className="text-[#888888]">· {e.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-xs uppercase tracking-wide text-[#888888] font-medium">{label}</div>
      <div className={"text-2xl font-semibold tabular-nums " + (accent ? "text-[#27AE60]" : "text-[#1A1A1A]")}>
        {value}
      </div>
    </div>
  );
}
