import { describe, it } from "node:test"
import assert from 'node:assert'
import { parseJSON } from "#utils/json.ts"

describe('parseJSON() function', () => {
  it('should parse the JSON correctly', () => {
    const json = parseJSON<{ a: string }>('{"a": "b"}', 'test.json')
    assert.strictEqual(json.a, 'b')
  })
  it('should throw an error if the JSON is invalid', () => {
    assert.throws(() => parseJSON<{ a: string }>('{"a": "b"', 'test.json'), Error)
  })
})