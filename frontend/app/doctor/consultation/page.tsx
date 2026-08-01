import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { completeConsultationAction } from '@/app/actions/doctor'
import { fetchAPI } from '@/lib/api'

export default async function DoctorConsultation({ searchParams }: { searchParams: { appointment_id?: string } }) {
  const apptId = searchParams.appointment_id

  if (!apptId) {
    const appts = await fetchAPI(`/appointments/?doctor_id=me`)
    const pendingAppts = appts.filter((a: any) => a.status === 'checked_in' || a.status === 'confirmed' || a.status === 'requested')
    
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Select Patient for Consultation</h1>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {pendingAppts.length === 0 ? (
            <p className="text-gray-500">No pending appointments to consult.</p>
          ) : (
            <ul className="space-y-4">
              {pendingAppts.map((a: any) => (
                <li key={a.id} className="flex justify-between items-center p-4 border rounded hover:bg-gray-50">
                  <div>
                    <span className="font-semibold block">Patient #{a.patient_id}</span>
                    <span className="text-sm text-gray-500">{a.appt_date} at {a.appt_time}</span>
                  </div>
                  <a href={`/doctor/consultation?appointment_id=${a.id}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                    Start Consultation
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const doctor = await fetchAPI('/doctors/me').catch(() => null)
  const isCardiologist = doctor?.specialization === 'Cardiology'

  const cardioMedicines = [
    "Adenosine", "Amiodarone", "Amlodipine", "Apixaban", "Aspirin", "Atenolol", "Atorvastatin",
    "Azilsartan", "Benazepril", "Bisoprolol", "Candesartan", "Captopril", "Carvedilol", "Chlorthalidone",
    "Cilostazol", "Clonidine", "Clopidogrel", "Dabigatran", "Dapagliflozin", "Digoxin", "Diltiazem",
    "Dronedarone", "Edoxaban", "Empagliflozin", "Enalapril", "Enoxaparin", "Eplerenone", "Felodipine",
    "Flecainide", "Fluvastatin", "Furosemide", "Heparin", "Hydralazine", "Hydrochlorothiazide",
    "Indapamide", "Irbesartan", "Isosorbide Dinitrate", "Isosorbide Mononitrate", "Ivabradine",
    "Labetalol", "Lidocaine", "Lisinopril", "Losartan", "Methyldopa", "Metoprolol", "Minoxidil",
    "Nebivolol", "Nicardipine", "Nifedipine", "Nitroglycerin", "Olmesartan", "Perindopril",
    "Pitavastatin", "Prasugrel", "Pravastatin", "Propafenone", "Propranolol", "Ramipril", "Ranolazine",
    "Rivaroxaban", "Rosuvastatin", "Sacubitril / Valsartan", "Simvastatin", "Sotalol", "Spironolactone",
    "Telmisartan", "Ticagrelor", "Ticlopidine", "Torsemide", "Trimetazidine", "Valsartan", "Verapamil", "Warfarin"
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Active Consultation</h1>
      <p className="text-gray-600">Appointment ID: #{apptId}</p>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <ClientForm action={completeConsultationAction} className="space-y-4">
          <input type="hidden" name="appointment_id" value={apptId} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
            <textarea name="diagnosis" required rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Medicine</label>
            {isCardiologist ? (
              <select name="medicine" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white">
                <option value="">Select Medicine</option>
                {cardioMedicines.map(med => (
                  <option key={med} value={med}>{med}</option>
                ))}
              </select>
            ) : (
              <input type="text" name="medicine" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage Instructions</label>
            <input type="text" name="dosage" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea name="notes" rows={2} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <SubmitButton className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-bold">
            Save and Complete
          </SubmitButton>
        </ClientForm>
      </div>
    </div>
  )
}
