import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
	stripQuotes,
	getIndentWidth,
	ParserError,
	BreakSignal,
	ContinueSignal,
} from '#parser/utils.ts'

describe('stripQuotes function', () => {
	it('removes matching double quotes', () => {
		assert.strictEqual(stripQuotes('"hello"'), 'hello')
	})

	it('removes matching single quotes', () => {
		assert.strictEqual(stripQuotes("'hello'"), 'hello')
	})

	it('leaves unquoted strings unchanged', () => {
		assert.strictEqual(stripQuotes('hello'), 'hello')
	})

	it('leaves mismatched quotes unchanged', () => {
		assert.strictEqual(stripQuotes('"hello\''), '"hello\'')
	})

	it('trims surrounding whitespace before stripping quotes', () => {
		assert.strictEqual(stripQuotes('  "hello"  '), 'hello')
	})

	it('handles empty string', () => {
		assert.strictEqual(stripQuotes(''), '')
	})

	it('handles empty quoted string', () => {
		assert.strictEqual(stripQuotes('""'), '')
	})

	it('preserves inner quotes of a different type', () => {
		assert.strictEqual(stripQuotes('"it\'s"'), "it's")
	})

	it('only strips the outermost pair', () => {
		assert.strictEqual(stripQuotes('\'"nested"\''), '"nested"')
	})
})

describe('getIndentWidth function', () => {
	it('returns 0 for a line with no indentation', () => {
		assert.strictEqual(getIndentWidth('hello'), 0)
	})

	it('counts leading spaces', () => {
		assert.strictEqual(getIndentWidth('    hello'), 4)
	})

	it('counts leading tabs', () => {
		assert.strictEqual(getIndentWidth('\t\thello'), 2)
	})

	it('counts mixed whitespace characters', () => {
		assert.strictEqual(getIndentWidth('\t  hello'), 3)
	})

	it('returns full length for all-whitespace line', () => {
		assert.strictEqual(getIndentWidth('    '), 4)
	})

	it('returns 0 for empty string', () => {
		assert.strictEqual(getIndentWidth(''), 0)
	})
})

describe('ParserError class', () => {
	it('stores raw message, source, and offset', () => {
		const error = new ParserError('bad token', 5, 'hello world', 'test.liquid')
		assert.strictEqual(error.rawMessage, 'bad token')
		assert.strictEqual(error.source, 'hello world')
		assert.strictEqual(error.offset, 5)
	})

	it('is an instance of Error', () => {
		const error = new ParserError('fail', 0)
		assert(error instanceof Error)
		assert(error instanceof ParserError)
	})

	it('includes file path in message when provided', () => {
		const error = new ParserError('unexpected token', 0, undefined, 'page.liquid')
		assert.ok(error.message.includes('in page.liquid'))
	})

	it('builds message without file path when omitted', () => {
		const error = new ParserError('unexpected token', 0)
		assert.ok(!error.message.includes(' in '))
	})

	it('includes source location snippet when source is provided', () => {
		const source = 'line one\nline two\nline three'
		const offset = 10
		const error = new ParserError('error here', offset, source)
		assert.ok(error.message.includes('line two'))
		assert.ok(error.message.includes('^'))
	})

	it('handles offset at the start of source', () => {
		const source = 'first line\nsecond line'
		const error = new ParserError('start error', 0, source)
		assert.strictEqual(error.offset, 0)
		assert.ok(error.message.includes('first line'))
	})

	it('handles offset beyond source length by clamping', () => {
		const source = 'short'
		const error = new ParserError('past end', 999, source)
		assert.strictEqual(error.offset, 999)
		assert.ok(error.message.includes('short'))
	})

	it('source is undefined when not provided', () => {
		const error = new ParserError('no source', 0)
		assert.strictEqual(error.source, undefined)
	})
})

describe('BreakSignal class', () => {
	it('creates a distinct signal instance', () => {
		const signal = new BreakSignal()
		assert(signal instanceof BreakSignal)
		assert(!(signal instanceof ContinueSignal))
	})
})

describe('ContinueSignal class', () => {
	it('creates a distinct signal instance', () => {
		const signal = new ContinueSignal()
		assert(signal instanceof ContinueSignal)
		assert(!(signal instanceof BreakSignal))
	})
})
