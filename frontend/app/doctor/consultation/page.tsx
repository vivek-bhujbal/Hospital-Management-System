import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { completeConsultationAction } from '@/app/actions/doctor'

export default function DoctorConsultation({ searchParams }: { searchParams: { appointment_id?: string } }) {
  const apptId = searchParams.appointment_id

  if (!apptId) {
    return <div className="p-4 text-red-600">Error: No appointment ID provided for consultation.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Active Consultation</h1>
      <p className="text-gray-600">Appointment ID: #{apptId}</p>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <ClientForm action={completeConsultationAction} className="space-y-4">
          <input type="hidden" name="appointment_id" value={apptId} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
            <textarea name="diagnosis" required rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Medicine</label>
            <input type="text" name="medicine" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage Instructions</label>
            <input type="text" name="dosage" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea name="notes" rows={2} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <SubmitButton className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-bold">
            Save and Complete
          </SubmitButton>
        </ClientForm>
      </div>
    </div>
  )
}
