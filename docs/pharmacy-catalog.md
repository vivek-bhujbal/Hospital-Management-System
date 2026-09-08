# Admin medicine dropdowns

Admin can use **Add actual stock** to record physical quantity with supplier,
batch, expiry and prices. This writes to the same inventory and audit trail used
by Pharmacist. Pharmacist sees the batch without receiving it a second time; an
open inventory page refreshes every 30 seconds and on tab focus. Receive stock
shows the selected medicine's already recorded remaining quantity separately
from the blank new-stock input. Minimum stock level is only an alert threshold,
never a source of actual inventory. Existing threshold values are not converted
into stock, and no batch, expiry or price is fabricated.

The Add/Edit medicine form combines the existing doctor specialization options,
actual doctor specializations, existing medicine labels, and a reference catalog.
Select a specialty, search the catalog, then choose a medicine to fill its generic
name, category and stock unit. Confirm the actual product strength and formulation.
Custom medicines, generic names, categories and units remain supported.

Reference suggestions are not stock, prescriptions, or a complete formulary.
Opening the page does not create records. Saving a medicine with a suggested/new
category creates that category in the same database transaction. Existing category
names are reused case-insensitively; inactive categories are rejected. Failures
roll back the medicine and any newly created category together. Admin-only access,
audit records and existing pharmacist stock permissions remain unchanged.

Names are cross-checked against the [NHS Medicines A–Z](https://www.nhs.uk/medicines/).
The [WHO essential medicines guidance](https://www.who.int/news-room/fact-sheets/detail/essential-medicines)
provides formulary context, not endorsement of this local catalog. Specialty groups
are local browsing tags, not a WHO/NHS specialty-to-prescriber authorization mapping.
No patient doses, pediatric eligibility, contraindication checks, or prescribing
rights are inferred. Pediatric specialists can see specialty groups; this does not
mean every displayed formulation is suitable for a child. Specialties without a
configured group show an explicit empty state and support custom entries.

Maintain reference templates and browsing groups in `frontend/lib/pharmacyCatalog.ts`.
Hospital pharmacy staff must review exact products and local availability before
clinical use. No database seed/import runs automatically.
