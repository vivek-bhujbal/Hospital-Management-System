'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface AccountantActionResult { success?: boolean; error?: string }

function value(data: FormData, key: string) {
  const item = data.get(key)
  return typeof item === 'string' ? item.trim() : ''
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` }
}

async function complete(response: Response, fallback: string): Promise<AccountantActionResult> {
  if (response.ok) {
    for (const path of ['/accountant/home', '/accountant/invoices', '/accountant/payments', '/accountant/expenses', '/accountant/reports']) revalidatePath(path)
    return { success: true }
  }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return { error: payload.detail }
  if (Array.isArray(payload?.detail)) return { error: payload.detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}

export async function recordInvoicePaymentAction(data: FormData) {
  const invoiceId = value(data, 'invoice_id')
  return complete(await fetch(`${API_URL}/accountant/invoices/${invoiceId}/pay`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ payment_method: value(data, 'payment_method') }),
  }), 'Unable to record payment.')
}

export async function createExpenseCategoryAction(data: FormData) {
  return complete(await fetch(`${API_URL}/accountant/expense-categories`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ name: value(data, 'name'), description: value(data, 'description') || null }),
  }), 'Unable to create expense category.')
}

export async function createExpenseAction(data: FormData) {
  return complete(await fetch(`${API_URL}/accountant/expenses`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({
      category_id: Number(value(data, 'category_id')),
      amount: value(data, 'amount'),
      description: value(data, 'description') || null,
      supporting_reference: value(data, 'supporting_reference') || null,
      incurred_date: value(data, 'incurred_date'),
      idempotency_key: value(data, 'idempotency_key') || randomUUID(),
    }),
  }), 'Unable to record expense.')
}
