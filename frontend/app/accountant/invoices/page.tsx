import { fetchAPI } from '@/lib/api'
import type { Invoice } from '@/lib/accountantTypes'
import InvoiceWorkspace from './InvoiceWorkspace'

export default async function AccountantInvoicesPage() {
  const invoices = await fetchAPI('/accountant/invoices') as Invoice[]
  return <InvoiceWorkspace invoices={invoices}/>
}
