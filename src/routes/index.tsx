import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import { scorecardData, type ScorecardEntry } from "@/data/scorecard";
import { HEAD, orgTree, type OrgNode } from "@/data/hierarchy";
import { SiteNav } from "@/components/SiteNav";

const TITLE = "IoT Ops Scorecard — Scorecard structure";
const DESC =
  "Top-down scorecard structure showing how each role's grade is built, what merges into it and where it travels.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

/* ---------- top-down layout: one column per manager, teams stacked beneath ---------- */
const NH = 62;
const LEVEL = NH + 46;
const STACK = NH + 14;

interface Placed {
  role: string;
  depth: number;
  cx: number; // centre, in column units
  w: number; // width, in column units
  y: number;
  parent: string | null;
  children: string[];
}

const NODES = new Map<string, Placed>();
let slot = 0;
let maxStack = 0;
const add = (n: OrgNode, depth: number, cx: number, w: number, y: number, parent: string | null) =>
  NODES.set(n.role, { role: n.role, depth, cx, w, y, parent, children: (n.children ?? []).map((c) => c.role) });
for (const pillar of orgTree.children ?? []) {
  const mgrs = pillar.children ?? [];
  if (!mgrs.length) {
    add(pillar, 1, slot + 0.5, 1, LEVEL, orgTree.role);
    slot++;
    continue;
  }
  const centres = mgrs.map((m) => {
    const c = slot + 0.5;
    slot++;
    add(m, 2, c, 1, LEVEL * 2, pillar.role);
    const teams = m.children ?? [];
    maxStack = Math.max(maxStack, teams.length);
    teams.forEach((t, i) => add(t, 3, c, 1, LEVEL * 2 + NH + 30 + i * STACK, m.role));
    return c;
  });
  add(pillar, 1, centres.reduce((x, y) => x + y, 0) / centres.length, 1.8, LEVEL, orgTree.role);
}
const SLOTS = slot;
add(orgTree, 0, SLOTS / 2, 2.6, 0, null);
const HEIGHT = LEVEL * 2 + NH + 30 + Math.max(maxStack - 1, 0) * STACK + NH;

function ancestors(role: string): string[] {
  const out: string[] = [];
  let p = NODES.get(role)?.parent ?? null;
  while (p) {
    out.push(p);
    p = NODES.get(p)?.parent ?? null;
  }
  return out;
}
function descendants(role: string): string[] {
  const kids = NODES.get(role)?.children ?? [];
  return kids.flatMap((k) => [k, ...descendants(k)]);
}

/* ---------- linking KPIs by name ---------- */
const KPIS = new Map<string, ScorecardEntry[]>();
for (const e of scorecardData) {
  if (!NODES.has(e.role)) continue;
  const list = KPIS.get(e.role) ?? [];
  list.push(e);
  KPIS.set(e.role, list);
}

const STOP = new Set(
  "the of for per all and to within by in on vs avg average overall rate time no with type types as from or is at total".split(" "),
);
const tokenCache = new Map<string, Set<string>>();
function tokens(s: string): Set<string> {
  const hit = tokenCache.get(s);
  if (hit) return hit;
  const t = new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)),
  );
  tokenCache.set(s, t);
  return t;
}
export function related(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  let shared = 0;
  ta.forEach((w) => {
    if (tb.has(w)) shared++;
  });
  return shared >= 2 && shared / Math.min(ta.size, tb.size) >= 0.5;
}

interface Link {
  role: string;
  kpi: string;
  weight: number;
}
function feedsUp(role: string, kpi: string): Link | null {
  for (const a of ancestors(role)) {
    const m = (KPIS.get(a) ?? []).find((k) => related(kpi, k.kpi));
    if (m) return { role: a, kpi: m.kpi, weight: m.weight };
  }
  return null;
}
function fedBy(role: string, kpi: string): Link[] {
  return descendants(role).flatMap((d) =>
    (KPIS.get(d) ?? []).filter((k) => related(kpi, k.kpi)).map((k) => ({ role: d, kpi: k.kpi, weight: k.weight })),
  );
}
const LINKS_UP = new Map<string, number>();
NODES.forEach((_, role) => {
  LINKS_UP.set(role, (KPIS.get(role) ?? []).filter((k) => feedsUp(role, k.kpi)).length);
});

