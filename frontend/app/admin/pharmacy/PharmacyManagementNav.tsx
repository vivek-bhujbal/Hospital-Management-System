'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, LayoutDashboard, Pill, Truck } from 'lucide-react'

import { cn } from '@/components/ui/HmsUI'

const links = [
  { href: '/admin/pharmacy', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/pharmacy/medicines', label: 'Medicines', icon: Pill },
  { href: '/admin/pharmacy/categories', label: 'Categories', icon: Boxes },
  { href: '/admin/pharmacy/suppliers', label: 'Suppliers', icon: Truck },
]

export default function PharmacyManagementNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Pharmacy management sections" className="hms-card flex flex-wrap gap-2 p-2">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors',
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
