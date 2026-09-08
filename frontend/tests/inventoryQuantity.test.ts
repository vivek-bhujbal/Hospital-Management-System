import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-ignore Node executes TypeScript directly.
import { currentMedicineStock } from '../lib/inventoryQuantity.ts'
import type { InventoryBatch } from '../lib/pharmacistTypes'

test('shows remaining shared stock without duplicating receipts or using a threshold', () => {
  const batches = [
    { medicine_id: 1, available_quantity: 100, quantity: 100 },
    { medicine_id: 1, available_quantity: 30, quantity: 50 },
    { medicine_id: 2, available_quantity: 900, quantity: 900 },
  ] as InventoryBatch[]
  assert.equal(currentMedicineStock(batches, '1'), 130)
  assert.equal(currentMedicineStock(batches, '2'), 900)
  assert.equal(currentMedicineStock(batches, ''), 0)
  assert.equal(currentMedicineStock([], '1'), 0)
  assert.equal(batches.length, 3)
})
