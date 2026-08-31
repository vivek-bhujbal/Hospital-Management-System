export default function DoctorLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading doctor portal">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  )
}
