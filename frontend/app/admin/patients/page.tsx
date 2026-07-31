import { fetchAPI } from '@/lib/api'

export default async function AdminPatients() {
  const patients = await fetchAPI('/admin/patients')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">All Patients</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((p: any) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{p.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{p.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{p.age} / {p.gender}</td>
                <td className="px-6 py-4 whitespace-nowrap">{p.contact}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">{p.blood_group}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
