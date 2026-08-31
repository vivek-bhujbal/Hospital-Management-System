import { fetchAPI } from '@/lib/api'
import {
  localDateValue,
  ManagerDailyReport,
  ManagerDepartmentStats,
  ManagerDoctorWorkload,
  ManagerStaff,
} from '@/lib/managerTypes'

export default async function ManagerReports({ searchParams }: { searchParams: { date?: string } }) {
  const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || '') ? searchParams.date! : localDateValue()
  const [report, doctors, departments, staff] = await Promise.all([
    fetchAPI(`/manager/reports?target_date=${reportDate}`) as Promise<ManagerDailyReport>,
    fetchAPI('/manager/analytics/doctors') as Promise<ManagerDoctorWorkload[]>,
    fetchAPI('/manager/analytics/departments') as Promise<ManagerDepartmentStats[]>,
    fetchAPI('/manager/staff') as Promise<ManagerStaff[]>,
  ])
  const availableStaff = staff.filter((member) => member.availability === 'Available').length
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Performance monitoring</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Operational Reports</h1>
          <p className="mt-1 text-slate-600">Read-only appointment, patient, workload, department, staff, and revenue summaries.</p>
        </div>
        <form method="get" className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-sm font-medium text-slate-700">Report date<input type="date" name="date" defaultValue={reportDate} className="ml-3 rounded-lg border border-slate-300 px-3 py-2" /></label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ['Appointments', report.appointment_count],
          ['New patients', report.patient_count],
          ['Completed', report.completed_consultations],
          ['Cancelled', report.cancelled_appointments],
          ['Pending bills', report.pending_bills],
          ['Paid bills', report.paid_bills],
          ['Active staff', staff.filter((member) => member.status === 'active').length],
          ['Available now', availableStaff],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>
        ))}
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Collected revenue summary</p>
        <p className="mt-2 text-3xl font-bold text-emerald-900">{currency.format(Number(report.revenue_summary))}</p>
        <p className="mt-1 text-sm text-emerald-800">Read-only. Payment collection and transaction controls are not available to Hospital Managers.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Doctor workload</h2></div>
          {doctors.length === 0 ? <p className="p-8 text-center text-slate-500">No doctor workload data.</p> : (
            <div className="divide-y divide-slate-100">{doctors.map((doctor) => <div key={doctor.doctor_id} className="grid grid-cols-3 gap-3 px-6 py-4 text-sm"><p className="font-semibold text-slate-900">{doctor.name}</p><p className="text-slate-700">Pending: {doctor.appointments_pending}</p><p className="text-slate-700">Completed: {doctor.appointments_completed}</p></div>)}</div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Department performance</h2></div>
          {departments.length === 0 ? <p className="p-8 text-center text-slate-500">No department data.</p> : (
            <div className="divide-y divide-slate-100">{departments.map((department) => <div key={department.department_id} className="grid grid-cols-3 gap-3 px-6 py-4 text-sm"><p className="font-semibold text-slate-900">{department.name}</p><p className="text-slate-700">Doctors: {department.doctor_count}</p><p className="text-slate-700">Appointments: {department.appointment_count}</p></div>)}</div>
          )}
        </section>
      </div>
    </div>
  )
}
