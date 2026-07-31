'use client'

import { useState } from 'react'
import { addDoctorAction } from '@/app/actions/admin'
import SubmitButton from '@/components/SubmitButton'

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

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function AddDoctorForm() {
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{email: string, password: string} | null>(null)

  const handleGeneratePassword = () => {
    setPassword(generatePassword())
  }

  const handleSubmit = async (formData: FormData) => {
    setError('')
    const res = await addDoctorAction(formData)
    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setSuccessData({ email: formData.get('email') as string, password: formData.get('password') as string })
    }
  }

  return (
    <>
      <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {error && <div className="col-span-full text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        
        <input type="text" name="name" placeholder="Name" required className="border p-2 rounded" />
        
        <select name="specialization" required className="border p-2 rounded bg-white text-gray-700">
          <option value="">Select Specialization...</option>
          {SPECIALIZATIONS.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
        
        <input type="text" name="contact" placeholder="Contact" required className="border p-2 rounded" />
        
        <input type="email" name="email" placeholder="Login Email" required value={email} onChange={e => setEmail(e.target.value)} className="border p-2 rounded" />
        
        <div className="flex gap-2">
          <input type="password" name="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className="border p-2 rounded flex-1" />
        </div>

        <div className="flex gap-2">
            <input type="time" name="timing_start" required className="border p-2 rounded w-full" aria-label="Shift Start" />
            <input type="time" name="timing_end" required className="border p-2 rounded w-full" aria-label="Shift End" />
        </div>
        
        <div className="col-span-full mt-2">
          <SubmitButton className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full md:w-auto">Add Doctor</SubmitButton>
        </div>
      </form>

      {successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Doctor Created Successfully</h3>
            <p className="text-gray-600 mb-4">
              Please share these credentials with the doctor. The password is hashed and cannot be retrieved later.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6 border border-gray-100">
              <p><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-900">{successData.email}</span></p>
              <p><span className="font-semibold text-gray-700">Password:</span> <span className="text-gray-900 font-mono bg-white px-2 py-1 border rounded break-all">{successData.password}</span></p>
            </div>
            <button 
              onClick={() => {
                setSuccessData(null)
                setEmail('')
                setPassword('')
                window.location.reload()
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
