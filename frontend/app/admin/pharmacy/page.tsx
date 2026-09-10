import Link from 'next/link'
import { ArrowRight, Boxes, Pill, ShieldCheck, Truck } from 'lucide-react'

import { fetchAPI } from '@/lib/api'
import type { Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'
import { PageHeader, StatCard } from '@/components/ui/HmsUI'

import AdminReceiveStock from './AdminReceiveStock'
import PharmacyManagementNav from './PharmacyManagementNav'

const sections = [
  {
    href: '/admin/pharmacy/medicines',
    title: 'Medicines',
    description: 'Medicine identity, SKU, category, unit, specialty discovery metadata, threshold, and status.',
    icon: Pill,
  },
  {
    href: '/admin/pharmacy/categories',
    title: 'Categories',
    description: 'Hospital-defined medicine groupings with descriptions, real medicine counts, and status.',
    icon: Boxes,
  },
  {
    href: '/admin/pharmacy/suppliers',
    title: 'Suppliers',
    description: 'Approved supplier contacts and active status for future stock receipt.',
    icon: Truck,
  },
]

export default async function AdminPharmacyPage() {
  const [suppliers, categories, medicines] = await Promise.all([
    fetchAPI('/admin/pharmacy/suppliers') as Promise<Supplier[]>,
    fetchAPI('/admin/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/admin/pharmacy/medicines') as Promise<Medicine[]>,
  ])

  return (
    <div className="space-y-7">
      <PharmacyManagementNav />
      <PageHeader
        eyebrow="Admin · Pharmacy management"
        title="Pharmacy management"
        description="Admin owns medicine, category, and supplier master data. Pharmacists consume active records for stock and dispensing operations."
        actions={<AdminReceiveStock medicines={medicines} categories={categories} suppliers={suppliers} />}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Medicines" value={medicines.length} icon={Pill} helper={`${medicines.filter((item) => item.status === 'active').length} active`} href="/admin/pharmacy/medicines" />
        <StatCard label="Categories" value={categories.length} icon={Boxes} helper={`${categories.filter((item) => item.status === 'active').length} active`} href="/admin/pharmacy/categories" />
        <StatCard label="Suppliers" value={suppliers.length} icon={Truck} helper={`${suppliers.filter((item) => item.status === 'active').length} active`} href="/admin/pharmacy/suppliers" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="hms-card hms-card-interactive group p-5">
            <span className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">Open {title.toLowerCase()} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>

      <section className="hms-card flex gap-4 border-brand-100 bg-brand-50/60 p-5 dark:border-brand-900 dark:bg-brand-950/30">
        <span className="mt-0.5 rounded-xl bg-white p-2 text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">One shared inventory ledger</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Receiving a batch here writes to the same medicine batch and stock transaction records used by Pharmacist inventory. Minimum stock is only an alert threshold and never creates physical quantity.</p>
        </div>
      </section>
    </div>
  )
}
