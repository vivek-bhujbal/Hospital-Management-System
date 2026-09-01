export interface FinancialSummary {
  revenue: string | number
  expenses: string | number
  refunds: string | number
  outstanding: string | number
  net: string | number
}

export interface AccountantDashboard {
  today_revenue: string | number
  pending_invoices: number
  paid_invoices: number
  outstanding_amount: string | number
  today_payments: number
  today_expenses: string | number
  financial_summary: FinancialSummary
}

export interface Invoice {
  id: number
  patient_id: number
  patient_name: string
  appointment_id: number
  appointment_date: string
  amount: string | number
  status: 'pending' | 'paid'
  payment_method: 'cash' | 'card' | 'upi' | null
  receipt_no: string | null
  paid_at: string | null
  created_at: string
}

export interface Payment {
  id: number
  invoice_id: number
  patient_id: number
  patient_name: string
  amount: string | number
  payment_method: string
  payment_date: string
  collector_id: number
  collector_name: string
  receipt_no: string
}

export interface ExpenseCategory {
  id: number
  name: string
  description: string | null
}

export interface Expense {
  id: number
  category_id: number
  category_name: string
  amount: string | number
  description: string | null
  supporting_reference: string | null
  incurred_date: string
  recorded_by: number
  recorded_by_name: string
  created_at: string
}

export interface PeriodSummary {
  period: string
  revenue: string | number
  expenses: string | number
  refunds: string | number
  net: string | number
}

export interface FinancialReport {
  start_date: string | null
  end_date: string | null
  period: 'daily' | 'monthly'
  revenue: string | number
  expenses: string | number
  refunds: string | number
  net: string | number
  outstanding_amount: string | number
  outstanding_invoices: Invoice[]
  payment_summary: { payment_method: string; count: number; amount: string | number }[]
  period_summary: PeriodSummary[]
}

export function money(value: string | number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(Number(value || 0))
}
