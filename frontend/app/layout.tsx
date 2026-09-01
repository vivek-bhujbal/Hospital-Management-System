import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'

export const metadata = {
  title: {
    default: 'HMS Platform',
    template: '%s | HMS Platform',
  },
  description: 'Secure hospital operations and patient care management platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:translate-y-0">Skip to main content</a>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
