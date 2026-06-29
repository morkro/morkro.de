import { describe, it } from 'node:test'
import assert from 'node:assert'
import { escapeXML } from '#utils/html.ts'

describe('escapeXML function', () => {
  it('should escape the XML correctly', () => {
    assert.strictEqual(
      escapeXML('<div>Hello & World</div>'),
      '&lt;div&gt;Hello &amp; World&lt;/div&gt;')
  })
})