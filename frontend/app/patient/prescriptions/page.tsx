import { fetchAPI } from '@/lib/api'
import { EmptyState, PageHeader } from '@/components/ui/HmsUI'

export default async function PatientPrescriptions() {
  const prescriptions = await fetchAPI('/prescriptions/me')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My care" title="Prescriptions" description="Review medicines and clinical directions issued during your consultations." />
      <section className="hms-card p-5 sm:p-6">
        {prescriptions.length === 0 ? (
          <EmptyState title="No prescriptions yet" description="Prescriptions issued by your doctor will appear here." />
        ) : (
          <ul className="space-y-4">
            {prescriptions.map((p: any) => (
              <li key={p.id} className="rounded-xl border p-4">
                <p><strong>Diagnosis:</strong> {p.diagnosis}</p>
                <p><strong>Medicine:</strong> {p.medicine}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p><strong>Notes:</strong> {p.notes}</p>
                <p className="text-sm text-gray-500 mt-2">Issued on: {new Date(p.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
