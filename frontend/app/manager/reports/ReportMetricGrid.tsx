'use client'

import { ArrowUpRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import {
  ManagerAppointment,
  ManagerBill,
  ManagerPatient,
  ManagerStaff,
  shortTime,
  statusLabel,
} from '@/lib/managerTypes'

type DetailKey =
  | 'appointments'
  | 'new_patients'
  | 'completed'
  | 'cancelled'
  | 'pending_bills'
  | 'paid_bills'
  | 'active_staff'
  | 'available_staff'

interface ReportMetricGridProps {
  reportDate: string
  appointments: ManagerAppointment[]
  newPatients: ManagerPatient[]
  bills: ManagerBill[]
  staff: ManagerStaff[]
}

function EmptyDetails({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">{message}</div>
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table></div>
}

export default function ReportMetricGrid({ reportDate, appointments, newPatients, bills, staff }: ReportMetricGridProps) {
  const [selected, setSelected] = useState<DetailKey | null>(null)
  const close = useCallback(() => setSelected(null), [])
  const currency = useMemo(() => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }), [])
  const completed = appointments.filter((appointment) => appointment.status === 'completed')
  const cancelled = appointments.filter((appointment) => appointment.status === 'cancelled')
  const pendingBills = bills.filter((bill) => bill.status === 'pending')
  const paidBills = bills.filter((bill) => bill.status === 'paid')
  const activeStaff = staff.filter((member) => member.status === 'active')
  const availableStaff = staff.filter((member) => member.availability === 'Available')
  const metrics: { key: DetailKey; label: string; value: number }[] = [
    { key: 'appointments', label: 'Appointments that day', value: appointments.length },
    { key: 'new_patients', label: 'New patients that day', value: newPatients.length },
    { key: 'completed', label: 'Completed that day', value: completed.length },
    { key: 'cancelled', label: 'Cancelled that day', value: cancelled.length },
    { key: 'pending_bills', label: 'Pending appt. bills', value: pendingBills.length },
    { key: 'paid_bills', label: 'Paid appt. bills', value: paidBills.length },
    { key: 'active_staff', label: 'Active staff', value: activeStaff.length },
    { key: 'available_staff', label: 'Available now', value: availableStaff.length },
  ]
  const activeMetric = metrics.find((metric) => metric.key === selected)

  const appointmentDetails = (items: ManagerAppointment[]) => items.length === 0
    ? <EmptyDetails message="No matching appointments for this date." />
    : <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Appointment</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Status</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{items.map((appointment) => <tr key={appointment.id}><td className="px-4 py-3 font-semibold text-slate-900">#{appointment.id}</td><td className="px-4 py-3"><p className="font-medium text-slate-900">{appointment.patient_name}</p><p className="text-xs text-slate-500">Patient #{appointment.patient_id}</p></td><td className="px-4 py-3"><p className="text-slate-800">{appointment.doctor_name}</p><p className="text-xs text-slate-500">{appointment.department_name || 'No department'}</p></td><td className="whitespace-nowrap px-4 py-3 text-slate-700">{appointment.appt_date} · {shortTime(appointment.appt_time)}</td><td className="px-4 py-3 capitalize text-slate-700">{statusLabel(appointment.status)}</td></tr>)}</tbody>
    </Table>

  const billDetails = (items: ManagerBill[]) => items.length === 0
    ? <EmptyDetails message="No matching appointment bills for this date." />
    : <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Bill</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Appointment</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{items.map((bill) => <tr key={bill.id}><td className="px-4 py-3 font-semibold text-slate-900">#{bill.id}</td><td className="px-4 py-3"><p className="font-medium text-slate-900">{bill.patient_name}</p><p className="text-xs text-slate-500">Patient #{bill.patient_id}</p></td><td className="px-4 py-3 text-slate-700">#{bill.appointment_id}</td><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{currency.format(Number(bill.amount))}</td><td className="px-4 py-3 capitalize text-slate-700"><p>{bill.status}</p><p className="text-xs text-slate-500">{bill.payment_method ? bill.payment_method.toUpperCase() : 'Not collected'}</p></td></tr>)}</tbody>
    </Table>

  const staffDetails = (items: ManagerStaff[]) => items.length === 0
    ? <EmptyDetails message="No matching staff members." />
    : <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3">Availability</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{items.map((member) => <tr key={member.id}><td className="px-4 py-3 font-semibold text-slate-900">{member.name}</td><td className="px-4 py-3 capitalize text-slate-700">{statusLabel(member.role)}</td><td className="px-4 py-3 text-slate-700">{member.designation || 'Not recorded'}</td><td className="whitespace-nowrap px-4 py-3 text-slate-700">{member.shift_start || member.shift_end ? `${shortTime(member.shift_start)} – ${shortTime(member.shift_end)}` : 'Not assigned'}</td><td className="px-4 py-3 text-slate-700">{member.availability}</td></tr>)}</tbody>
    </Table>

  const details = () => {
    switch (selected) {
      case 'appointments': return appointmentDetails(appointments)
      case 'completed': return appointmentDetails(completed)
      case 'cancelled': return appointmentDetails(cancelled)
      case 'pending_bills': return billDetails(pendingBills)
      case 'paid_bills': return billDetails(paidBills)
      case 'active_staff': return staffDetails(activeStaff)
      case 'available_staff': return staffDetails(availableStaff)
      case 'new_patients': return newPatients.length === 0
        ? <EmptyDetails message="No patients were registered on this date." />
        : <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Demographics</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Appointments</th><th className="px-4 py-3">Registered</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{newPatients.map((patient) => <tr key={patient.id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{patient.name}</p><p className="text-xs text-slate-500">Patient #{patient.id}</p></td><td className="px-4 py-3 capitalize text-slate-700">{patient.age === null ? 'Age not recorded' : `${patient.age} years`} · {patient.gender || 'Not recorded'}</td><td className="px-4 py-3 text-slate-700">{patient.contact || 'Not provided'}</td><td className="px-4 py-3 text-slate-700">{patient.appointment_count}</td><td className="whitespace-nowrap px-4 py-3 text-slate-700">{new Date(patient.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody>
        </Table>
      default: return null
    }
  }

  return <>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
      {metrics.map((metric) => <button key={metric.key} type="button" onClick={() => setSelected(metric.key)} className="group min-h-32 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2" aria-label={`View details for ${metric.label}`} aria-haspopup="dialog">
        <span className="flex items-start justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{metric.label}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600" /></span>
        <span className="mt-3 block text-2xl font-bold text-slate-900">{metric.value}</span>
        <span className="mt-2 block text-xs font-medium text-slate-400 group-hover:text-emerald-700">View details</span>
      </button>)}
    </div>
    <Modal open={selected !== null} title={`${activeMetric?.label || 'Report'} details`} description={selected === 'active_staff' || selected === 'available_staff' ? 'Current hospital staffing status.' : `Records for ${reportDate}.`} onClose={close} size="lg" footer={<button type="button" onClick={close} className="hms-button hms-button-secondary">Close</button>}>
      {details()}
    </Modal>
  </>
}
