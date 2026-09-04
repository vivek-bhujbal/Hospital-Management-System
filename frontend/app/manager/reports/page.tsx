import { fetchAPI } from '@/lib/api'
import {
  ManagerAppointment,
  ManagerBill,
  ManagerDailyReport,
  ManagerDepartmentStats,
  ManagerDoctorWorkload,
  ManagerPatient,
  ManagerStaff,
} from '@/lib/managerTypes'
import ReportMetricGrid from './ReportMetricGrid'

export default async function ManagerReports({ searchParams }: { searchParams: { date?: string } }) {
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || '') ? searchParams.date! : null
  const report = await fetchAPI(requestedDate ? `/manager/reports?target_date=${requestedDate}` : '/manager/reports') as ManagerDailyReport
  const reportDate = report.date
  const [appointments, newPatients, bills, doctors, departments, staff] = await Promise.all([
    fetchAPI(`/manager/appointments?target_date=${reportDate}`) as Promise<ManagerAppointment[]>,
    fetchAPI(`/manager/patients?registered_on=${reportDate}`) as Promise<ManagerPatient[]>,
    fetchAPI(`/manager/bills?target_date=${reportDate}`) as Promise<ManagerBill[]>,
    fetchAPI(`/manager/analytics/doctors?target_date=${reportDate}`) as Promise<ManagerDoctorWorkload[]>,
    fetchAPI(`/manager/analytics/departments?target_date=${reportDate}`) as Promise<ManagerDepartmentStats[]>,
    fetchAPI('/manager/staff') as Promise<ManagerStaff[]>,
  ])
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Selected date: {report.date}</h2>
        <ReportMetricGrid reportDate={reportDate} appointments={appointments} newPatients={newPatients} bills={bills} staff={staff} />
      </section>

      <section className="grid gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Revenue collected on {report.date}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{currency.format(Number(report.revenue_summary))}</p>
        </div>
        <div className="border-t border-emerald-200 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Total collected revenue</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{currency.format(Number(report.total_revenue_summary))}</p>
          <p className="mt-1 text-sm text-emerald-800">{report.total_paid_bills} paid bills across {report.total_completed_consultations} completed of {report.total_appointment_count} appointments.</p>
        </div>
        <p className="text-sm text-emerald-800 md:col-span-2">Read-only. Payment collection and transaction controls are not available to Hospital Managers.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Doctor workload on {report.date}</h2></div>
          {doctors.length === 0 ? <p className="p-8 text-center text-slate-500">No doctor workload data.</p> : (
            <div className="divide-y divide-slate-100">{doctors.map((doctor) => <div key={doctor.doctor_id} className="grid grid-cols-3 gap-3 px-6 py-4 text-sm"><p className="font-semibold text-slate-900">{doctor.name}</p><p className="text-slate-700">Pending: {doctor.appointments_pending}</p><p className="text-slate-700">Completed: {doctor.appointments_completed}</p></div>)}</div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Department performance on {report.date}</h2></div>
          {departments.length === 0 ? <p className="p-8 text-center text-slate-500">No department data.</p> : (
            <div className="divide-y divide-slate-100">{departments.map((department) => <div key={department.department_id} className="grid grid-cols-3 gap-3 px-6 py-4 text-sm"><p className="font-semibold text-slate-900">{department.name}</p><p className="text-slate-700">Doctors: {department.doctor_count}</p><p className="text-slate-700">Appointments: {department.appointment_count}</p></div>)}</div>
          )}
        </section>
      </div>
    </div>
  )
}
