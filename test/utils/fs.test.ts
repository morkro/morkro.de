import { describe, it } from 'node:test'
import assert from 'node:assert'
import { ensureExtension } from '#utils/fs.ts'

describe('ensureExtension function', () => {
	it('appends extension when file has none', () => {
		assert.strictEqual(ensureExtension('layout', '.liquid'), 'layout.liquid')
	})

	it('returns unchanged when file already has the extension', () => {
		assert.strictEqual(ensureExtension('layout.liquid', '.liquid'), 'layout.liquid')
	})

	it('appends extension when file has a different extension', () => {
		assert.strictEqual(ensureExtension('layout.html', '.liquid'), 'layout.html.liquid')
	})

	it('handles extension without leading dot', () => {
		assert.strictEqual(ensureExtension('file.ts', 'ts'), 'file.ts')
	})

	it('handles empty filename', () => {
		assert.strictEqual(ensureExtension('', '.liquid'), '.liquid')
	})

	it('handles filename that partially matches extension', () => {
		assert.strictEqual(ensureExtension('file.liqu', '.liquid'), 'file.liqu.liquid')
	})
})
