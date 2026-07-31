import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function DoctorPatients() {
  const patients = await fetchAPI('/patients/')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Patient Directory</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((p: any) => (
          <div key={p.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="font-bold text-lg">{p.name}</h3>
            <p className="text-gray-600 text-sm mb-4">Age: {p.age || '-'} | Blood: {p.blood_group || '-'}</p>
            <Link href={`/doctor/patients/${p.id}`} className="text-blue-600 hover:underline text-sm font-medium">
              View History &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
