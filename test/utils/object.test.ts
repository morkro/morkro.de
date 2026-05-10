import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getFromObject, mergeMapValues } from '#utils/object.ts'

describe('getFromObject function', () => {
  const object = { a: { b: { c: 'd' } } }
  it('should return the value from the object', () => {
    assert.strictEqual(getFromObject(['a', 'b', 'c'], object), 'd')
  })
  it('should return the value if params array has only one element', () => {
    assert.deepStrictEqual(getFromObject(['a'], object), { b: { c: 'd' } })
  })
  it('should return undefined if params array is empty', () => {
    assert.strictEqual(getFromObject([], object), undefined)
  })
  it('should return undefined if value is not an object', () => {
    assert.strictEqual(getFromObject(['a', 'b'], { a: 'string' }), undefined)
  })
})

describe('mergeMapValues function', () => {
  it('should merge the values of the maps', () => {
    assert.deepStrictEqual(
      mergeMapValues(
        new Map([['a', 1]]),
        new Map([['b', 2]]),
        (base, over) => (base ?? 0) + (over ?? 0)),
      new Map([['a', 1], ['b', 2]])
    )
  })

  it('shoult merge values with only one Map', () => {
    assert.deepStrictEqual(
      mergeMapValues(
        new Map([['a', 1]]),
        new Map([]),
        (base, over) => (base ?? 0) + (over ?? 0)),
      new Map([['a', 1]])
    )
  })
})