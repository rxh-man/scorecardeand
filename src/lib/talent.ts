// Talent pool store — localStorage; client-side Excel parse via xlsx (SheetJS)
import * as XLSX from "xlsx";

export type Company = "TAQA" | "Etihad WE" | "Other";
export type FinalStatus = "Selected" | "Not Selected" | "Waiting List" | "Unknown";

export interface Candidate {
  sn: number | string;
  empId: string;
  name: string;
  company: Company;
  interviewDate: string;
  attendance: string;
  technical: string;
  communication: string;
  drivingLicence: string;
  designation: string;
  recommendedFor: string;
  finalStatus: FinalStatus;
  remarks: string;
}

export interface Project {
  id: string;
  name: string;
  company: Company;
  requested: number; // resources requested
  selected: number; // resources selected (manual or derived)
  notes: string;
  createdAt: string;
}

const CANDIDATES_KEY = "iot-talent-candidates-v1";
const PROJECTS_KEY = "iot-talent-projects-v1";

export function loadCandidates(): Candidate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CANDIDATES_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveCandidates(list: Candidate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CANDIDATES_KEY, JSON.stringify(list));
}
export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveProjects(list: Project[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

function normCompany(v: any): Company {
  const s = String(v || "").trim().toLowerCase();
  if (s.includes("taqa")) return "TAQA";
  if (s.includes("etihad")) return "Etihad WE";
  return "Other";
}
function normStatus(v: any): FinalStatus {
  const s = String(v || "").trim().toLowerCase();
  if (s === "selected") return "Selected";
  if (s.startsWith("not")) return "Not Selected";
  if (s.includes("wait")) return "Waiting List";
  return "Unknown";
}
function fmtDate(v: any): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export async function parseExcel(file: File): Promise<Candidate[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows.map((r) => ({
    sn: r["SN"] ?? "",
    empId: String(r["EMP ID"] ?? "").trim(),
    name: String(r["CANDIDATE NAME"] ?? "").trim(),
    company: normCompany(r["COMPANY"]),
    interviewDate: fmtDate(r["INTERVIEW DATE"]),
    attendance: String(r["ATTENDANCE"] ?? "").trim(),
    technical: String(r["TECHNICAL KNOWLEDGE"] ?? "").trim(),
    communication: String(r["COMMUNICATION SKILL"] ?? "").trim(),
    drivingLicence: String(r["DRIVING LICENCE"] ?? r["DRIVING LICENSE"] ?? "").trim(),
    designation: String(r["DESIGNATION"] ?? "").trim(),
    recommendedFor: String(r["RECOMMENDED FOR"] ?? "").trim(),
    finalStatus: normStatus(r["FINAL STATUS"]),
    remarks: String(r["REMARKS"] ?? "").trim(),
  })).filter((c) => c.name);
}

export interface TalentStats {
  total: number;
  byCompany: Record<Company, number>;
  byStatus: Record<FinalStatus, number>;
  selectedByCompany: Record<Company, number>;
}

export function computeStats(candidates: Candidate[]): TalentStats {
  const stats: TalentStats = {
    total: candidates.length,
    byCompany: { TAQA: 0, "Etihad WE": 0, Other: 0 },
    byStatus: { Selected: 0, "Not Selected": 0, "Waiting List": 0, Unknown: 0 },
    selectedByCompany: { TAQA: 0, "Etihad WE": 0, Other: 0 },
  };
  for (const c of candidates) {
    stats.byCompany[c.company]++;
    stats.byStatus[c.finalStatus]++;
    if (c.finalStatus === "Selected") stats.selectedByCompany[c.company]++;
  }
  return stats;
}
