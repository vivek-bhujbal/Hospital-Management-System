import { fetchAPI } from '@/lib/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { editDoctorAction } from '@/app/actions/admin'
import ResetPasswordForm from './ResetPasswordForm'

const SPECIALIZATIONS = [
  "General Physician", "Internal Medicine", "Family Medicine", "Cardiology", "Cardiac Surgery",
  "Neurology", "Neurosurgery", "Orthopedics", "Pediatric Orthopedics", "Spine Surgery", "Sports Medicine",
  "Pediatrics", "Neonatology", "Pediatric Surgery", "Gynecology", "Obstetrics", "Obstetrics & Gynecology (OB-GYN)",
  "Dermatology", "Venereology", "ENT (Otolaryngology)", "Ophthalmology", "Pulmonology", "Gastroenterology",
  "Hepatology", "Nephrology", "Urology", "Endocrinology", "Diabetology", "Rheumatology", "Oncology",
  "Medical Oncology", "Surgical Oncology", "Radiation Oncology", "Hematology", "Hematology & Oncology",
  "Psychiatry", "Clinical Psychology", "Psychology", "Anesthesiology", "Critical Care Medicine",
  "Emergency Medicine", "Trauma Surgery", "General Surgery", "Plastic Surgery", "Cosmetic Surgery",
  "Reconstructive Surgery", "Vascular Surgery", "Thoracic Surgery", "Cardiothoracic Surgery",
  "Colorectal Surgery", "Bariatric Surgery", "Transplant Surgery", "Oral & Maxillofacial Surgery",
  "Dentistry", "Orthodontics", "Prosthodontics", "Periodontics", "Endodontics", "Pediatric Dentistry",
  "Radiology", "Interventional Radiology", "Nuclear Medicine", "Pathology", "Clinical Pathology",
  "Forensic Pathology", "Microbiology", "Immunology", "Allergy & Immunology", "Infectious Disease",
  "Geriatrics", "Geriatric Medicine", "Palliative Care", "Pain Management", "Physical Medicine & Rehabilitation (PM&R)",
  "Physiotherapy", "Occupational Therapy", "Speech Therapy", "Audiology", "Sleep Medicine", "Reproductive Medicine",
  "Fertility (IVF)", "Maternal-Fetal Medicine", "Clinical Genetics", "Preventive Medicine", "Public Health Medicine",
  "Lifestyle Medicine", "Aviation Medicine", "Hyperbaric Medicine", "Sports Rehabilitation", "Addiction Medicine",
  "Clinical Pharmacology", "Nutrition & Dietetics", "Medical Genetics", "Cosmetic Dermatology", "Hand Surgery",
  "Foot & Ankle Surgery", "Breast Surgery", "Pediatric Cardiology", "Pediatric Neurology", "Pediatric Endocrinology",
  "Pediatric Nephrology", "Pediatric Gastroenterology", "Pediatric Pulmonology", "Pediatric Oncology",
  "Pediatric Hematology", "Pediatric Urology", "Pediatric Rheumatology"
];

export default async function EditDoctorPage({ params }: { params: { id: string } }) {
  const doctorId = parseInt(params.id)
  if (isNaN(doctorId)) {
    notFound()
  }

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
        <h1 className="text-3xl font-bold text-gray-800">Edit Doctor Profile</h1>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
        <ClientForm action={editDoctorAction} className="space-y-6">
          <input type="hidden" name="id" value={doctor.id} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" name="name" defaultValue={doctor.name} required className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" defaultValue={doctor.email} required className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <select name="specialization" defaultValue={doctor.specialization} required className="w-full border p-2 rounded bg-white text-gray-700">
                <option value="">Select Specialization...</option>
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input type="text" name="contact" defaultValue={doctor.contact} required className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue={doctor.status} required className="w-full border p-2 rounded bg-white text-gray-700">
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start Time</label>
              <input type="time" name="timing_start" defaultValue={doctor.timing_start} required className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift End Time</label>
              <input type="time" name="timing_end" defaultValue={doctor.timing_end} required className="w-full border p-2 rounded" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <SubmitButton className="bg-amber-500 text-white px-6 py-2 rounded font-medium hover:bg-amber-600">
              Save Changes
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
      
      <ResetPasswordForm doctorId={doctor.id} />
    </div>
  )
}
