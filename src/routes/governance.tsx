import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type Submission,
  loadSubmissions,
  upsertSubmission,
  ragColor,
} from "@/lib/submissions";
import { loadCandidates, loadProjects, computeStats } from "@/lib/talent";
import { SiteNav } from "@/components/SiteNav";
import { Lock, ShieldCheck, FileText, Users } from "lucide-react";

export const Route = createFileRoute("/governance")({
  head: () => ({
    meta: [
      { title: "Governance Review — IoT Ops" },
      { name: "description", content: "Governance review and finalization of submitted scorecards." },
    ],
  }),
  component: GovernancePage,
});

function GovernancePage() {
  const [list, setList] = useState<Submission[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "finalized">("pending");
  const [candidates, setCandidates] = useState(() => [] as ReturnType<typeof loadCandidates>);
  const [projects, setProjects] = useState(() => [] as ReturnType<typeof loadProjects>);

  useEffect(() => {
    setList(loadSubmissions());
    setCandidates(loadCandidates());
    setProjects(loadProjects());
  }, []);

  const talent = useMemo(() => computeStats(candidates), [candidates]);
  const totalRequested = projects.reduce((s, p) => s + (p.requested || 0), 0);
  const totalSelectedProj = projects.reduce((s, p) => s + (p.selected || 0), 0);

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    if (filter === "pending") return list.filter((s) => s.status === "Pending Governance Review");
    return list.filter((s) => s.status === "Finalized");
  }, [list, filter]);

  const open = list.find((s) => s.id === openId) || null;

  const updateOpen = (next: Submission) => {
    upsertSubmission(next);
    setList(loadSubmissions());
  };

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#C0392B] font-semibold flex items-center gap-2">
              <ShieldCheck size={14} /> Governance
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-[#1A1A1A] tracking-tight">Review Queue</h1>
            <p className="text-sm text-[#555555] mt-1">Review submitted scorecards, confirm scores or apply adjustments based on evidence.</p>
          </div>
          <div className="flex gap-1">
            {(["pending", "finalized", "all"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={
                  "px-3 py-1.5 text-xs font-semibold rounded-md border " +
                  (filter === k
                    ? "bg-[#C0392B] text-white border-[#C0392B]"
                    : "bg-white text-[#555555] border-border hover:border-[#C0392B] hover:text-[#C0392B]")
                }
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {candidates.length > 0 && (
          <section className="mt-6 bg-white border border-[#E0E0E0] rounded-lg p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Users size={14} className="text-[#C0392B]" /> Talent Pool Snapshot
              </div>
              <Link to="/talent" className="text-xs text-[#C0392B] font-semibold hover:underline">
                View full talent pool →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-4">
              <Snap label="Talent Pool" value={talent.total} />
              <Snap label="TAQA" value={talent.byCompany.TAQA} />
              <Snap label="Etihad WE" value={talent.byCompany["Etihad WE"]} />
              <Snap label="Selected" value={talent.byStatus.Selected} accent />
              <Snap label="Projects · Req/Sel" value={`${totalRequested} / ${totalSelectedProj}`} />
            </div>
          </section>
        )}

        {filtered.length === 0 ? (
          <div className="mt-10 bg-white border border-dashed border-border rounded-lg p-12 text-center text-sm text-[#888888]">
            No submissions in this view. Submissions appear here after roles submit their scorecards.
          </div>
        ) : (
          <div className="mt-6 bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] border-b border-border text-[#555555]">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Role</th>
                  <th className="text-left font-semibold px-4 py-3">Submitter</th>
                  <th className="text-left font-semibold px-4 py-3">Cycle</th>
                  <th className="text-left font-semibold px-4 py-3">Submitted</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-right font-semibold px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id} className={"border-b border-border " + (idx % 2 === 0 ? "bg-white" : "bg-[#FDF5F5]")}>
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">{s.role}</td>
                    <td className="px-4 py-3 text-[#555555]">{s.submitter}</td>
                    <td className="px-4 py-3 text-[#555555]">{s.month}</td>
                    <td className="px-4 py-3 text-[#888888] text-xs">{new Date(s.submittedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setOpenId(s.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#C0392B] text-[#C0392B] rounded-md hover:bg-[#FDECEA]"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {open && (
        <ReviewDrawer
          submission={open}
          onClose={() => setOpenId(null)}
          onChange={updateOpen}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Submission["status"] }) {
  if (status === "Finalized") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E8F5EE] text-[#1E7E45] border border-[#9FD6B5]">
        <Lock size={11} /> Finalized
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FEF3E2] text-[#B5730E] border border-[#F1C98B]">
      Pending Review
    </span>
  );
}

function ReviewDrawer({
  submission,
  onClose,
  onChange,
}: {
  submission: Submission;
  onClose: () => void;
  onChange: (s: Submission) => void;
}) {
  const [local, setLocal] = useState<Submission>(submission);

  useEffect(() => setLocal(submission), [submission.id]);

  const update = (i: number, patch: Partial<Submission["entries"][number]>) => {
    setLocal((cur) => ({
      ...cur,
      entries: cur.entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  };

  const save = () => {
    onChange(local);
  };

  const finalize = () => {
    const next: Submission = {
      ...local,
      status: "Finalized",
      finalizedAt: new Date().toISOString(),
    };
    onChange(next);
    onClose();
  };

  const totalWeight = local.entries.reduce((s, e) => s + e.weight, 0) || 1;
  const finalScore = Math.round(
    local.entries.reduce((s, e) => {
      const score = e.reviewedScore ?? e.selfScore;
      return s + (score * e.weight) / totalWeight;
    }, 0),
  );

  const locked = local.status === "Finalized";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="text-xl font-semibold text-[#C0392B]">{local.role}</div>
            <div className="text-xs text-[#888888] mt-0.5">
              {local.submitter} · Cycle {local.month} · <StatusBadge status={local.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[#888888] font-semibold">Final score</div>
            <div className="text-2xl font-semibold tabular-nums text-[#1A1A1A]">{finalScore}</div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          {local.entries.map((e, i) => {
            const rc = ragColor(e.rag);
            return (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1A1A1A]">{e.kpi}</div>
                    <div className="text-xs text-[#888888] mt-0.5">
                      Target: <span className="text-[#C0392B] font-medium">{e.target}</span> · Weight {e.weight}%
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-0.5 text-xs font-semibold rounded-full border"
                    style={{ background: rc.bg, color: rc.fg, borderColor: rc.border }}
                  >
                    {e.rag}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                  <Box label="Actual" value={e.actual || "—"} />
                  <Box label="Self-score" value={String(e.selfScore)} />
                  <Box
                    label="Reviewed score"
                    value={
                      locked ? (
                        String(e.reviewedScore ?? e.selfScore)
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={e.reviewedScore ?? e.selfScore}
                          onChange={(ev) =>
                            update(i, { reviewedScore: Math.max(0, Math.min(100, Number(ev.target.value) || 0)) })
                          }
                          className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:border-[#C0392B]"
                        />
                      )
                    }
                  />
                </div>

                {e.comment && (
                  <div className="mt-3 text-xs text-[#555555]">
                    <span className="font-semibold text-[#888888] uppercase tracking-wide">Submitter note: </span>
                    {e.comment}
                  </div>
                )}

                {e.evidence.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wide text-[#888888] font-semibold mb-1">Evidence</div>
                    <ul className="flex flex-wrap gap-2">
                      {e.evidence.map((f, j) => (
                        <li key={j} className="inline-flex items-center gap-1 text-xs bg-[#FAFAFA] border border-border rounded px-2 py-1 text-[#555555]">
                          <FileText size={12} /> {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <label className="block text-[10px] uppercase tracking-wide text-[#888888] font-semibold mb-1">
                    Reviewer note {locked ? "" : "(reason for adjustment)"}
                  </label>
                  {locked ? (
                    <div className="text-xs text-[#1A1A1A] bg-[#FAFAFA] border border-border rounded px-2 py-1.5 min-h-[28px]">
                      {e.reviewerNote || "—"}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={e.reviewerNote || ""}
                      onChange={(ev) => update(i, { reviewerNote: ev.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:border-[#C0392B] resize-none"
                      placeholder="Confirm or describe the adjustment rationale…"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-border rounded-md text-[#555555] hover:bg-[#FAFAFA]"
          >
            Close
          </button>
          {!locked && (
            <>
              <button
                onClick={save}
                className="px-4 py-2 text-sm font-semibold bg-white border border-[#C0392B] text-[#C0392B] rounded-md hover:bg-[#FDECEA]"
              >
                Save changes
              </button>
              <button
                onClick={finalize}
                className="px-5 py-2 text-sm font-semibold bg-[#C0392B] text-white rounded-md hover:bg-[#A53224] inline-flex items-center gap-2"
              >
                <Lock size={14} /> Finalize Scorecard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-[#FAFAFA] border border-border rounded p-2">
      <div className="text-[10px] uppercase tracking-wide text-[#888888] font-semibold">{label}</div>
      <div className="text-sm text-[#1A1A1A] mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function Snap({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={"rounded-md border p-3 " + (accent ? "border-[#C0392B] bg-[#FDECEA]" : "border-[#E0E0E0]")}>
      <div className="text-[10px] uppercase tracking-wide text-[#888888] font-semibold">{label}</div>
      <div className={"text-xl tabular-nums font-semibold mt-0.5 " + (accent ? "text-[#C0392B]" : "text-[#1A1A1A]")}>{value}</div>
    </div>
  );
}