const SHADES = ["#E00800", "#181F4B", "#7C0124", "#9C9C99", "#EB6A64", "#4A5290", "#B5586F", "#71716F"];

function Dashboard() {
  const [selected, setSelected] = useState<string>(HEAD);

  const path = useMemo(() => [selected, ...ancestors(selected)], [selected]);
  const below = useMemo(() => new Set(descendants(selected)), [selected]);
  const onPath = new Set(path);
  const kpis = KPIS.get(selected) ?? [];
  const totalWeight = kpis.reduce((s, k) => s + k.weight, 0);
  const node = NODES.get(selected)!;
  const parent = node.parent;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Structure */}
      <section className="max-w-7xl mx-auto px-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scorecard structure</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a role to see how its grade is built, what merges into it and where it travels.
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-primary" /> Travels up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-navy" /> Merges in
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg bg-background">
          <div className="p-4 min-w-[940px]">
            <div className="relative" style={{ height: HEIGHT }}>
              <svg
                viewBox={`0 0 ${SLOTS * 100} ${HEIGHT}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                aria-hidden
              >
                {Array.from(NODES.values())
                  .filter((n) => n.parent)
                  .map((n) => {
                    const p = NODES.get(n.parent!)!;
                    const x1 = p.cx * 100;
                    const y1 = p.y + NH;
                    const x2 = n.cx * 100;
                    const y2 = n.y;
                    const my = (y1 + y2) / 2;
                    const up = onPath.has(n.role);
                    const dn = below.has(n.role);
                    return (
                      <path
                        key={n.role}
                        d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        stroke={up ? "var(--primary)" : dn ? "var(--navy)" : "var(--border)"}
                        strokeWidth={up ? 2.5 : dn ? 1.75 : 1}
                      />
                    );
                  })}
              </svg>
              {Array.from(NODES.values()).map((n) => {
                const isSel = n.role === selected;
                const up = onPath.has(n.role);
                const count = KPIS.get(n.role)?.length ?? 0;
                return (
                  <div
                    key={n.role}
                    className="absolute px-1"
                    style={{
                      left: `${((n.cx - n.w / 2) / SLOTS) * 100}%`,
                      width: `${(n.w / SLOTS) * 100}%`,
                      top: n.y,
                      height: NH,
                    }}
                  >
                    <button
                      onClick={() => setSelected(n.role)}
                      aria-pressed={isSel}
                      title={n.role}
                      className={
                        "w-full h-full rounded-md border px-2 flex flex-col items-center justify-center text-center transition-colors " +
                        (isSel
                          ? "bg-primary border-primary text-primary-foreground"
                          : up
                            ? "bg-rose-tint border-primary text-foreground"
                            : n.depth === 0
                              ? "bg-navy border-navy text-primary-foreground"
                              : below.has(n.role)
                                ? "bg-background border-navy text-foreground"
                                : "bg-background border-border text-foreground hover:border-primary")
                      }
                    >
                      <span className="text-[11px] font-semibold leading-[1.15] line-clamp-3">{n.role}</span>
                      <span className="text-[10px] opacity-70 leading-tight mt-0.5">
                        {count ? `${count} KPIs` : `${n.children.length} pillars`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* The science */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-5 border-b border-border">
          <div>
            <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Path">
              {[...path].reverse().map((r, i) => (
                <span key={r} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} />}
                  <button onClick={() => setSelected(r)} className="hover:text-primary">
                    {r}
                  </button>
                </span>
              ))}
            </nav>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary">{selected}</h2>
          </div>
          {kpis.length > 0 && (
            <div className="flex gap-8">
              <Stat label="KPIs" value={String(kpis.length)} />
              <Stat label="Total weight" value={`${totalWeight}%`} />
              <Stat label="Travel up" value={String(LINKS_UP.get(selected) ?? 0)} />
            </div>
          )}
        </div>

        {kpis.length === 0 ? (
          <div className="mt-6">
            <div className="text-sm font-semibold">{node.children.length} pillar grades merge here</div>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              The sheet holds no KPIs for this role, and no weights between pillars, so its grade is read
              from the pillar grades below.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {node.children.map((c) => {
                const list = [...(KPIS.get(c) ?? [])].sort((a, b) => b.weight - a.weight);
                return (
                  <button
                    key={c}
                    onClick={() => setSelected(c)}
                    className="text-left border border-border rounded-lg p-5 hover:border-primary transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <Layers size={14} className="text-primary" /> Pillar
                    </div>
                    <div className="mt-2 text-lg font-semibold group-hover:text-primary">{c}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {list.length} KPIs · {descendants(c).length} roles merge in
                    </div>
                    <ul className="mt-4 space-y-2">
                      {list.slice(0, 3).map((k) => (
                        <li key={k.kpi} className="flex gap-3 text-xs">
                          <span className="w-9 shrink-0 font-semibold text-primary tabular-nums">{k.weight}%</span>
                          <span className="text-foreground">{k.kpi}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* How the grade is built */}
            <div className="mt-6">
              <div className="text-sm font-semibold">How this grade is built</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Grade = sum of (KPI score × KPI weight). Each block is one KPI's share.
              </p>
              <div className="mt-3 flex w-full h-9 rounded-md overflow-hidden border border-border">
                {kpis.map((k, i) => (
                  <div
                    key={i}
                    title={`${k.kpi} — ${k.weight}%`}
                    className="h-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground border-r border-background last:border-r-0"
                    style={{ width: `${(k.weight / totalWeight) * 100}%`, backgroundColor: SHADES[i % SHADES.length] }}
                  >
                    {k.weight}%
                  </div>
                ))}
              </div>
            </div>

            {/* What merges and where it travels */}
            <div className="mt-8">
              <div className="hidden md:grid grid-cols-[1fr_24px_1.2fr_24px_1fr] gap-3 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                <span>Merges in from</span>
                <span />
                <span>KPI in this grade</span>
                <span />
                <span>Travels up to</span>
              </div>
              <ul>
                {kpis.map((k, i) => {
                  const up = feedsUp(selected, k.kpi);
                  const down = fedBy(selected, k.kpi);
                  const rollup = /scorecard/i.test(k.kpi) && node.children.length > 0;
                  return (
                    <li
                      key={i}
                      className="grid md:grid-cols-[1fr_24px_1.2fr_24px_1fr] gap-3 py-4 border-b border-border md:items-center"
                    >
                      <div className="space-y-1.5">
                        {down.map((d, j) => (
                          <button
                            key={j}
                            onClick={() => setSelected(d.role)}
                            className="block w-full text-left rounded-md border border-navy px-3 py-2 hover:bg-navy hover:text-primary-foreground transition-colors"
                          >
                            <div className="text-[11px] font-semibold">
                              {d.role} · {d.weight}%
                            </div>
                            <div className="text-[11px] opacity-75 leading-snug">{d.kpi}</div>
                          </button>
                        ))}
                        {rollup && (
                          <div className="rounded-md bg-stone px-3 py-2 text-[11px]">
                            <span className="font-semibold">Scorecards of: </span>
                            {node.children.join(", ")}
                          </div>
                        )}
                        {!down.length && !rollup && (
                          <div className="rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Measured directly: </span>
                            {k.measurement || "—"}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={16} className="hidden md:block text-navy" />
                      <div className="rounded-md border border-border px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums"
                            style={{ backgroundColor: SHADES[i % SHADES.length] }}
                          >
                            {k.weight}%
                          </span>
                          <div className="text-sm font-medium leading-snug">{k.kpi}</div>
                        </div>
                        <div className="mt-1.5 text-[11px] text-muted-foreground">Target: {k.target || "—"}</div>
                      </div>
                      <ArrowRight size={16} className="hidden md:block text-primary" />
                      <div>
                        {up ? (
                          <button
                            onClick={() => setSelected(up.role)}
                            className="block w-full text-left rounded-md bg-rose-tint border border-primary px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <div className="text-[11px] font-semibold">
                              {up.role} · {up.weight}% of that grade
                            </div>
                            <div className="text-[11px] opacity-75 leading-snug">{up.kpi}</div>
                          </button>
                        ) : (
                          <div className="px-3 py-2 text-[11px] text-muted-foreground">
                            Stays in this grade
                            {parent ? ` — reaches ${parent} through the overall score only.` : "."}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          e&amp; Enterprise · IoT Delivery &amp; Operations · Internal Governance Tool
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="md:text-right">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
