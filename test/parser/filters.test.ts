import { describe, it } from 'node:test'
import assert from 'node:assert'
import { filterDate } from '#parser/liquid/filters.ts'
import { ParserError } from '#parser/utils.ts'

describe('filterDate', () => {
	it('formats Date with "year" preset', () => {
		const result = filterDate(new Date(2026, 3, 24), 'year')
		assert.strictEqual(result, '2026')
	})

	it('formats Date with "full" preset', () => {
		const result = filterDate(new Date(2026, 3, 24), 'full')
		assert.match(result, /24/)
		assert.match(result, /2026/)
	})

	it('formats Date with "rfc3339" preset', () => {
		const result = filterDate(new Date('2026-04-24T12:00:00Z'), 'rfc3339')
		assert.strictEqual(result, '2026-04-24T12:00:00.000Z')
	})

	it('accepts string input and coerces to Date', () => {
		const result = filterDate('2025-06-15', 'year')
		assert.strictEqual(result, '2025')
	})

	it('accepts ISO string for rfc3339', () => {
		const result = filterDate('2026-01-01T00:00:00Z', 'rfc3339')
		assert.strictEqual(result, '2026-01-01T00:00:00.000Z')
	})

	it('formats Date with "datetime" preset', () => {
		const result = filterDate(new Date(2026, 3, 24, 14, 30, 5), 'datetime')
		assert.strictEqual(result, '2026-04-24 14:30:05')
	})

	it('accepts numeric timestamp (Date.now()) input', () => {
		const ts = new Date('2026-04-24T12:00:00Z').getTime()
		const result = filterDate(ts, 'rfc3339')
		assert.strictEqual(result, '2026-04-24T12:00:00.000Z')
	})

	it('throws on unknown preset', () => {
		assert.throws(
			() => filterDate(new Date(), 'unknown'),
			ParserError
		)
	})

	it('throws on empty preset', () => {
		assert.throws(
			() => filterDate(new Date(), ''),
			ParserError
		)
	})

	it('returns consistent year for Date object and equivalent string', () => {
		const date = new Date(2024, 11, 31)
		const fromDate = filterDate(date, 'year')
		const fromString = filterDate(date.toISOString(), 'year')
		assert.strictEqual(fromDate, fromString)
	})
})
