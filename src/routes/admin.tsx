import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import {
  parseExcel,
  loadCandidates,
  saveCandidates,
  loadProjects,
  saveProjects,
  computeStats,
  type Candidate,
  type Company,
  type Project,
} from "@/lib/talent";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — IoT Ops Scorecard" },
      { name: "description", content: "Upload screening data and manage project resource requests." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [msg, setMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCandidates(loadCandidates());
    setProjects(loadProjects());
  }, []);

  async function handleUpload(file: File) {
    try {
      const list = await parseExcel(file);
      if (!list.length) {
        setMsg("No rows parsed. Check the file headers (SN, EMP ID, CANDIDATE NAME, COMPANY, …).");
        return;
      }
      saveCandidates(list);
      setCandidates(list);
      setMsg(`Imported ${list.length} candidates from ${file.name}.`);
    } catch (e: any) {
      setMsg("Failed to parse: " + (e?.message || String(e)));
    }
  }

  function addProject() {
    const p: Project = {
      id: crypto.randomUUID(),
      name: "New Project",
      company: "TAQA",
      requested: 0,
      selected: 0,
      notes: "",
      createdAt: new Date().toISOString(),
    };
    const next = [p, ...projects];
    setProjects(next);
    saveProjects(next);
  }
  function updateProject(id: string, patch: Partial<Project>) {
    const next = projects.map((p) => (p.id === id ? { ...p, ...patch } : p));
    setProjects(next);
    saveProjects(next);
  }
  function removeProject(id: string) {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    saveProjects(next);
  }
  function clearAll() {
    if (!confirm("Clear all uploaded candidates?")) return;
    saveCandidates([]);
    setCandidates([]);
    setMsg("Candidates cleared.");
  }

  const stats = computeStats(candidates);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-[28px] font-semibold text-[#1A1A1A] tracking-tight">Admin Portal</h1>
        <p className="text-sm text-[#555555] mt-2">
          Upload the screening Excel and configure resource requests per project for story telling.
        </p>

        {/* Upload */}
        <section className="mt-6 bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="text-sm font-semibold text-[#1A1A1A]">1 · Upload screening file</div>
          <div className="text-xs text-[#888888] mt-1">
            Expected columns: SN, EMP ID, CANDIDATE NAME, COMPANY, INTERVIEW DATE, ATTENDANCE, TECHNICAL
            KNOWLEDGE, COMMUNICATION SKILL, DRIVING LICENCE, DESIGNATION, RECOMMENDED FOR, FINAL STATUS,
            REMARKS.
          </div>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
              className="text-sm"
            />
            {candidates.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs font-medium bg-white text-[#C0392B] border border-[#C0392B] rounded-md hover:bg-[#FDECEA]"
              >
                Clear data
              </button>
            )}
            {msg && <span className="text-xs text-[#555555]">{msg}</span>}
          </div>

          {candidates.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-4 mt-5">
              <Mini label="Talent Pool" value={stats.total} />
              <Mini label="TAQA" value={stats.byCompany.TAQA} />
              <Mini label="Etihad WE" value={stats.byCompany["Etihad WE"]} />
              <Mini label="Selected" value={stats.byStatus.Selected} />
            </div>
          )}
        </section>

        {/* Projects */}
        <section className="mt-6 bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1A1A1A]">2 · Resource requests by project</div>
              <div className="text-xs text-[#888888] mt-1">
                Capture how many resources each project requested vs how many were finally selected.
              </div>
            </div>
            <button
              onClick={addProject}
              className="px-3 py-1.5 text-sm font-medium bg-[#C0392B] text-white rounded-md hover:bg-[#A93226]"
            >
              + Add project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="mt-5 text-sm text-[#888888]">No projects yet — add one to start the story.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] text-[#555555]">
                  <tr>
                    <th className="text-left font-semibold px-2 py-2">Project Name</th>
                    <th className="text-left font-semibold px-2 py-2">Client</th>
                    <th className="text-right font-semibold px-2 py-2 w-28">Requested</th>
                    <th className="text-right font-semibold px-2 py-2 w-28">Selected</th>
                    <th className="text-left font-semibold px-2 py-2">Notes</th>
                    <th className="px-2 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-[#E0E0E0]">
                      <td className="px-2 py-2">
                        <input
                          value={p.name}
                          onChange={(e) => updateProject(p.id, { name: e.target.value })}
                          className="w-full px-2 py-1 border border-[#E0E0E0] rounded focus:outline-none focus:border-[#C0392B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={p.company}
                          onChange={(e) => updateProject(p.id, { company: e.target.value as Company })}
                          className="px-2 py-1 border border-[#E0E0E0] rounded focus:outline-none focus:border-[#C0392B]"
                        >
                          <option>TAQA</option>
                          <option>Etihad WE</option>
                          <option>Other</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={p.requested}
                          onChange={(e) => updateProject(p.id, { requested: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-right border border-[#E0E0E0] rounded focus:outline-none focus:border-[#C0392B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={p.selected}
                          onChange={(e) => updateProject(p.id, { selected: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-right border border-[#E0E0E0] rounded focus:outline-none focus:border-[#C0392B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={p.notes}
                          onChange={(e) => updateProject(p.id, { notes: e.target.value })}
                          placeholder="optional"
                          className="w-full px-2 py-1 border border-[#E0E0E0] rounded focus:outline-none focus:border-[#C0392B]"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => removeProject(p.id)}
                          className="text-[#C0392B] hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E0E0E0] font-medium">
                    <td className="px-2 py-2 text-right" colSpan={2}>Totals</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {projects.reduce((s, p) => s + (p.requested || 0), 0)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {projects.reduce((s, p) => s + (p.selected || 0), 0)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#E0E0E0] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[#888888] font-medium">{label}</div>
      <div className="text-xl font-semibold text-[#1A1A1A] tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
