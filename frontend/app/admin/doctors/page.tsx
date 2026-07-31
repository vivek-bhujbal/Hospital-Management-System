import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { addDoctorAction, deleteDoctorAction, editDoctorAction } from '@/app/actions/admin'

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

import AddDoctorForm from './AddDoctorForm'

export default async function AdminDoctors() {
  const doctors = await fetchAPI('/admin/doctors')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Manage Doctors</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Add New Doctor Profile</h2>
        <AddDoctorForm />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.map((d: any) => (
              <tr key={d.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{d.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{d.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{d.specialization}</td>
                <td className="px-6 py-4 whitespace-nowrap">{d.timing_start} - {d.timing_end}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-4 items-center">
                    <a href={`/admin/doctors/${d.id}`} className="text-blue-600 hover:text-blue-900 transition-colors" title="View Details">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </a>
                    <a href={`/admin/doctors/${d.id}/edit`} className="text-amber-500 hover:text-amber-700 transition-colors" title="Edit Doctor">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </a>
                    <ClientForm action={deleteDoctorAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <SubmitButton className="text-red-600 hover:text-red-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </SubmitButton>
                    </ClientForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
