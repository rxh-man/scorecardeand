import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { scorecardData, ROLES } from "@/data/scorecard";
import {
  type KpiEntry,
  type RAG,
  type Submission,
  currentMonth,
  loadSubmissions,
  upsertSubmission,
  ragColor,
} from "@/lib/submissions";
import { SiteNav } from "@/components/SiteNav";
import { CheckCircle2, Upload, X } from "lucide-react";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Scorecard — IoT Ops" },
      { name: "description", content: "Submit your monthly KPI scorecard for governance review." },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const [role, setRole] = useState<string | null>(null);
  const [submitter, setSubmitter] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  const startForRole = (r: string) => {
    const existing = loadSubmissions().find(
      (s) => s.role === r && s.month === month,
    );
    if (existing) {
      setEntries(existing.entries);
      setSubmitter(existing.submitter);
    } else {
      const items = scorecardData.filter((e) => e.role === r);
      setEntries(
        items.map((i) => ({
          kpi: i.kpi,
          target: i.target,
          weight: i.weight,
          actual: "",
          selfScore: 0,
          rag: "Amber" as RAG,
          comment: "",
          evidence: [],
        })),
      );
    }
    setRole(r);
    setSubmitted(null);
  };

const scoreToRag = (score: number): RAG =>
  score >= 80 ? "Green" : score >= 50 ? "Amber" : "Red";

  const updateEntry = (i: number, patch: Partial<KpiEntry>) => {
    setEntries((cur) =>
      cur.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, ...patch };
        if (patch.selfScore !== undefined) next.rag = scoreToRag(next.selfScore);
        return next;
      }),
    );
  };

  const handleSubmit = () => {
    if (!role || !submitter.trim()) return;
    const sub: Submission = {
      id: `${role}-${month}-${Date.now()}`,
      role,
      submitter: submitter.trim(),
      month,
      submittedAt: new Date().toISOString(),
      status: "Pending Governance Review",
      entries,
    };
    upsertSubmission(sub);
    setSubmitted(sub);
  };

  const weightedScore = useMemo(() => {
    const total = entries.reduce((s, e) => s + e.weight, 0) || 1;
    return Math.round(
      entries.reduce((s, e) => s + (e.selfScore * e.weight) / total, 0),
    );
  }, [entries]);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!role ? (
          <>
            <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">Submit Monthly Scorecard</h1>
            <p className="text-sm text-[#555555] mt-1">Select your role to begin. Your KPIs will be pre-loaded.</p>

            <div className="mt-6 flex items-center gap-3">
              <label className="text-xs uppercase tracking-wide text-[#888888] font-semibold">Cycle</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B]"
              />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((r) => {
                const kpiCount = scorecardData.filter((e) => e.role === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => startForRole(r)}
                    className="text-left bg-white border border-border rounded-lg p-4 hover:border-[#C0392B] hover:shadow-[0_4px_12px_rgba(192,57,43,0.08)] transition-all"
                  >
                    <div className="font-semibold text-[#1A1A1A] text-sm">{r}</div>
                    <div className="text-xs text-[#888888] mt-1">{kpiCount} KPIs</div>
                  </button>
                );
              })}
            </div>
          </>
        ) : submitted ? (
          <SubmittedAck submission={submitted} onNew={() => { setRole(null); setSubmitted(null); }} />
        ) : (
          <>
            <button
              onClick={() => setRole(null)}
              className="text-xs text-[#555555] hover:text-[#C0392B] mb-4"
            >
              ← Change role
            </button>

            <div className="bg-white border border-border rounded-lg p-5 mb-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-[#C0392B] tracking-tight">{role}</div>
                  <div className="text-xs text-[#888888] mt-1">Cycle {month}</div>
                </div>
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-[#888888] font-semibold mb-1">Submitter</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={submitter}
                      onChange={(e) => setSubmitter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B] w-52"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-[#888888] font-semibold">Weighted self-score</div>
                    <div className="text-2xl font-semibold tabular-nums text-[#1A1A1A]">{weightedScore}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {entries.map((e, i) => (
                <KpiCard key={i} entry={e} onChange={(p) => updateEntry(i, p)} />
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
              <Link
                to="/"
                className="px-4 py-2 text-sm font-medium border border-border rounded-md text-[#555555] hover:bg-[#FAFAFA] text-center"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={!submitter.trim()}
                className="px-5 py-2 text-sm font-semibold bg-[#C0392B] text-white rounded-md hover:bg-[#A53224] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit for Governance Review
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({ entry, onChange }: { entry: KpiEntry; onChange: (p: Partial<KpiEntry>) => void }) {
  const rc = ragColor(entry.rag);
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#1A1A1A]">{entry.kpi}</div>
          <div className="text-xs text-[#888888] mt-1">
            Target: <span className="text-[#C0392B] font-medium">{entry.target}</span> · Weight {entry.weight}%
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Actual">
          <input
            type="text"
            value={entry.actual}
            onChange={(e) => onChange({ actual: e.target.value })}
            placeholder="e.g. 95%"
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B]"
          />
        </Field>
        <Field label="Self-score (0–100)">
          <input
            type="number"
            min={0}
            max={100}
            value={entry.selfScore}
            onChange={(e) => onChange({ selfScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B]"
          />
        </Field>
        <Field label="RAG (auto)">
          <div
            className="px-3 py-1.5 text-xs font-semibold rounded-md border text-center"
            style={{ background: rc.bg, color: rc.fg, borderColor: rc.border }}
          >
            {entry.rag} · {entry.selfScore}/100
          </div>
        </Field>
      </div>


      <div className="mt-3">
        <Field label="Comment">
          <textarea
            value={entry.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
            rows={2}
            placeholder="Notes, context, blockers…"
            className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-[#C0392B] resize-none"
          />
        </Field>
      </div>

      <div className="mt-3">
        <label className="block text-xs uppercase tracking-wide text-[#888888] font-semibold mb-1">
          Supporting Evidence
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-dashed border-[#C0392B] text-[#C0392B] rounded-md cursor-pointer hover:bg-[#FDECEA]">
          <Upload size={14} />
          Attach files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
              onChange({ evidence: [...entry.evidence, ...files] });
              e.target.value = "";
            }}
          />
        </label>
        {entry.evidence.length > 0 && (
          <ul className="mt-2 space-y-1">
            {entry.evidence.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-xs bg-[#FAFAFA] border border-border rounded px-2 py-1">
                <span className="text-[#1A1A1A] truncate">{f.name}</span>
                <button
                  onClick={() => onChange({ evidence: entry.evidence.filter((_, j) => j !== i) })}
                  className="text-[#888888] hover:text-[#C0392B] ml-2"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-[#888888] font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}

function SubmittedAck({ submission, onNew }: { submission: Submission; onNew: () => void }) {
  return (
    <div className="bg-white border border-border rounded-lg p-10 text-center max-w-xl mx-auto">
      <CheckCircle2 className="mx-auto text-[#27AE60]" size={48} />
      <h2 className="mt-4 text-xl font-semibold text-[#1A1A1A]">Submitted for Governance Review</h2>
      <p className="mt-2 text-sm text-[#555555]">
        {submission.role} · Cycle {submission.month}
      </p>
      <div className="mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#FEF3E2] text-[#B5730E] border border-[#F1C98B]">
        Pending Governance Review
      </div>
      <div className="mt-6 flex gap-2 justify-center">
        <button
          onClick={onNew}
          className="px-4 py-2 text-sm font-medium border border-border rounded-md text-[#555555] hover:bg-[#FAFAFA]"
        >
          Submit another
        </button>
        <Link
          to="/governance"
          className="px-4 py-2 text-sm font-semibold bg-[#C0392B] text-white rounded-md hover:bg-[#A53224]"
        >
          View governance queue
        </Link>
      </div>
    </div>
  );
}
