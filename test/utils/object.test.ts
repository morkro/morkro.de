import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getFromObject } from '#utils/object.ts'

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
