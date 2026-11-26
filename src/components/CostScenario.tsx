import { useMemo, useState } from "react";
import { RefreshCw, Scissors, UserPlus } from "lucide-react";

// Illustrative figures only: generated from a seed, not real cost data.
const INITIATIVES = [
  "Route optimisation",
  "Shift consolidation",
  "Vendor renegotiation",
  "Remote-first fixes",
  "Shared tooling",
  "Overtime cap",
];
const EXTRA_UNIT = 18; // AED k per extra resource

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Filter = "all" | "extra" | "cuts";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All teams" },
  { id: "extra", label: "Extra resources deployed" },
  { id: "cuts", label: "Cost-cutting initiatives" },
];
const fmt = (n: number) => `AED ${n.toLocaleString("en-GB")}k`;

export function CostScenario({ teams }: { teams: { role: string; pillar: string }[] }) {
  const [seed, setSeed] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () =>
      teams
        .map((t) => {
          const r = rng(`${t.role}#${seed}`);
          const base = Math.round(80 + r() * 340);
          const extra = r() < 0.45 ? 0 : 1 + Math.floor(r() * 5);
          const count = r() < 0.4 ? 0 : 1 + Math.floor(r() * 2);
          const start = Math.floor(r() * INITIATIVES.length);
          const cuts = Array.from({ length: count }, (_, i) => ({
            name: INITIATIVES[(start + i) % INITIATIVES.length] ?? "",
            saving: 8 + Math.floor(r() * 30),
          }));
          const saving = cuts.reduce((s, c) => s + c.saving, 0);
          const extraCost = extra * EXTRA_UNIT;
          return { ...t, base, extra, extraCost, cuts, saving, net: base + extraCost - saving };
        })
        .sort((a, b) => b.net - a.net),
    [teams, seed],
  );

  const shown = rows.filter((r) => (filter === "extra" ? r.extra > 0 : filter === "cuts" ? r.cuts.length > 0 : true));
  const max = Math.max(...rows.map((r) => r.base + r.extraCost), 1);
  const top = rows[0];
  const sum = (f: (r: (typeof rows)[number]) => number) => shown.reduce((s, r) => s + f(r), 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 border-t border-border">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cost by team</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Illustrative scenario — sample figures for one month, not real cost data.
          </p>
        </div>
        <button
          onClick={() => setSeed((s) => s + 1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <RefreshCw size={14} /> New scenario
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors " +
              (filter === f.id
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border text-foreground hover:border-primary hover:text-primary")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <Tile label="Highest cost" value={top ? top.role : "—"} sub={top ? fmt(top.net) : ""} accent />
        <Tile label="Net cost shown" value={fmt(sum((r) => r.net))} sub={`${shown.length} teams`} />
        <Tile label="Extra resources" value={String(sum((r) => r.extra))} sub={`+${fmt(sum((r) => r.extraCost))}`} />
        <Tile label="Savings from initiatives" value={fmt(sum((r) => r.saving))} sub={`${sum((r) => r.cuts.length)} initiatives`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy" /> Base cost</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Extra resources</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success" /> Savings</span>
      </div>

      <ul key={`${seed}-${filter}`} className="mt-3 border-t border-border">
        {shown.map((r, i) => (
          <li
            key={r.role}
            className="rise grid gap-2 md:grid-cols-[230px_1fr_120px] md:items-center py-3 border-b border-border"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <div>
              <div className="text-sm font-medium leading-snug">
                {r.role}
                {r === top && (
                  <span className="ml-2 align-middle rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5">
                    Highest
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">{r.pillar}</div>
            </div>
            <div>
              <div className="grow flex h-3 rounded-full overflow-hidden bg-muted" style={{ animationDelay: `${i * 35}ms` }}>
                <div className="h-full bg-navy" style={{ width: `${((r.base - r.saving) / max) * 100}%` }} />
                <div className="h-full bg-success" style={{ width: `${(r.saving / max) * 100}%` }} />
                <div className="h-full bg-primary" style={{ width: `${(r.extraCost / max) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {r.extra > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    <UserPlus size={12} /> {r.extra} extra resources · +{fmt(r.extraCost)}
                  </span>
                )}
                {r.cuts.map((c) => (
                  <span key={c.name} className="inline-flex items-center gap-1 text-success font-medium">
                    <Scissors size={12} /> {c.name} · −{fmt(c.saving)}
                  </span>
                ))}
                {r.extra === 0 && r.cuts.length === 0 && <span>No extra resources or initiatives</span>}
              </div>
            </div>
            <div className="md:text-right text-sm font-semibold tabular-nums">{fmt(r.net)}</div>
          </li>
        ))}
        {!shown.length && <li className="py-8 text-center text-sm text-muted-foreground">No teams match this filter.</li>}
      </ul>
    </section>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={"rounded-lg border p-4 " + (accent ? "border-primary bg-rose-tint" : "border-border")}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={"mt-1 font-semibold leading-tight " + (accent ? "text-base text-primary" : "text-xl tabular-nums")}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
