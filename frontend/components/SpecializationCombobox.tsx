import { DOCTOR_SPECIALIZATIONS } from '@/lib/doctorSpecializations'

type SpecializationComboboxProps = {
  id: string
  defaultValue?: string | null
  className?: string
  ariaLabel?: string
}

export default function SpecializationCombobox({
  id,
  defaultValue = '',
  className = 'hms-input',
  ariaLabel = 'Doctor specialization',
}: SpecializationComboboxProps) {
  const currentValue = defaultValue?.trim() || ''
  const options = currentValue && !DOCTOR_SPECIALIZATIONS.some((specialization) => specialization === currentValue)
    ? [currentValue, ...DOCTOR_SPECIALIZATIONS]
    : DOCTOR_SPECIALIZATIONS

  return (
    <>
      <input
        id={id}
        name="specialization"
        type="text"
        list={`${id}-options`}
        defaultValue={currentValue}
        aria-label={ariaLabel}
        autoComplete="off"
        required
        placeholder="Search specialization"
        className={className}
      />
      <datalist id={`${id}-options`}>
        {options.map((specialization) => (
          <option key={specialization} value={specialization} />
        ))}
      </datalist>
    </>
  )
}
