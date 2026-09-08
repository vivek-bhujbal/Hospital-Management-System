export interface CatalogMedicine {
  name: string
  generic_name: string
  category: string
  unit: string
}

const groups: Array<[string, string, string, string]> = [
  ['Analgesics', 'Tablet', 'tablet', 'Paracetamol|Ibuprofen|Naproxen|Diclofenac'],
  ['Antibiotics', 'Capsule', 'capsule', 'Amoxicillin|Doxycycline|Cefalexin'],
  ['Antibiotics', 'Tablet', 'tablet', 'Azithromycin|Clarithromycin|Metronidazole|Ciprofloxacin'],
  ['Antifungals', 'Capsule', 'capsule', 'Fluconazole'],
  ['Antivirals', 'Tablet', 'tablet', 'Aciclovir'],
  ['Antihistamines', 'Tablet', 'tablet', 'Cetirizine|Loratadine|Fexofenadine'],
  ['Antihypertensives', 'Tablet', 'tablet', 'Amlodipine|Losartan|Enalapril|Bisoprolol|Metoprolol'],
  ['Antiplatelets', 'Tablet', 'tablet', 'Aspirin|Clopidogrel'],
  ['Anticoagulants', 'Tablet', 'tablet', 'Apixaban|Warfarin'],
  ['Lipid lowering medicines', 'Tablet', 'tablet', 'Atorvastatin|Rosuvastatin'],
  ['Diuretics', 'Tablet', 'tablet', 'Furosemide|Spironolactone'],
  ['Antidiabetics', 'Tablet', 'tablet', 'Metformin|Gliclazide|Empagliflozin|Linagliptin'],
  ['Thyroid medicines', 'Tablet', 'tablet', 'Levothyroxine|Carbimazole'],
  ['Respiratory medicines', 'Inhaler', 'inhaler', 'Salbutamol|Budesonide|Beclometasone'],
  ['Respiratory medicines', 'Tablet', 'tablet', 'Montelukast'],
  ['Acid suppression medicines', 'Capsule', 'capsule', 'Omeprazole|Lansoprazole'],
  ['Acid suppression medicines', 'Tablet', 'tablet', 'Pantoprazole'],
  ['Antiemetics', 'Tablet', 'tablet', 'Ondansetron|Metoclopramide'],
  ['Laxatives', 'Bottle', 'oral solution', 'Lactulose'],
  ['Laxatives', 'Sachet', 'powder for oral solution', 'Macrogol'],
  ['Inflammatory bowel medicines', 'Tablet', 'tablet', 'Mesalazine'],
  ['Antiepileptics', 'Tablet', 'tablet', 'Levetiracetam|Lamotrigine|Carbamazepine'],
  ['Neuropathic pain medicines', 'Capsule', 'capsule', 'Gabapentin|Pregabalin'],
  ['Antidepressants', 'Tablet', 'tablet', 'Sertraline|Fluoxetine|Escitalopram|Amitriptyline'],
  ['Antipsychotics', 'Tablet', 'tablet', 'Olanzapine|Risperidone|Aripiprazole'],
  ['Dementia medicines', 'Tablet', 'tablet', 'Donepezil|Memantine'],
  ['Muscle relaxants', 'Tablet', 'tablet', 'Baclofen'],
  ['Corticosteroids', 'Tablet', 'tablet', 'Prednisolone|Dexamethasone'],
  ['Antirheumatic medicines', 'Tablet', 'tablet', 'Hydroxychloroquine|Methotrexate'],
  ['Gout medicines', 'Tablet', 'tablet', 'Allopurinol|Colchicine'],
  ['Bone health medicines', 'Tablet', 'tablet', 'Alendronic acid'],
  ['Vitamins and minerals', 'Tablet', 'tablet', 'Folic acid|Ferrous sulfate|Cyanocobalamin|Colecalciferol'],
  ['Dermatology medicines', 'Tube', 'cream', 'Clotrimazole|Hydrocortisone|Fusidic acid'],
  ['Dermatology medicines', 'Tube', 'gel', 'Benzoyl peroxide'],
  ['Ophthalmic medicines', 'Bottle', 'eye drops', 'Latanoprost|Timolol|Carmellose sodium|Chloramphenicol'],
  ['ENT medicines', 'Bottle', 'nasal spray', 'Fluticasone|Mometasone'],
  ['ENT medicines', 'Tablet', 'tablet', 'Betahistine'],
  ['Urology medicines', 'Capsule', 'capsule', 'Tamsulosin|Nitrofurantoin'],
  ['Urology medicines', 'Tablet', 'tablet', 'Finasteride|Oxybutynin|Mirabegron'],
  ['Reproductive health medicines', 'Capsule', 'capsule', 'Progesterone'],
  ['Reproductive health medicines', 'Tablet', 'tablet', 'Medroxyprogesterone'],
  ['Oncology medicines', 'Tablet', 'tablet', 'Tamoxifen|Anastrozole|Letrozole'],
  ['Dental medicines', 'Bottle', 'mouthwash', 'Chlorhexidine'],
  ['Smoking cessation medicines', 'Patch', 'transdermal patch', 'Nicotine'],
  ['Sleep medicines', 'Tablet', 'tablet', 'Melatonin'],
  ['Pediatric oral formulations', 'Bottle', 'oral suspension', 'Paracetamol|Ibuprofen|Amoxicillin'],
]

