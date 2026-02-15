import { describe, it } from 'node:test'
import assert from 'node:assert'
import { loadLayout } from '#root/parser.ts'

describe('loadLayout function', () => {
  it('should throw an error if the layout file is not found', () => {
    assert.rejects(async () => await loadLayout('../../not-found'), Error)
    assert.rejects(async () => await loadLayout('../../etc/passwd'), Error)
  })
})