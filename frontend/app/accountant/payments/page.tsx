import { fetchAPI } from '@/lib/api'
import type { Payment } from '@/lib/accountantTypes'
import PaymentDirectory from './PaymentDirectory'

export default async function AccountantPaymentsPage() {
  const payments = await fetchAPI('/accountant/payments') as Payment[]
  return <PaymentDirectory payments={payments}/>
}
