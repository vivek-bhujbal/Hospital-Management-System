import Link from 'next/link'

export default function NurseNotFound() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-bold text-slate-900">Nursing record not found</h1><p className="mt-2 text-slate-600">The record does not exist or is no longer assigned to you.</p><Link href="/nurse/patients" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Back to patients</Link></div>
}
