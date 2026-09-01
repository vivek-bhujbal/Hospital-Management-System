export default function DashboardCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div className="hms-card p-5">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}
