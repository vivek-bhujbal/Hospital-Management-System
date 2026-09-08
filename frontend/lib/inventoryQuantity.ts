import type { InventoryBatch } from './pharmacistTypes'

export function currentMedicineStock(inventory: InventoryBatch[], medicineId: string) {
  return inventory.filter(batch => String(batch.medicine_id) === medicineId).reduce((total, batch) => total + batch.available_quantity, 0)
}
