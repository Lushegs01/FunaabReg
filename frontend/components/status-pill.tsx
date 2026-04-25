type Tone = "pending" | "verified" | "rejected" | "draft";

const toneClass: Record<Tone, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
