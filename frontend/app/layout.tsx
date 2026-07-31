export const metadata = {
  title: 'Hospital Management System',
  description: 'Manage your hospital efficiently.',
}

import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}