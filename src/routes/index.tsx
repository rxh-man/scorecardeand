import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Layers } from "lucide-react";
import { scorecardData, type ScorecardEntry } from "@/data/scorecard";
import { HEAD, orgTree, type OrgNode } from "@/data/hierarchy";
import { SiteNav } from "@/components/SiteNav";

const TITLE = "IoT Ops Scorecard — How every KPI reaches the top";
const DESC =
  "Follow each KPI from field measurement through managers and pillars to the Head of IoT Delivery & Operations.";

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

/* ---------- layout of the network ---------- */
const NW = 236;
const NH = 48;
const COL = 296;
const ROW = 60;
const LAYERS = ["Head", "Pillars", "Managers", "Teams"];

interface Placed {
  role: string;
  depth: number;
  x: number;
  y: number;
  parent: string | null;
  children: string[];
}

const NODES = new Map<string, Placed>();
let leafCount = 0;
function place(n: OrgNode, depth: number, parent: string | null): number {
  const kids = n.children ?? [];
  const ys = kids.map((c) => place(c, depth + 1, n.role));
  const y = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : leafCount++ * ROW;
  NODES.set(n.role, { role: n.role, depth, x: depth * COL, y, parent, children: kids.map((c) => c.role) });
  return y;
}
place(orgTree, 0, null);
const MAX_DEPTH = Math.max(...Array.from(NODES.values(), (n) => n.depth));
const WIDTH = MAX_DEPTH * COL + NW;
const HEIGHT = (leafCount - 1) * ROW + NH;

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
}
function feedsUp(role: string, kpi: string): Link | null {
  for (const a of ancestors(role)) {
    const m = (KPIS.get(a) ?? []).find((k) => related(kpi, k.kpi));
    if (m) return { role: a, kpi: m.kpi };
  }
  return null;
}
function fedBy(role: string, kpi: string): Link[] {
  return descendants(role).flatMap((d) =>
    (KPIS.get(d) ?? []).filter((k) => related(kpi, k.kpi)).map((k) => ({ role: d, kpi: k.kpi })),
  );
}
const LINKS_UP = new Map<string, number>();
NODES.forEach((_, role) => {
  LINKS_UP.set(role, (KPIS.get(role) ?? []).filter((k) => feedsUp(role, k.kpi)).length);
});

const STORY = [
  { t: "Measure", d: "Evidence is captured where the work happens — audits, logs, NOC dashboards." },
  { t: "Compare", d: "Each KPI is read against its agreed target." },
  { t: "Weigh", d: "Every KPI carries a share of the role's 100%." },
  { t: "Score", d: "Weighted KPIs add up to one score per role." },
  { t: "Roll up", d: "Like-named KPIs carry the result to the layer above, up to the Head." },
];

