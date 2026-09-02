'use client'

import { Eye, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import {
  dateValue,
  ReceptionAppointment,
  ReceptionDoctor,
  ReceptionPatient,
  shortTime,
} from '@/lib/receptionistTypes'

interface PatientDirectoryProps {
  patients: ReceptionPatient[]
  appointments: ReceptionAppointment[]
  doctors: ReceptionDoctor[]
}

export default function PatientDirectory({ patients, appointments, doctors }: PatientDirectoryProps) {
  const [query, setQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<ReceptionPatient | null>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.name]))

  const filteredPatients = useMemo(() => patients.filter((patient) => {
    if (!normalizedQuery) return true
    return patient.name.toLowerCase().includes(normalizedQuery)
      || (patient.contact || '').toLowerCase().includes(normalizedQuery)
      || String(patient.id).includes(normalizedQuery.replace(/^#/, ''))
  }), [normalizedQuery, patients])

  function nextAppointment(patientId: number) {
    return appointments
      .filter((appointment) => appointment.patient_id === patientId
        && appointment.appt_date >= dateValue()
        && !['cancelled', 'completed'].includes(appointment.status))
      .sort((left, right) => `${left.appt_date}${left.appt_time}`.localeCompare(`${right.appt_date}${right.appt_time}`))[0]
  }

  const selectedAppointments = selectedPatient
    ? appointments
      .filter((appointment) => appointment.patient_id === selectedPatient.id)
      .sort((left, right) => `${right.appt_date}${right.appt_time}`.localeCompare(`${left.appt_date}${left.appt_time}`))
    : []

  const detailValue = (value: string | number | null | undefined) => value === null || value === undefined || value === '' ? 'Not recorded' : String(value)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Patient lookup</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
        <p className="mt-1 text-slate-600">Search basic front-desk information and select a patient for scheduling.</p>
      </div>

      <label className="relative block max-w-2xl">
        <span className="sr-only">Search patients</span>
        <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, phone number, or patient ID"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <UserRound className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-medium text-slate-800">No matching patients</p>
          <p className="mt-1 text-sm text-slate-500">Try a different name, phone number, or patient ID.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Basic details</th>
                  <th className="px-6 py-4">Next appointment</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => {
                  const appointment = nextAppointment(patient.id)
                  return (
                    <tr key={patient.id} className="align-top hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-sm text-slate-500">Patient #{patient.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <p>{patient.contact || 'Not provided'}</p>
                        <p className="mt-1 max-w-xs text-slate-500">{patient.address || 'No address recorded'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <p>{patient.age === null ? 'Age not recorded' : `${patient.age} years`} · {patient.gender || 'Gender not recorded'}</p>
                        <p className="mt-1 text-slate-500">Blood group: {patient.blood_group || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {appointment ? (
                          <>
                            <p className="font-medium">{appointment.appt_date} at {shortTime(appointment.appt_time)}</p>
                            <p className="mt-1 text-slate-500">Dr {doctorNames.get(appointment.doctor_id) || `#${appointment.doctor_id}`} · {appointment.status.replaceAll('_', ' ')}</p>
                          </>
                        ) : <span className="text-slate-500">No upcoming appointment</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(patient)}
                          aria-label={`View full record for ${patient.name}`}
                          title="View patient details"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={selectedPatient !== null}
        title={selectedPatient ? selectedPatient.name : 'Patient details'}
        description={selectedPatient ? `Patient #${selectedPatient.id} · Complete front-desk record` : undefined}
        onClose={() => setSelectedPatient(null)}
        size="lg"
        footer={(
          <button type="button" onClick={() => setSelectedPatient(null)} className="hms-button hms-button-secondary">
            Close
          </button>
        )}
      >
        {selectedPatient && (
          <div className="space-y-6">
            <section aria-labelledby="patient-profile-heading">
              <h3 id="patient-profile-heading" className="text-sm font-semibold text-slate-900">Patient information</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Patient ID', `#${selectedPatient.id}`],
                  ['Full name', selectedPatient.name],
                  ['Contact number', detailValue(selectedPatient.contact)],
                  ['Age', selectedPatient.age === null ? 'Not recorded' : `${selectedPatient.age} years`],
                  ['Gender', selectedPatient.gender ? selectedPatient.gender.replace(/^./, (letter) => letter.toUpperCase()) : 'Not recorded'],
                  ['Blood group', detailValue(selectedPatient.blood_group)],
                  ['Patient account', selectedPatient.user_id ? `Linked · User #${selectedPatient.user_id}` : 'Not linked'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{detailValue(selectedPatient.address)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="appointment-history-heading" className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 id="appointment-history-heading" className="text-sm font-semibold text-slate-900">Appointment history</h3>
                <span className="text-xs text-slate-500">{selectedAppointments.length} {selectedAppointments.length === 1 ? 'appointment' : 'appointments'}</span>
              </div>
              {selectedAppointments.length === 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">No appointments recorded for this patient.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedAppointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{appointment.appt_date} at {shortTime(appointment.appt_time)}</td>
                          <td className="px-4 py-3 text-slate-700">Dr {doctorNames.get(appointment.doctor_id) || `#${appointment.doctor_id}`}</td>
                          <td className="max-w-xs px-4 py-3 text-slate-600">{detailValue(appointment.reason)}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{appointment.status.replaceAll('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  )
}
