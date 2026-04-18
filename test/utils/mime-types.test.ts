import assert from 'node:assert'
import { describe, it } from 'node:test'
import { getMimeType, isTextFile } from '#utils/mime-types.ts'

describe('getMimeType function', () => {
  it('should return the correct mime type for a given extension', () => {
    assert.equal(getMimeType('.html'), 'text/html; charset=utf-8')
    assert.equal(getMimeType('.css'), 'text/css; charset=utf-8')
    assert.equal(getMimeType('.js'), 'application/javascript; charset=utf-8')
    assert.equal(getMimeType('.json'), 'application/json; charset=utf-8')
    assert.equal(getMimeType('.txt'), 'text/plain; charset=utf-8')
    assert.equal(getMimeType('.svg'), 'image/svg+xml')
    assert.equal(getMimeType('.png'), 'image/png')
    assert.equal(getMimeType('.jpg'), 'image/jpeg')
    assert.equal(getMimeType('.jpeg'), 'image/jpeg')
    assert.equal(getMimeType('.gif'), 'image/gif')
    assert.equal(getMimeType('.ico'), 'image/x-icon')
    assert.equal(getMimeType('.webp'), 'image/webp')
    assert.equal(getMimeType('.mp4'), 'video/mp4')
    assert.equal(getMimeType('.webm'), 'video/webm')
    assert.equal(getMimeType('.ogg'), 'video/ogg')
    assert.equal(getMimeType('.mp3'), 'audio/mpeg')
    assert.equal(getMimeType('.wav'), 'audio/wav')
  })

  it('should return the default mime type for an unknown extension', () => {
    assert.equal(getMimeType('unknown'), 'text/plain; charset=utf-8')
    assert.equal(getMimeType(), 'text/plain; charset=utf-8')
    assert.equal(getMimeType(undefined), 'text/plain; charset=utf-8')
  })
})

describe('isTextFile function', () => {
  it('should return true for a text file', () => {
    assert.equal(isTextFile('.txt'), true)
    assert.equal(isTextFile('.html'), true)
    assert.equal(isTextFile('.css'), true)
    assert.equal(isTextFile('.js'), true)
  })

  it('should return false for a non-text file', () => {
    assert.equal(isTextFile('.png'), false)
    assert.equal(isTextFile('.jpg'), false)
    assert.equal(isTextFile('.jpeg'), false)
    assert.equal(isTextFile('.gif'), false)
    assert.equal(isTextFile('.ico'), false)
    assert.equal(isTextFile('.webp'), false)
  })

  it('should return true for a text file with an unknown extension', () => {
    assert.equal(isTextFile('unknown'), true)
    assert.equal(isTextFile(), true)
    assert.equal(isTextFile(undefined), true)
  })
})