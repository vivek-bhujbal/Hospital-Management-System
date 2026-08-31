'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface PharmacistActionResult { success?: boolean; error?: string }

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` }
}
function value(data: FormData, key: string) {
  const item = data.get(key)
  return typeof item === 'string' ? item.trim() : ''
}
async function result(response: Response, fallback: string): Promise<PharmacistActionResult> {
  if (response.ok) {
    revalidatePath('/pharmacist/home')
    revalidatePath('/pharmacist/prescriptions')
    revalidatePath('/pharmacist/inventory')
    revalidatePath('/pharmacist/dispensing')
    return { success: true }
  }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  const detail = payload?.detail
  if (typeof detail === 'string') return { error: detail }
  if (Array.isArray(detail)) return { error: detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}

export async function prescriptionAction(data: FormData) {
  const id = value(data, 'prescription_id')
  const response = await fetch(`${API_URL}/pharmacy/prescriptions/${id}/action`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ action: value(data, 'action'), reason: value(data, 'reason') || null }),
  })
  revalidatePath(`/pharmacist/prescriptions/${id}`)
  return result(response, 'Unable to update prescription workflow.')
}

export async function createCategoryAction(data: FormData) {
  return result(await fetch(`${API_URL}/pharmacy/categories`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: value(data, 'name'), description: value(data, 'description') || null }),
  }), 'Unable to create category.')
}
export async function createSupplierAction(data: FormData) {
  return result(await fetch(`${API_URL}/pharmacy/suppliers`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: value(data, 'name'), contact_person: value(data, 'contact_person') || null }),
  }), 'Unable to create supplier.')
}
export async function createMedicineAction(data: FormData) {
  return result(await fetch(`${API_URL}/pharmacy/medicines`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({
      name: value(data, 'name'), sku: value(data, 'sku') || null,
      generic_name: value(data, 'generic_name') || null, category_id: Number(value(data, 'category_id')),
      unit: value(data, 'unit') || null, description: null, status: 'active',
    }),
  }), 'Unable to create medicine.')
}
export async function addInventoryAction(data: FormData) {
  return result(await fetch(`${API_URL}/pharmacy/inventory`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({
      medicine_id: Number(value(data, 'medicine_id')),
      supplier_id: value(data, 'supplier_id') ? Number(value(data, 'supplier_id')) : null,
      batch_number: value(data, 'batch_number'), expiry_date: value(data, 'expiry_date'),
      quantity: Number(value(data, 'quantity')), purchase_price: value(data, 'purchase_price'),
      selling_price: value(data, 'selling_price'),
    }),
  }), 'Unable to add inventory batch.')
}
export async function adjustInventoryAction(data: FormData) {
  const id = value(data, 'batch_id')
  return result(await fetch(`${API_URL}/pharmacy/inventory/${id}/adjust`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({
      action: value(data, 'action'), quantity: Number(value(data, 'quantity')),
      reason: value(data, 'reason') || null,
    }),
  }), 'Unable to adjust inventory.')
}
export async function dispenseAction(data: FormData) {
  return result(await fetch(`${API_URL}/pharmacy/dispense`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({
      prescription_id: Number(value(data, 'prescription_id')),
      items: [{ medicine_id: Number(value(data, 'medicine_id')), batch_id: Number(value(data, 'batch_id')), quantity: Number(value(data, 'quantity')) }],
    }),
  }), 'Unable to dispense prescription.')
}
