'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

type Role = 'patient' | 'receptionist' | 'doctor' | 'admin'

interface SidebarProps {
  role: Role
  permissions?: any
}

const MENU_ITEMS = {
  patient: [
    { name: 'Home', path: '/patient/home' },
    { name: 'Appointments', path: '/patient/appointments' },
    { name: 'Prescriptions', path: '/patient/prescriptions' },
    { name: 'Billing', path: '/patient/billing' },
    { name: 'Profile', path: '/patient/profile' },
  ],
  receptionist: [
    { name: 'Home', path: '/receptionist/home' },
    { name: 'Register patient', path: '/receptionist/register-patient', perm: 'can_register_patient' },
    { name: 'Schedule', path: '/receptionist/schedule', perm: 'can_schedule_appointment' },
    { name: 'Check-in queue', path: '/receptionist/queue', perm: 'can_checkin_patient' },
    { name: 'Billing', path: '/receptionist/billing', perm: 'can_collect_billing' },
  ],
  doctor: [
    { name: 'Home', path: '/doctor/home' },
    { name: 'Appointments', path: '/doctor/appointments' },
    { name: 'Patients', path: '/doctor/patients' },
    { name: 'Consultation', path: '/doctor/consultation' },
    { name: 'Profile', path: '/doctor/profile' },
  ],
  admin: [
    { name: 'Home', path: '/admin/home' },
    { name: 'Doctors', path: '/admin/doctors' },
    { name: 'Employees', path: '/admin/employees' },
    { name: 'Patients', path: '/admin/patients' },
    { name: 'Appointments', path: '/admin/appointments' },
    { name: 'Billing', path: '/admin/billing' },
  ]
}

export default function Sidebar({ role, permissions = {} }: SidebarProps) {
  const pathname = usePathname()
  let items = MENU_ITEMS[role] || []
  
  if (role === 'receptionist') {
    items = items.filter((item: any) => {
      if (!item.perm) return true;
      return permissions[item.perm] !== false;
    })
  }

  return (
    <aside className="w-64 h-full bg-[#0A192F] text-white flex flex-col shadow-lg">
      <div className="p-6 text-2xl font-bold border-b border-gray-700 tracking-wide">
        HMS Portal
      </div>
      <nav className="flex-1 mt-6">
        <ul className="space-y-2 px-4">
          {items.map((item) => {
            const isActive = pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white font-medium shadow-md' 
                      : 'text-gray-300 hover:bg-[#112240] hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button 
          onClick={() => logoutAction()}
          className="w-full text-left px-4 py-2 mb-4 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
        <div className="text-sm text-gray-500 text-center">
          Role: <span className="capitalize text-gray-400">{role}</span>
        </div>
      </div>
    </aside>
  )
}