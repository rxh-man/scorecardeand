import { ClipboardCheck, FileUp, ShieldCheck, Scale, Lock } from "lucide-react";

const STEPS = [
  { icon: ClipboardCheck, title: "Submit", desc: "Each role submits self-assessed KPI scores" },
  { icon: FileUp, title: "Upload Evidence", desc: "Attach supporting documents per KPI" },
  { icon: ShieldCheck, title: "Governance Review", desc: "Independent team reviews evidence & scores" },
  { icon: Scale, title: "Confirm or Adjust", desc: "Governance confirms or revises based on evidence" },
  { icon: Lock, title: "Finalized Scorecard", desc: "Final RAG-rated scorecard locked for the month" },
];

export function ProcessFlow() {
  return (
    <section className="no-print bg-white border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.18em] text-[#C0392B] font-semibold">
            Monthly Process
          </div>
          <h2 className="mt-2 text-xl md:text-2xl font-semibold text-[#1A1A1A] tracking-tight">
            How the scorecard cycle works
          </h2>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-0 relative">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const last = i === STEPS.length - 1;
            return (
              <li key={i} className="relative flex lg:flex-col items-start lg:items-center lg:text-center gap-3 lg:gap-2 lg:px-3">
                <div className="flex lg:flex-col items-center lg:items-center gap-3 lg:gap-2 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#C0392B] flex items-center justify-center text-[#C0392B] shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="hidden lg:block text-[10px] uppercase tracking-wider text-[#888888] font-semibold">
                    Step {i + 1}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1A1A1A]">{s.title}</div>
                  <div className="text-xs text-[#555555] mt-0.5 leading-relaxed max-w-[200px]">
                    {s.desc}
                  </div>
                </div>
                {!last && (
                  <div className="hidden lg:block absolute top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-px bg-[#E0E0E0]" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
