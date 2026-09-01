'use client'

import { useState } from 'react'
import { addDoctorAction } from '@/app/actions/admin'
import SubmitButton from '@/components/SubmitButton'
import { Modal } from '@/components/ui/Modal'

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
      <form action={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {error && <div role="alert" className="col-span-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
        <label><span className="mb-1.5 block text-sm font-semibold">Full name</span><input type="text" name="name" autoComplete="name" placeholder="Doctor name" required className="hms-input" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Specialization</span><select name="specialization" required className="hms-input">
          <option value="">Select Specialization...</option>
          {SPECIALIZATIONS.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Contact number</span><input type="text" name="contact" autoComplete="tel" placeholder="Primary contact" required className="hms-input" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Consultation fee</span><input type="number" name="consultation_fee" min="0.01" step="0.01" placeholder="Amount in INR" required className="hms-input" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Login email</span><input type="email" name="email" autoComplete="email" placeholder="doctor@hospital.com" required value={email} onChange={e => setEmail(e.target.value)} className="hms-input" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Temporary password</span><input type="password" name="password" autoComplete="new-password" placeholder="Secure temporary password" required value={password} onChange={e => setPassword(e.target.value)} className="hms-input" /></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm font-semibold">Shift start</span><input type="time" name="timing_start" required className="hms-input" /></label><label><span className="mb-1.5 block text-sm font-semibold">Shift end</span><input type="time" name="timing_end" required className="hms-input" /></label></div>
        <div className="col-span-full flex justify-end pt-1">
          <SubmitButton>Add doctor</SubmitButton>
        </div>
      </form>

      {successData && (
        <Modal open title="Doctor created successfully" description="This temporary credential is shown once." onClose={() => setSuccessData(null)} size="sm">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 mb-4">
              Please share these credentials with the doctor. The password is hashed and cannot be retrieved later.
            </p>
            <div className="bg-[var(--hms-surface-muted)] p-4 rounded-xl space-y-3 mb-6 border">
              <p className="text-sm"><span className="font-semibold">Email:</span> <span>{successData.email}</span></p>
              <p className="text-sm"><span className="font-semibold">Temporary password:</span> <span className="font-mono bg-[var(--hms-surface)] px-2 py-1 border rounded break-all">{successData.password}</span></p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setSuccessData(null)
                setEmail('')
                setPassword('')
                window.location.reload()
              }}
              className="hms-button hms-button-primary w-full"
            >
              Done
            </button>
        </Modal>
      )}
    </>
  )
}
