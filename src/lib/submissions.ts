// LocalStorage-backed submission store (no backend; GitHub Pages friendly)

export type RAG = "Red" | "Amber" | "Green";
export type SubmissionStatus = "Pending Governance Review" | "Finalized";

export interface KpiEntry {
  kpi: string;
  target: string;
  weight: number;
  actual: string;
  selfScore: number; // 0-100
  rag: RAG;
  comment: string;
  evidence: { name: string; size: number }[];
  // Governance overrides
  reviewedScore?: number;
  reviewerNote?: string;
}

export interface Submission {
  id: string;
  role: string;
  submitter: string;
  month: string; // YYYY-MM
  submittedAt: string;
  status: SubmissionStatus;
  entries: KpiEntry[];
  finalizedAt?: string;
}

const KEY = "iot-scorecard-submissions-v1";

export function loadSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSubmissions(list: Submission[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertSubmission(s: Submission) {
  const list = loadSubmissions();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  saveSubmissions(list);
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ragColor(r: RAG): { bg: string; fg: string; border: string } {
  if (r === "Green") return { bg: "#E8F5EE", fg: "#1E7E45", border: "#9FD6B5" };
  if (r === "Amber") return { bg: "#FEF3E2", fg: "#B5730E", border: "#F1C98B" };
  return { bg: "#FDECEA", fg: "#C0392B", border: "#F1B0A8" };
}
