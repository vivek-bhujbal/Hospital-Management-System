import { fetchAPI } from '@/lib/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function DoctorDetailsPage({ params }: { params: { id: string } }) {
  const doctorId = parseInt(params.id)
  if (isNaN(doctorId)) {
    notFound()
  }

  // Currently we fetch all doctors and filter. A real app would have a GET /doctors/:id endpoint.
  const doctors = await fetchAPI('/admin/doctors')
  const doctor = doctors.find((d: any) => d.id === doctorId)

  if (!doctor) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/doctors" className="text-gray-500 hover:text-blue-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Doctor Profile</h1>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold">
            {doctor.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{doctor.name}</h2>
            <p className="text-blue-600 font-medium text-lg">{doctor.specialization}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${doctor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {doctor.status === 'active' ? 'Active' : 'On Leave'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Contact Information</h3>
            <div className="flex items-center gap-3 text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>{doctor.contact}</span>
            </div>
            {/* Real app would have email, let's assume they don't have it on the model yet */}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Schedule & Shift</h3>
            <div className="flex items-center gap-3 text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{doctor.timing_start} - {doctor.timing_end}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
