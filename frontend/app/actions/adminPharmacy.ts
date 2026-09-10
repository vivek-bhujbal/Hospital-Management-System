'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface MasterActionResult { success?: boolean; error?: string }

function text(data: FormData, key: string) {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

async function mutate(path: string, method: 'POST' | 'PATCH', body: object): Promise<MasterActionResult> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cookies().get('token')?.value}`,
    },
    body: JSON.stringify(body),
  })
  if (response.status === 401) redirect('/session-expired')
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null
    const detail = payload?.detail
    if (typeof detail === 'string') return { error: detail }
    if (Array.isArray(detail)) return { error: detail.map((item: { msg?: string }) => item.msg || 'Invalid value').join(', ') }
    return { error: 'Unable to save pharmacy master record.' }
  }
  revalidatePath('/admin/pharmacy')
  revalidatePath('/admin/pharmacy/suppliers')
  revalidatePath('/admin/pharmacy/categories')
  revalidatePath('/admin/pharmacy/medicines')
  revalidatePath('/pharmacist/inventory')
  revalidatePath('/pharmacist/home')
  revalidatePath('/pharmacist/dispensing')
  return { success: true }
}

export async function saveSupplierAction(data: FormData) {
  const id = text(data, 'id')
  const payload: Record<string, unknown> = {
    name: text(data, 'name'),
    contact_person: text(data, 'contact_person') || null,
    phone: text(data, 'phone') || null,
    email: text(data, 'email') || null,
    address: text(data, 'address') || null,
  }
  if (!id) payload.status = 'active'
  return mutate(`/admin/pharmacy/suppliers${id ? `/${id}` : ''}`, id ? 'PATCH' : 'POST', payload)
}

export async function saveCategoryAction(data: FormData) {
  const id = text(data, 'id')
  const payload: Record<string, unknown> = {
    name: text(data, 'name'),
    description: text(data, 'description') || null,
  }
  if (!id) payload.status = 'active'
  return mutate(`/admin/pharmacy/categories${id ? `/${id}` : ''}`, id ? 'PATCH' : 'POST', payload)
}

export async function saveMedicineAction(data: FormData) {
  const id = text(data, 'id')
  const payload: Record<string, unknown> = {
    name: text(data, 'name'),
    generic_name: text(data, 'generic_name') || null,
    sku: text(data, 'sku') || null,
    ...(text(data, 'category_id') ? { category_id: Number(text(data, 'category_id')) } : { category_name: text(data, 'category_name') }),
    specializations: data.getAll('specializations').filter((value): value is string => typeof value === 'string' && !!value.trim()),
    unit: text(data, 'unit') || null,
    description: text(data, 'description') || null,
    minimum_stock_level: Number(text(data, 'minimum_stock_level') || '10'),
  }
  if (!id) payload.status = 'active'
  return mutate(`/admin/pharmacy/medicines${id ? `/${id}` : ''}`, id ? 'PATCH' : 'POST', payload)
}

export async function setMasterStatusAction(kind: 'suppliers' | 'categories' | 'medicines', id: number, status: 'active' | 'inactive') {
  return mutate(`/admin/pharmacy/${kind}/${id}`, 'PATCH', { status })
}

export async function receiveAdminStockAction(data: FormData) {
  return mutate('/admin/pharmacy/inventory', 'POST', {
    medicine_id: Number(text(data, 'medicine_id')),
    supplier_id: Number(text(data, 'supplier_id')),
    batch_number: text(data, 'batch_number'),
    expiry_date: text(data, 'expiry_date'),
    quantity: Number(text(data, 'quantity')),
    purchase_price: text(data, 'purchase_price'),
    selling_price: text(data, 'selling_price'),
  })
}
