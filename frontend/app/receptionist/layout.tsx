import React from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  const permStr = cookies().get('employee_permissions')?.value
  let permissions: any = {}
  if (permStr) {
    try {
      permissions = JSON.parse(permStr)
    } catch(e) {}
  }

  // Define sidebar items based on permissions
  const menuItems = [
    { name: 'Dashboard', path: '/receptionist/home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', show: true },
    { name: 'Register Patient', path: '/receptionist/register-patient', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', show: permissions.can_register_patient !== false },
    { name: 'Schedule Appointment', path: '/receptionist/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', show: permissions.can_schedule_appointment !== false },
    { name: 'Check-in Queue', path: '/receptionist/queue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', show: permissions.can_checkin_patient !== false },
    { name: 'Collect Payment', path: '/receptionist/billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', show: permissions.can_collect_billing !== false },
  ]

  return (
    <div className="flex min-h-screen bg-[#111315] font-sans text-gray-200">
      {/* Dark Sidebar */}
      <aside className="w-64 min-h-screen bg-[#1C1F22] border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase mb-1">HealthSync</h1>
          <p className="text-xs text-gray-500 font-medium">RECEPTION DESK</p>
        </div>
        
        <nav className="flex-1 mt-6">
          <ul className="space-y-1 px-3">
            {menuItems.filter(item => item.show).map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:bg-[#25282D] hover:text-white"
                >
                  <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <form action={logoutAction}>
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-400 hover:bg-[#25282D] hover:text-white rounded-lg transition-colors">
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
