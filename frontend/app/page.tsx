import { ArrowRight, FileCheck2, GraduationCap, QrCode } from "lucide-react";
import { StatusPill } from "../components/status-pill";

const documents = [
  { name: "WAEC", status: "Uploaded", tone: "pending" as const },
  { name: "JAMB", status: "Missing", tone: "rejected" as const },
  { name: "Admission Letter", status: "Verified", tone: "verified" as const }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium text-brand">ScanMark OS</p>
            <h1 className="text-xl font-semibold tracking-normal text-ink">Student dashboard</h1>
          </div>
          <StatusPill tone="pending">Pending</StatusPill>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-5 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Departmental registration</h2>
              <p className="mt-1 text-sm text-slate-600">Complete missing documents before departmental review.</p>
            </div>
            <FileCheck2 className="h-5 w-5 text-brand" />
          </div>
          <button className="mt-4 inline-flex items-center gap-2 rounded bg-brand px-3 py-2 text-sm font-medium text-white">
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-5 divide-y divide-line">
            {documents.map((document) => (
              <div key={document.name} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-ink">{document.name}</span>
                <StatusPill tone={document.tone}>{document.status}</StatusPill>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">This semester</h2>
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <dt className="text-xs text-slate-500">Courses</dt>
                <dd className="text-lg font-semibold text-ink">8</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Attendance</dt>
                <dd className="text-lg font-semibold text-ink">82%</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">GPA</dt>
                <dd className="text-lg font-semibold text-ink">4.12</dd>
              </div>
            </dl>
          </div>

          <div className="rounded border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Attendance</h2>
              <QrCode className="h-5 w-5 text-brand" />
            </div>
            <p className="mt-2 text-sm text-slate-600">Offline records sync automatically when network returns.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
