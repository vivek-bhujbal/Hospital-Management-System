'use client'

import { ChangeEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployeeStatusAction } from '@/app/actions/admin'

type EmployeeStatus = 'active' | 'inactive'

interface EmployeeStatusSelectProps {
  employeeId: number
  status: EmployeeStatus
}

export default function EmployeeStatusSelect({
  employeeId,
  status,
}: EmployeeStatusSelectProps) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState(status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as EmployeeStatus
    const previousStatus = selectedStatus
    setSelectedStatus(nextStatus)
    setError(null)

    startTransition(() => {
      void (async () => {
        try {
          const result = await updateEmployeeStatusAction(employeeId, nextStatus)
          if (result.error) {
            setSelectedStatus(previousStatus)
            setError(result.error)
            return
          }
          router.refresh()
        } catch {
          setSelectedStatus(previousStatus)
          setError('Status update failed')
        }
      })()
    })
  }

  return (
    <div>
      <select
        aria-label="Employee status"
        className="rounded border bg-white p-2 disabled:cursor-wait disabled:opacity-60"
        disabled={isPending}
        value={selectedStatus}
        onChange={handleChange}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <div className="mt-1 min-h-4 text-xs" aria-live="polite">
        {isPending && <span className="text-slate-500">Updating...</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </div>
  )
}
