import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function PatientHistory({ params }: { params: { id: string } }) {
  const history = await fetchAPI(`/patients/${params.id}/history`)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/doctor/patients" className="text-blue-600 hover:underline">&larr; Back to Directory</Link>
        <h1 className="text-3xl font-bold text-gray-800">Patient #{params.id} History</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Past Prescriptions & Diagnoses</h2>
        {history.prescriptions.length === 0 ? (
          <p className="text-gray-500">No medical history found.</p>
        ) : (
          <div className="space-y-4">
            {history.prescriptions.map((p: any) => (
              <div key={p.id} className="p-4 border rounded shadow-sm bg-gray-50">
                <p><strong>Date:</strong> {new Date(p.created_at).toLocaleDateString()}</p>
                <p><strong>Diagnosis:</strong> {p.diagnosis}</p>
                <p><strong>Medicine:</strong> {p.medicine}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p className="text-sm mt-2 text-gray-600">Notes: {p.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
