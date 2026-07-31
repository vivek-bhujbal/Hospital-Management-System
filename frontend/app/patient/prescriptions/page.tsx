import { fetchAPI } from '@/lib/api'

export default async function PatientPrescriptions() {
  const prescriptions = await fetchAPI('/prescriptions/me')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">My Prescriptions</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {prescriptions.length === 0 ? (
          <p className="text-gray-500">No prescriptions found.</p>
        ) : (
          <ul className="space-y-4">
            {prescriptions.map((p: any) => (
              <li key={p.id} className="p-4 border rounded shadow-sm">
                <p><strong>Diagnosis:</strong> {p.diagnosis}</p>
                <p><strong>Medicine:</strong> {p.medicine}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p><strong>Notes:</strong> {p.notes}</p>
                <p className="text-sm text-gray-500 mt-2">Issued on: {new Date(p.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
