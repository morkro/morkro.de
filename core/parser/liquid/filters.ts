import type { FilterFn } from "#config.user";
import { ParserError } from "#parser/utils.ts";

const datePresets = {
  rfc3339: 'iso',
  year: { year: 'numeric' },
  full: { day: '2-digit', month: 'long', year: 'numeric' },
  datetime: 'datetime',
}

export function filterDate (input: unknown, preset: string): string {
  const date = input instanceof Date ? input : new Date(typeof input === 'number' ? input : String(input))
  const options = datePresets[preset as keyof typeof datePresets]
  if (!options) {
    throw new ParserError(`Unknown date preset: ${preset}`, 0)
  }

  if (options === 'iso') {
    return date.toISOString()
  }

  if (options === 'datetime') {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}:${s}`
  }

  return new Intl.DateTimeFormat('de-DE', options as Intl.DateTimeFormatOptions).format(date)
}

export function filterJoin (input: unknown, separator: string): string {
  return Array.isArray(input) ? input.join(separator) : String(input)
}

export function filterReplace (input: unknown, search: string, replace: string): string {
  return String(input).replaceAll(search, replace)
}

export function filterPrepend (input: unknown, prefix: string): string {
  return String(input).startsWith(prefix) ? String(input) : prefix + String(input)
}

export function applyFilter (name: string, input: unknown, args: unknown[], userFilters: Record<string, FilterFn>): unknown {
  const userFilter = userFilters?.[name]
  if (userFilter) {
    return userFilter(input, ...args)
  }

  switch (name) {
    case 'date':
      return filterDate(input, args[0] as string)
    case 'join':
      return filterJoin(input, args[0] as string)
    case 'replace':
      return filterReplace(input, args[0] as string, args[1] as string)
    case 'prepend':
      return filterPrepend(input, args[0] as string)
    default:
      throw new ParserError(`Unknown filter: ${name}`, 0)
  }
}