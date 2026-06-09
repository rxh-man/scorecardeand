import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import {
  loadCandidates,
  loadProjects,
  computeStats,
  type Candidate,
  type Company,
  type FinalStatus,
  type Project,
} from "@/lib/talent";

export const Route = createFileRoute("/talent")({
  head: () => ({
    meta: [
      { title: "Talent Pool — IoT Ops Scorecard" },
      { name: "description", content: "Talent pool: candidate screening across TAQA and Etihad WE." },
    ],
  }),
  component: TalentPage,
});

const COMPANIES: Company[] = ["TAQA", "Etihad WE", "Other"];
const STATUSES: FinalStatus[] = ["Selected", "Not Selected", "Waiting List", "Unknown"];

function TalentPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [company, setCompany] = useState<"All" | Company>("All");
  const [status, setStatus] = useState<"All" | FinalStatus>("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    setCandidates(loadCandidates());
    setProjects(loadProjects());
  }, []);

  const stats = useMemo(() => computeStats(candidates), [candidates]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (company !== "All" && c.company !== company) return false;
      if (status !== "All" && c.finalStatus !== status) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        if (!(c.name + " " + c.empId + " " + c.designation + " " + c.remarks).toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [candidates, company, status, q]);

  const totalRequested = projects.reduce((s, p) => s + (p.requested || 0), 0);
  const totalSelectedProj = projects.reduce((s, p) => s + (p.selected || 0), 0);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-[28px] font-semibold text-[#1A1A1A] tracking-tight">Talent Pool</h1>
        <p className="text-sm text-[#555555] mt-2">
          Story of how every resource flows from screening to project deployment.
        </p>

        {candidates.length === 0 ? (
          <div className="mt-8 border border-dashed border-[#E0E0E0] rounded-lg p-10 text-center bg-[#FAFAFA]">
            <div className="text-[#555555] text-sm">
              No candidates uploaded yet. Go to{" "}
              <a href="/admin" className="text-[#C0392B] font-semibold underline">Admin Portal</a>{" "}
              to upload the screening Excel file.
            </div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
              <KPI label="Talent Pool (Total)" value={stats.total} accent />
              <KPI label="TAQA Screened" value={stats.byCompany.TAQA} />
              <KPI label="Etihad WE Screened" value={stats.byCompany["Etihad WE"]} />
              <KPI label="Total Selected" value={stats.byStatus.Selected} />
            </div>

            {/* Story panels */}
            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <Panel title="Screening Outcome">
                <BarRow label="Selected" value={stats.byStatus.Selected} total={stats.total} color="#27AE60" />
                <BarRow label="Waiting List" value={stats.byStatus["Waiting List"]} total={stats.total} color="#F39C12" />
                <BarRow label="Not Selected" value={stats.byStatus["Not Selected"]} total={stats.total} color="#C0392B" />
                {stats.byStatus.Unknown > 0 && (
                  <BarRow label="Unknown" value={stats.byStatus.Unknown} total={stats.total} color="#999999" />
                )}
              </Panel>
              <Panel title="By Client Project">
                <BarRow label="TAQA — Selected" value={stats.selectedByCompany.TAQA} total={stats.byCompany.TAQA} color="#C0392B" />
                <BarRow label="Etihad WE — Selected" value={stats.selectedByCompany["Etihad WE"]} total={stats.byCompany["Etihad WE"]} color="#C0392B" />
              </Panel>
            </div>

            {/* Projects overlay */}
            {projects.length > 0 && (
              <div className="mt-6 bg-white border border-[#E0E0E0] rounded-lg">
                <div className="px-5 py-4 border-b border-[#E0E0E0] flex items-end justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#1A1A1A]">Project Demand vs Fulfillment</div>
                    <div className="text-xs text-[#888888]">Requested {totalRequested} · Selected {totalSelectedProj}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FAFAFA] text-[#555555]">
                      <tr>
                        <th className="text-left font-semibold px-4 py-2">Project</th>
                        <th className="text-left font-semibold px-4 py-2">Client</th>
                        <th className="text-right font-semibold px-4 py-2">Requested</th>
                        <th className="text-right font-semibold px-4 py-2">Selected</th>
                        <th className="text-left font-semibold px-4 py-2 w-1/3">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => {
                        const pct = p.requested ? Math.min(100, Math.round((p.selected / p.requested) * 100)) : 0;
                        return (
                          <tr key={p.id} className="border-t border-[#E0E0E0]">
                            <td className="px-4 py-2 text-[#1A1A1A]">{p.name}</td>
                            <td className="px-4 py-2 text-[#555555]">{p.company}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{p.requested}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{p.selected}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#C0392B]" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-[#555555] w-10 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Select label="Client" value={company} onChange={(v) => setCompany(v as any)} options={["All", ...COMPANIES]} />
              <Select label="Status" value={status} onChange={(v) => setStatus(v as any)} options={["All", ...STATUSES]} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, ID, designation…"
                className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#C0392B]"
              />
              <span className="text-xs text-[#888888]">{filtered.length} shown</span>
            </div>

            {/* Table */}
            <div className="mt-3 bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAFA] text-[#555555]">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2">Emp ID</th>
                      <th className="text-left font-semibold px-3 py-2">Name</th>
                      <th className="text-left font-semibold px-3 py-2">Client</th>
                      <th className="text-left font-semibold px-3 py-2">Designation</th>
                      <th className="text-left font-semibold px-3 py-2">Recommended</th>
                      <th className="text-left font-semibold px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.empId + i} className={i % 2 ? "bg-[#FDF5F5]" : "bg-white"}>
                        <td className="px-3 py-2 text-[#555555] tabular-nums">{c.empId}</td>
                        <td className="px-3 py-2 text-[#1A1A1A] font-medium">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className={
                            "inline-block px-2 py-0.5 rounded text-xs font-medium " +
                            (c.company === "TAQA"
                              ? "bg-[#FDECEA] text-[#C0392B]"
                              : c.company === "Etihad WE"
                              ? "bg-[#E8F0FE] text-[#1A56DB]"
                              : "bg-[#F0F0F0] text-[#555555]")
                          }>{c.company}</span>
                        </td>
                        <td className="px-3 py-2 text-[#555555]">{c.designation || "—"}</td>
                        <td className="px-3 py-2 text-[#555555]">{c.recommendedFor || "—"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge s={c.finalStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={"rounded-lg border p-5 bg-white " + (accent ? "border-[#C0392B]" : "border-[#E0E0E0]")}>
      <div className="text-xs uppercase tracking-wide text-[#888888] font-medium">{label}</div>
      <div className={"text-3xl font-semibold tabular-nums mt-1 " + (accent ? "text-[#C0392B]" : "text-[#1A1A1A]")}>{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-5">
      <div className="text-sm font-semibold text-[#1A1A1A] mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-[#555555] mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-[#F0F0F0] overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-xs text-[#555555] flex items-center gap-2">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 text-sm border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#C0392B]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function StatusBadge({ s }: { s: FinalStatus }) {
  const map: Record<FinalStatus, { bg: string; fg: string }> = {
    Selected: { bg: "#E8F5EE", fg: "#1E7E45" },
    "Waiting List": { bg: "#FEF3E2", fg: "#B5730E" },
    "Not Selected": { bg: "#FDECEA", fg: "#C0392B" },
    Unknown: { bg: "#F0F0F0", fg: "#555555" },
  };
  const c = map[s];
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: c.bg, color: c.fg }}>{s}</span>
  );
}
