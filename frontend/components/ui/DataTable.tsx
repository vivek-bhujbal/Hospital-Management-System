'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState, StatusBadge } from './HmsUI'

type JsonRecord = Record<string, unknown>

interface DataTableProps {
  records: JsonRecord[]
  columns: string[]
  label: string
}

function printable(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function csvValue(value: unknown) {
  return `"${printable(value).replaceAll('"', '""')}"`
}

export default function DataTable({ records, columns, label }: DataTableProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sortColumn, setSortColumn] = useState(columns[0] || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns))
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const pageSize = 10
  const activeColumns = columns.filter((column) => visibleColumns.has(column))

  const statuses = useMemo(() => Array.from(new Set(records.map((row) => printable(row.status)).filter((value) => value !== '—'))), [records])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return records
      .filter((row) => status === 'all' || printable(row.status) === status)
      .filter((row) => !needle || columns.some((column) => printable(row[column]).toLowerCase().includes(needle)))
      .sort((a, b) => {
        const left = printable(a[sortColumn]).toLowerCase()
        const right = printable(b[sortColumn]).toLowerCase()
        return left.localeCompare(right, undefined, { numeric: true }) * (sortDirection === 'asc' ? 1 : -1)
      })
  }, [columns, query, records, sortColumn, sortDirection, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const sortBy = (column: string) => {
    if (sortColumn === column) setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')
    else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const recordKey = (record: JsonRecord, _index: number) => String(record.id ?? records.indexOf(record))
  const exportCsv = (source = filtered) => {
    const csv = [activeColumns.map(csvValue).join(','), ...source.map((row) => activeColumns.map((column) => csvValue(row[column])).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${label.toLowerCase().replaceAll(' ', '-')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="hms-card overflow-hidden" aria-label={label}>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="hms-input pl-9" placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label}`} />
        </div>
        <div className="flex gap-2">
          {statuses.length > 0 && (
            <label className="relative min-w-0 flex-1 sm:flex-none">
              <SlidersHorizontal aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="hms-input min-w-36 pl-9 pr-8">
                <option value="all">All statuses</option>
                {statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
          )}
          <details className="relative">
            <summary className="hms-button hms-button-secondary cursor-pointer list-none" aria-label="Choose visible columns"><Columns3 className="h-4 w-4" /><span className="hidden sm:inline">Columns</span></summary>
            <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border bg-[var(--hms-surface)] p-2 shadow-raised">
              <p className="px-2 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Visible columns</p>
              {columns.map((column) => <label key={column} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm capitalize hover:bg-[var(--hms-surface-muted)]"><input type="checkbox" checked={visibleColumns.has(column)} onChange={() => setVisibleColumns((current) => { const next = new Set(current); if (next.has(column) && next.size > 1) next.delete(column); else next.add(column); return next })} className="h-4 w-4 rounded border-slate-300 accent-brand-700" />{column.replaceAll('_', ' ')}</label>)}
            </div>
          </details>
          <button type="button" onClick={() => exportCsv()} disabled={filtered.length === 0} className="hms-button hms-button-secondary" aria-label={`Export ${label} as CSV`}><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>
        </div>
      </div>

      {selected.size > 0 && <div className="flex flex-col gap-2 border-b bg-brand-50 px-4 py-3 text-sm dark:bg-brand-950/30 sm:flex-row sm:items-center"><p className="font-semibold text-brand-900 dark:text-brand-200">{selected.size} {selected.size === 1 ? 'row' : 'rows'} selected</p><div className="flex gap-2 sm:ml-auto"><button type="button" onClick={() => exportCsv(filtered.filter((record, index) => selected.has(recordKey(record, index))))} className="hms-button hms-button-secondary min-h-9 py-1.5"><Download className="h-4 w-4" />Export selected</button><button type="button" onClick={() => setSelected(new Set())} className="hms-button hms-button-secondary min-h-9 px-2.5 py-1.5" aria-label="Clear selection"><X className="h-4 w-4" /></button></div></div>}

      {visible.length === 0 ? (
        <EmptyState title={query || status !== 'all' ? 'No matching records' : `No ${label.toLowerCase()} yet`} description={query || status !== 'all' ? 'Try changing your search or status filter.' : 'Records will appear here when they are available.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr><th className="w-12 px-4 py-3.5"><input type="checkbox" aria-label="Select all rows on this page" checked={visible.length > 0 && visible.every((record, index) => selected.has(recordKey(record, index)))} onChange={(event) => setSelected((current) => { const next = new Set(current); visible.forEach((record, index) => { const key = recordKey(record, index); event.target.checked ? next.add(key) : next.delete(key) }); return next })} className="h-4 w-4 rounded border-slate-300 accent-brand-700" /></th>{activeColumns.map((column) => <th key={column} className="px-5 py-3.5 text-left"><button type="button" onClick={() => sortBy(column)} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-brand-700">{column.replaceAll('_', ' ')}<ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 ${sortColumn === column && sortDirection === 'desc' ? 'rotate-180' : ''}`} /></button></th>)}</tr></thead>
            <tbody className="divide-y">{visible.map((record, index) => { const key = recordKey(record, index); return <tr key={key} className={selected.has(key) ? 'bg-brand-50/50 dark:bg-brand-950/20' : undefined}><td className="px-4 py-4"><input type="checkbox" aria-label={`Select row ${index + 1}`} checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next })} className="h-4 w-4 rounded border-slate-300 accent-brand-700" /></td>{activeColumns.map((column) => <td key={column} className="max-w-xs px-5 py-4">{column.toLowerCase().includes('status') ? <StatusBadge status={printable(record[column])} /> : <span className="break-words">{printable(record[column])}</span>}</td>)}</tr>})}</tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t bg-slate-50/60 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
        <p>{filtered.length === 0 ? '0 records' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} className="hms-button hms-button-secondary min-h-9 px-2.5" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-2 font-medium text-slate-700 dark:text-slate-300">Page {safePage} of {pageCount}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={safePage === pageCount} className="hms-button hms-button-secondary min-h-9 px-2.5" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </footer>
    </section>
  )
}
