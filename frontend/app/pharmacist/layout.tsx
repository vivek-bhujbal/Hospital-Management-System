import DashboardLayout from '@/components/DashboardLayout'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="pharmacist">{children}</DashboardLayout>
}
