'use client'

import { useState } from 'react'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { bookAppointmentAction } from '@/app/actions/receptionist'

export default function ScheduleForm({ patients, doctors }: { patients: any[], doctors: any[] }) {
  const [selectedSlot, setSelectedSlot] = useState('10:00')

  const timeSlots = [
    { label: '10:00 AM', value: '10:00' },
    { label: '11:30 AM', value: '11:30' },
    { label: '1:00 PM', value: '13:00' },
    { label: '2:30 PM', value: '14:30' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Schedule Appointment</h1>
        <p className="text-gray-600 mt-1">Book a new consultation for an existing patient.</p>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
        <ClientForm action={bookAppointmentAction} className="space-y-6">
          {/* Hidden inputs to pass state values */}
          <input type="hidden" name="appt_time" value={selectedSlot} />
          <input type="hidden" name="reason" value="" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search patient</label>
            <select 
              name="patient_id" 
              required 
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              defaultValue=""
            >
              <option value="" disabled className="text-gray-500">Name or contact number</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.contact || 'No contact'})</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select 
                name="doctor_id" 
                required 
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                defaultValue=""
              >
                <option value="" disabled>Select doctor...</option>
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>Dr {d.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  name="appt_date" 
                  required 
                  min={new Date().toISOString().split("T")[0]} 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">Available slots</label>
            <div className="flex flex-wrap gap-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSelectedSlot(slot.value)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedSlot === slot.value
                      ? 'bg-blue-600 border border-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <SubmitButton className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center justify-center gap-2">
              Confirm booking
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
    </div>
  )
}
