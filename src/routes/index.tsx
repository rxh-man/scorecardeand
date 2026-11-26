import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ChevronRight, Layers, Lock } from "lucide-react";
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

function Dashboard() {
  const [selected, setSelectedRaw] = useState<string>(HEAD);
  const detailRef = useRef<HTMLElement>(null);
  const setSelected = (r: string) => {
    setSelectedRaw(r);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const path = useMemo(() => [selected, ...ancestors(selected)], [selected]);
  const below = useMemo(() => new Set(descendants(selected)), [selected]);
  const onPath = new Set(path);
  const kpis = KPIS.get(selected) ?? [];
  const totalWeight = kpis.reduce((s, k) => s + k.weight, 0);
  const node = NODES.get(selected)!;
  const rows = kpis.map((k) => ({
    k,
    up: feedsUp(selected, k.kpi),
    down: fedBy(selected, k.kpi),
    rollup: /scorecard/i.test(k.kpi) && node.children.length > 0,
  }));
  const passed = rows.filter((r) => r.up);
  const own = rows.filter((r) => !r.up);
  const passedWeight = passed.reduce((s, r) => s + r.k.weight, 0);
  const ownWeight = totalWeight - passedWeight;
  const received = rows.filter((r) => r.down.length > 0 || r.rollup);

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
      <section ref={detailRef} className="max-w-7xl mx-auto px-6 py-10 scroll-mt-16">
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
              <Stat label="Passed up" value={`${passedWeight}%`} />
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
            {/* Split: passed up vs own */}
            <div className="mt-6">
              <div className="flex w-full h-10 rounded-md overflow-hidden border border-border text-xs font-semibold text-primary-foreground">
                {passedWeight > 0 && (
                  <div className="h-full flex items-center px-3 bg-primary" style={{ width: `${(passedWeight / totalWeight) * 100}%` }}>
                    <span className="truncate">{passedWeight}% passed up</span>
                  </div>
                )}
                {ownWeight > 0 && (
                  <div className="h-full flex items-center px-3 bg-navy" style={{ width: `${(ownWeight / totalWeight) * 100}%` }}>
                    <span className="truncate">{ownWeight}% own scorecard</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Grade = sum of (KPI score × KPI weight). Red is the part that travels to the role above; navy
                stays with this role.
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Passed up */}
              <div className="rounded-lg border border-primary overflow-hidden">
                <div className="px-4 py-3 bg-rose-tint flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowUp size={16} /> Grades passed up
                  </div>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {passed.length} KPIs · {passedWeight}%
                  </span>
                </div>
                <ul>
                  {passed.map(({ k, up }, i) => (
                    <li key={i} className="px-4 py-3 border-t border-border">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-10 text-sm font-semibold text-primary tabular-nums">{k.weight}%</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium leading-snug">{k.kpi}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">Target: {k.target || "—"}</div>
                          <button
                            onClick={() => setSelected(up!.role)}
                            className="mt-2 block w-full text-left rounded-md bg-rose-tint px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <div className="text-[11px] font-semibold">
                              → {up!.role} · {up!.weight}% of that grade
                            </div>
                            <div className="text-[11px] opacity-75 leading-snug">{up!.kpi}</div>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!passed.length && (
                    <li className="px-4 py-6 border-t border-border text-xs text-muted-foreground">
                      No KPI here is carried into the role above by name.
                    </li>
                  )}
                </ul>
              </div>

              {/* Own */}
              <div className="rounded-lg border border-navy overflow-hidden">
                <div className="px-4 py-3 bg-navy text-primary-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock size={15} /> Own scorecard — not passed on
                  </div>
                  <span className="text-xs font-semibold tabular-nums">
                    {own.length} KPIs · {ownWeight}%
                  </span>
                </div>
                <ul>
                  {own.map(({ k }, i) => (
                    <li key={i} className="px-4 py-3 border-t border-border">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-10 text-sm font-semibold text-navy tabular-nums">{k.weight}%</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium leading-snug">{k.kpi}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Target: {k.target || "—"}
                            {k.measurement ? ` · Measured by: ${k.measurement}` : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!own.length && (
                    <li className="px-4 py-6 border-t border-border text-xs text-muted-foreground">
                      Every KPI in this role is passed up.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Received */}
            {received.length > 0 && (
              <div className="mt-6 rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 bg-muted flex items-center gap-2 text-sm font-semibold">
                  <ArrowDown size={16} className="text-navy" /> Grades received from below
                </div>
                <ul>
                  {received.map(({ k, down, rollup }, i) => (
                    <li key={i} className="px-4 py-3 border-t border-border grid gap-3 md:grid-cols-[1fr_20px_1fr] md:items-center">
                      <div className="flex flex-wrap gap-1.5">
                        {down.map((d, j) => (
                          <button
                            key={j}
                            onClick={() => setSelected(d.role)}
                            title={d.kpi}
                            className="rounded-full border border-navy px-2.5 py-1 text-[11px] font-medium text-navy hover:bg-navy hover:text-primary-foreground transition-colors"
                          >
                            {d.role} · {d.weight}%
                          </button>
                        ))}
                        {rollup &&
                          node.children.map((c) => (
                            <button
                              key={c}
                              onClick={() => setSelected(c)}
                              className="rounded-full bg-stone px-2.5 py-1 text-[11px] font-medium hover:bg-navy hover:text-primary-foreground transition-colors"
                            >
                              {c} · whole scorecard
                            </button>
                          ))}
                      </div>
                      <ArrowRight size={16} className="hidden md:block text-navy" />
                      <div className="text-sm font-medium leading-snug">
                        <span className="text-primary tabular-nums mr-2">{k.weight}%</span>
                        {k.kpi}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