export const PHARMACY_CATALOG: CatalogMedicine[] = groups.flatMap(([category, unit, form, names]) =>
  names.split('|').map(generic_name => ({ name: `${generic_name} ${form}`, generic_name, category, unit })),
).sort((first, second) => first.name.localeCompare(second.name))

export const CATALOG_CATEGORIES = Array.from(new Set(PHARMACY_CATALOG.map(item => item.category))).sort()
export const MEDICINE_UNITS = ['Tablet', 'Capsule', 'Bottle', 'Vial', 'Ampoule', 'Tube', 'Sachet', 'Inhaler', 'Patch', 'Suppository', 'Syringe', 'Bag', 'Pen', 'Cartridge', 'Strip', 'Pack', 'Drop', 'mL', 'g']

const specialtyCategories: Array<[RegExp, string[]]> = [
  [/cardio|vascular/i, ['Antihypertensives', 'Antiplatelets', 'Anticoagulants', 'Lipid lowering medicines', 'Diuretics']],
  [/pulmono|chest|allerg|immuno/i, ['Respiratory medicines', 'Antihistamines', 'Corticosteroids']],
  [/gastro|hepato|colorectal|bariatric/i, ['Acid suppression medicines', 'Antiemetics', 'Laxatives', 'Inflammatory bowel medicines']],
  [/endocrin/i, ['Antidiabetics', 'Thyroid medicines', 'Vitamins and minerals']],
  [/nephro|transplant/i, ['Antihypertensives', 'Diuretics', 'Vitamins and minerals']],
  [/neuro/i, ['Antiepileptics', 'Neuropathic pain medicines', 'Muscle relaxants', 'Dementia medicines']],
  [/psychiatr/i, ['Antidepressants', 'Antipsychotics', 'Sleep medicines']],
  [/rheumat|orthoped|sports|rehabilitation|physiatrist/i, ['Analgesics', 'Antirheumatic medicines', 'Gout medicines', 'Bone health medicines', 'Muscle relaxants']],
  [/dermato|trichology|plastic/i, ['Dermatology medicines', 'Antifungals', 'Antihistamines']],
  [/ophthalm/i, ['Ophthalmic medicines']],
  [/\bENT\b|otolog|rhinolog|laryngolog/i, ['ENT medicines', 'Antihistamines']],
  [/obstet|gyneco|OB-GYN|maternal|reproduct|fertility/i, ['Reproductive health medicines', 'Vitamins and minerals']],
  [/urolog|androlog|sexual/i, ['Urology medicines']],
  [/oncolo/i, ['Oncology medicines', 'Antiemetics']],
  [/hematolog/i, ['Vitamins and minerals', 'Anticoagulants']],
  [/dent|orthodont|oral|maxillofacial|periodont|endodont|prosthodont/i, ['Dental medicines', 'Analgesics']],
  [/infectious/i, ['Antibiotics', 'Antifungals', 'Antivirals']],
  [/pediatric|neonat|adolescent/i, ['Pediatric oral formulations']],
  [/pain|palliative|hospice/i, ['Analgesics', 'Neuropathic pain medicines', 'Antiemetics', 'Laxatives']],
  [/addiction|preventive|occupational/i, ['Smoking cessation medicines']],
  [/sleep/i, ['Sleep medicines']],
  [/surgeon|anesthe|emergency|critical care|trauma/i, ['Analgesics', 'Antiemetics']],
]

export function catalogForSpecialty(specialty: string): CatalogMedicine[] {
  if (!specialty || /general physician|internal medicine|family medicine|general practitioner|geriatric/i.test(specialty)) return PHARMACY_CATALOG
  const categories = new Set(specialtyCategories.filter(([pattern]) => pattern.test(specialty)).flatMap(([, values]) => values))
  return PHARMACY_CATALOG.filter(item => categories.has(item.category))
}
