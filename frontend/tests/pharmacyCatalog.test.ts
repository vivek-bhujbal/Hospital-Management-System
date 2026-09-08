import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-ignore Node executes the TypeScript source directly.
import { PHARMACY_CATALOG, CATALOG_CATEGORIES, MEDICINE_UNITS, catalogForSpecialty } from '../lib/pharmacyCatalog.ts'

test('catalog has unique complete medicine records and valid stock units', () => {
  assert.ok(PHARMACY_CATALOG.length >= 90)
  assert.equal(new Set(PHARMACY_CATALOG.map(item => item.name)).size, PHARMACY_CATALOG.length)
  for (const item of PHARMACY_CATALOG) {
    assert.ok(item.generic_name && item.name && item.category)
    assert.ok(MEDICINE_UNITS.includes(item.unit))
    assert.ok(CATALOG_CATEGORIES.includes(item.category))
  }
})

test('specialty filters use relevant catalog groups and allow all medicines', () => {
  assert.equal(catalogForSpecialty('').length, PHARMACY_CATALOG.length)
  assert.ok(catalogForSpecialty('Cardiologist — heart').some(item => item.generic_name === 'Amlodipine'))
  assert.ok(!catalogForSpecialty('Cardiologist — heart').some(item => item.category === 'Antipsychotics'))
  assert.ok(catalogForSpecialty('Pediatric Neurologist').some(item => item.category === 'Antiepileptics'))
  assert.ok(catalogForSpecialty('Pediatric Neurologist').some(item => item.category === 'Pediatric oral formulations'))
  assert.deepEqual(catalogForSpecialty('Custom unconfigured specialty'), [])
})