function Dashboard() {
  const [selected, setSelected] = useState<string>(HEAD);

  const path = useMemo(() => [selected, ...ancestors(selected)], [selected]);
  const below = useMemo(() => new Set(descendants(selected)), [selected]);
  const onPath = new Set(path);
  const kpis = KPIS.get(selected) ?? [];
  const totalWeight = kpis.reduce((s, k) => s + k.weight, 0);
  const node = NODES.get(selected)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Hero */}
      <section className="bg-navy text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20 grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Performance hierarchy
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              How every KPI
              <br />
              reaches the top.
            </h1>
            <p className="mt-5 max-w-xl text-sm md:text-base opacity-75 leading-relaxed">
              One organisation, three pillars, {NODES.size - 1} roles. Follow a single measurement from the
              field, through each manager, to the Head of IoT Delivery &amp; Operations.
            </p>
          </div>
          <dl className="grid grid-cols-4 gap-4 md:gap-6">
            {[
              [String(MAX_DEPTH + 1), "Layers"],
              [String(orgTree.children?.length ?? 0), "Pillars"],
              [String(NODES.size - 1), "Roles"],
              [String(Array.from(KPIS.values()).reduce((s, l) => s + l.length, 0)), "KPIs"],
            ].map(([v, l]) => (
              <div key={l} className="border-t border-primary pt-3">
                <dd className="text-3xl md:text-4xl font-semibold tabular-nums">{v}</dd>
                <dt className="mt-1 text-[11px] uppercase tracking-wider opacity-60">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Story strip */}
      <section className="border-b border-border">
        <ol className="max-w-7xl mx-auto px-6 py-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STORY.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="text-2xl font-semibold text-primary tabular-nums leading-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-sm font-semibold">{s.t}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Network */}
      <section className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">The scorecard network</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select any role to trace its line to the Head and see the KPIs it passes upward.
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-primary" /> Line to the Head
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-navy" /> Teams feeding in
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg bg-background">
          <div className="p-6" style={{ width: WIDTH + 48 }}>
            <div className="flex mb-4">
              {LAYERS.slice(0, MAX_DEPTH + 1).map((l, i) => (
                <div
                  key={l}
                  className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold"
                  style={{ width: i === MAX_DEPTH ? NW : COL }}
                >
                  <span className="text-primary mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                  {l}
                </div>
              ))}
            </div>
            <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
              <svg width={WIDTH} height={HEIGHT} className="absolute inset-0" aria-hidden>
                {Array.from(NODES.values())
                  .filter((n) => n.parent)
                  .map((n) => {
                    const p = NODES.get(n.parent!)!;
                    const x1 = p.x + NW;
                    const y1 = p.y + NH / 2;
                    const x2 = n.x;
                    const y2 = n.y + NH / 2;
                    const mx = (x1 + x2) / 2;
                    const up = onPath.has(n.role);
                    const dn = below.has(n.role);
                    return (
                      <path
                        key={n.role}
                        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                        fill="none"
                        stroke={up ? "var(--primary)" : dn ? "var(--navy)" : "var(--border)"}
                        strokeWidth={up ? 2.5 : dn ? 1.5 : 1}
                        style={{ transition: "stroke 200ms" }}
                      />
                    );
                  })}
              </svg>
              {Array.from(NODES.values()).map((n) => {
                const isSel = n.role === selected;
                const up = onPath.has(n.role);
                const count = KPIS.get(n.role)?.length ?? 0;
                const linked = LINKS_UP.get(n.role) ?? 0;
                return (
                  <button
                    key={n.role}
                    onClick={() => setSelected(n.role)}
                    aria-pressed={isSel}
                    className={
                      "absolute text-left rounded-md border px-3 flex flex-col justify-center transition-colors " +
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
                    style={{ left: n.x, top: n.y, width: NW, height: NH }}
                  >
                    <span className="text-xs font-semibold leading-tight truncate">{n.role}</span>
                    <span className="text-[10px] opacity-70 leading-tight mt-0.5">
                      {count
                        ? `${count} KPIs${linked ? ` · ${linked} carried upward` : ""}`
                        : `${n.children.length} pillars roll up here`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs mb-4" aria-label="Line to the Head">
          {[...path].reverse().map((r, i) => (
            <span key={r} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
              <button
                onClick={() => setSelected(r)}
                className={
                  "px-2.5 py-1 rounded-full border " +
                  (r === selected
                    ? "bg-primary border-primary text-primary-foreground font-semibold"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary")
                }
              >
                {r}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
              Layer {String(node.depth + 1).padStart(2, "0")} · {LAYERS[node.depth]}
            </div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-primary">{selected}</h2>
          </div>
          {kpis.length > 0 && (
            <div className="flex gap-8">
              <Stat label="KPIs" value={String(kpis.length)} />
              <Stat label="Total weight" value={`${totalWeight}%`} />
              <Stat label="Carried upward" value={String(LINKS_UP.get(selected) ?? 0)} />
            </div>
          )}
        </div>

        {kpis.length === 0 ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground max-w-2xl">
              The Head's view is the read-out of the pillars below. Each pillar owns a 100% scorecard of its
              own, built from the teams reporting into it.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
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
                      {list.length} KPIs · {descendants(c).length} roles beneath
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
          <ul>
            <li className="hidden md:grid grid-cols-[1fr_150px_210px_120px] gap-4 px-1 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
              <span>KPI and where it travels</span>
              <span>Target</span>
              <span>Measured by</span>
              <span>Weight</span>
            </li>
            {kpis.map((k, i) => {
              const up = feedsUp(selected, k.kpi);
              const down = fedBy(selected, k.kpi);
              const downRoles = Array.from(new Set(down.map((d) => d.role)));
              const rollup = /scorecard/i.test(k.kpi) && node.children.length > 0;
              return (
                <li
                  key={i}
                  className="grid md:grid-cols-[1fr_150px_210px_120px] gap-2 md:gap-4 px-1 py-4 border-b border-border"
                >
                  <div>
                    <div className="text-sm font-medium">{k.kpi}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {up && (
                        <button
                          onClick={() => setSelected(up.role)}
                          title={up.kpi}
                          className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-rose-tint text-primary text-[11px] font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <ArrowUp size={12} className="shrink-0" />
                          <span className="truncate">Feeds {up.role}</span>
                        </button>
                      )}
                      {downRoles.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full border border-navy text-navy text-[11px] font-medium hover:bg-navy hover:text-primary-foreground transition-colors"
                        >
                          <ArrowDown size={12} className="shrink-0" />
                          <span className="truncate">Fed by {r}</span>
                        </button>
                      ))}
                      {rollup && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone text-foreground text-[11px] font-medium">
                          <Layers size={12} /> Built from the scorecards below
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="inline-block px-2 py-0.5 rounded border border-border font-medium">
                      {k.target || "—"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{k.measurement}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums w-10">{k.weight}%</span>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${k.weight}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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
