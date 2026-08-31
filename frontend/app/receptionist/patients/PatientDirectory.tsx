'use client'

import Link from 'next/link'
import { Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

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
                        <Link href={`/receptionist/schedule?patient_id=${patient.id}`} className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          Schedule
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
