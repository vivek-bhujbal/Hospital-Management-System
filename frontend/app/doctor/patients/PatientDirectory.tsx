'use client'

import { Search, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  DoctorAppointment,
  DoctorPatient,
  shortTime,
  statusClass,
  statusLabel,
} from '@/lib/doctorTypes'

interface PatientDirectoryProps {
  patients: DoctorPatient[]
  appointments: DoctorAppointment[]
}

export default function PatientDirectory({ patients, appointments }: PatientDirectoryProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredPatients = useMemo(() => patients.filter((patient) => {
    if (!normalizedQuery) return true
    return patient.name.toLowerCase().includes(normalizedQuery)
      || String(patient.id).includes(normalizedQuery.replace(/^#/, ''))
  }), [normalizedQuery, patients])

  function latestAppointment(patientId: number) {
    return appointments
      .filter((appointment) => appointment.patient_id === patientId)
      .sort((left, right) => `${right.appt_date}${right.appt_time}`.localeCompare(`${left.appt_date}${left.appt_time}`))[0]
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical directory</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Patients</h1>
        <p className="mt-1 text-slate-600">Patients linked to your assigned appointments only.</p>
      </div>

      <label className="relative block max-w-2xl">
        <span className="sr-only">Search patients</span>
        <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by patient name or ID"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <UserRound className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-medium text-slate-800">{patients.length ? 'No matching patients' : 'No assigned patients'}</p>
          <p className="mt-1 text-sm text-slate-500">
            {patients.length ? 'Try a different patient name or ID.' : 'Patients will appear after an appointment is assigned to you.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Basic information</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Latest appointment</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => {
                  const appointment = latestAppointment(patient.id)
                  return (
                    <tr key={patient.id} className="align-top hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-sm text-slate-500">Patient #{patient.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <p>{patient.age === null ? 'Age not recorded' : `${patient.age} years`} · {patient.gender || 'Gender not recorded'}</p>
                        <p className="mt-1 text-slate-500">Blood group: {patient.blood_group || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{patient.contact || 'Not provided'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {appointment ? (
                          <>
                            <p>{appointment.appt_date} at {shortTime(appointment.appt_time)}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
                              {statusLabel(appointment.status)}
                            </span>
                          </>
                        ) : <span className="text-slate-500">No appointment context</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/doctor/patients/${patient.id}`} className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          View patient
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
