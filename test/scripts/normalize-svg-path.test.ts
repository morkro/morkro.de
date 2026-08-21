import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  type BlobPath,
  deformBlobPath,
  extractAllPathData,
  extractPathData,
  normalizeSvgPath,
  serializeBlobPath,
  toBlobPath,
  toKeyframesBlock,
} from '../../scripts/normalize-svg-path.ts'

const PAGE_TOP_LEFT_BLOB =
  'M23.363 0c16.474 16.776 44.851 22.374 72.523 27.833 36.05 7.112 70.904 13.988 76.685 45.036 5.748 30.871-25.876 45.568-59.451 61.172-24.453 11.365-49.941 23.21-62.782 42.136-13.408 19.763-16.61 43.746-19.806 67.701-3.266 24.475-6.529 48.921-20.67 68.806-3.194 4.491-6.482 9.304-9.862 14.328V0h23.363Z'

const HEADER_SMALL_BLOB =
  'M 42.721 37.562 C 46.995 42.638 47.943 50.042 46.118 56.434 C 44.318 62.743 39.295 67.649 33.35 70.398 C 27.896 72.92 21.761 72.123 16.026 70.35 C 10.558 68.659 5.409 65.798 2.501 60.858 C -0.433 55.874 -0.408 49.943 0.663 44.252 C 1.847 37.963 2.935 30.296 8.751 27.652 C 14.46 25.057 20.103 30.926 26.117 32.68 C 31.875 34.359 38.855 32.97 42.721 37.562 Z'

const SECTION_BORDER =
  'M984.457 32.182c53.352-1.698 104.799-7.169 156.258-12.946l15.905-1.797c66.964-7.595 90.201-10.343 166.257-6.991 60.533 2.668 103.125 13.858 117.127 25.87V45H-5.375c-1.86-5.455.526-11.064 5.89-15.196l.975-.746C14.422 19.266 31.165 11.02 55.103 7.065c47.74-7.87 96.066-9.287 143.915.38l1.48.303c156.487 32.335 228.197 8.662 363.656-4.071 186.988-17.568 253.336 33.81 420.303 28.505z'

const countCubics = (pathData: string) => [...pathData.matchAll(/C /g)].length

describe('normalizeSvgPath', () => {
  it('rewrites lines to cubics with a matching close', () => {
    const normalized = normalizeSvgPath('M 0 0 H 10 V 10 Z')
    assert.equal(
      normalized,
      'M 0 0 C 3.333 0 6.667 0 10 0 C 10 3.333 10 6.667 10 10 Z',
    )
  })

  it('expands implicit relative cubics to absolute C commands', () => {
    const normalized = normalizeSvgPath('M 0 0 c 0 0 0 0 10 0 0 0 0 0 0 10 Z')
    assert.equal(countCubics(normalized), 2)
    assert.match(normalized, /^M 0 0 C /)
    assert.match(normalized, /C 10 0 10 0 10 10 Z$/)
  })

  it('normalizes the page-top-left blob to M + 9 cubics + Z', () => {
    const normalized = normalizeSvgPath(PAGE_TOP_LEFT_BLOB)
    assert.match(normalized, /^M 23.363 0 /)
    assert.equal(countCubics(normalized), 9)
    assert.match(normalized, / C 0 [\d.]+ 0 [\d.]+ 0 0 C /)
    assert.match(normalized, / 23.363 0 Z$/)
  })

  it('rejects arc commands', () => {
    assert.throws(() => normalizeSvgPath('M 0 0 A 1 1 0 0 0 10 0 Z'), /Arc commands/)
  })
})

describe('toBlobPath', () => {
  it('reads a closed loop as a start point plus cubics', () => {
    const blob = toBlobPath(HEADER_SMALL_BLOB)
    assert.equal(blob.cubics.length, 8)
    assert.deepEqual(blob.start, { x: 42.721, y: 37.562 })
    assert.deepEqual(blob.cubics.at(-1)?.x, 42.721)
  })

  it('round-trips through serialization unchanged', () => {
    const blob = toBlobPath(HEADER_SMALL_BLOB)
    assert.equal(serializeBlobPath(blob), HEADER_SMALL_BLOB)
  })

  it('rejects an open path', () => {
    assert.throws(
      () => toBlobPath('M 0 0 C 1 1 2 2 3 3 C 4 4 5 5 6 6 C 7 7 8 8 9 9'),
      /closed loop/,
    )
  })

  it('rejects multiple subpaths', () => {
    assert.throws(
      () => toBlobPath(`${HEADER_SMALL_BLOB} M 100 100 C 1 1 2 2 3 3 Z`),
      /single subpath/,
    )
  })
})

describe('deformBlobPath', () => {
  const blob = toBlobPath(HEADER_SMALL_BLOB)

  it('keeps the command structure so stops can interpolate', () => {
    const stops = deformBlobPath(blob, { amplitude: 7 })
    assert.equal(stops.length, 3)
    for (const stop of stops) {
      assert.equal(stop.cubics.length, blob.cubics.length)
      assert.equal(countCubics(serializeBlobPath(stop)), countCubics(HEADER_SMALL_BLOB))
    }
  })

  it('keeps every stop closed on its own start point', () => {
    for (const stop of deformBlobPath(blob, { amplitude: 9, stops: 4 })) {
      const last = stop.cubics.at(-1)
      assert.ok(last)
      assert.ok(Math.hypot(last.x - stop.start.x, last.y - stop.start.y) < 0.001)
    }
  })

  it('actually moves the outline by roughly the requested amplitude', () => {
    const [stop] = deformBlobPath(blob, { amplitude: 8 })
    const distances = stop.cubics.map((cubic, index) => (
      Math.hypot(cubic.x - blob.cubics[index].x, cubic.y - blob.cubics[index].y)
    ))
    const largest = Math.max(...distances)
    assert.ok(largest > 4, `expected a visible offset, saw ${largest}`)
    assert.ok(largest < 8 * 1.4, `expected offsets near the amplitude, saw ${largest}`)
  })

  it('leaves locked vertices untouched', () => {
    const locked = new Set([0, 3])
    const [stop] = deformBlobPath(blob, { amplitude: 12, locked })
    assert.deepEqual(stop.start, blob.start)
    assert.equal(stop.cubics[2].x, blob.cubics[2].x)
    assert.equal(stop.cubics[2].y, blob.cubics[2].y)
  })

  it('is deterministic per seed', () => {
    const first = deformBlobPath(blob, { amplitude: 6, seed: 42 })
    const second = deformBlobPath(blob, { amplitude: 6, seed: 42 })
    const third = deformBlobPath(blob, { amplitude: 6, seed: 43 })
    assert.deepEqual(first, second)
    assert.notDeepEqual(first, third)
  })

  it('spaces stops evenly around the phase cycle', () => {
    const stops = deformBlobPath(blob, { amplitude: 10, stops: 4 })
    const gaps = stops.map((stop, index) => {
      const next = stops[(index + 1) % stops.length]
      return Math.max(...stop.cubics.map((cubic, cubicIndex) => (
        Math.hypot(cubic.x - next.cubics[cubicIndex].x, cubic.y - next.cubics[cubicIndex].y)
      )))
    })
    const smallest = Math.min(...gaps)
    const largest = Math.max(...gaps)
    assert.ok(largest / smallest < 2, `stop spacing is uneven: ${gaps.join(', ')}`)
  })

  it('rejects a zero amplitude', () => {
    assert.throws(() => deformBlobPath(blob, { amplitude: 0 }), /greater than zero/)
  })

  it('rejects an unknown axis or bias', () => {
    assert.throws(
      () => deformBlobPath(blob, { amplitude: 5, axis: 'sideways' as never }),
      /Unknown deform axis/,
    )
    assert.throws(
      () => deformBlobPath(blob, { amplitude: 5, bias: 'upwards' as never }),
      /Unknown deform bias/,
    )
  })
})

describe('deformBlobPath axis', () => {
  /* Wide and flat: the radial direction is near-horizontal at every vertex. */
  const WIDE_PATH =
    'M 720 10 C 960 10 1200 10 1440 10 C 1440 20 1440 30 1440 40 C 960 40 480 40 0 40 C 0 30 0 20 0 10 C 240 10 480 10 720 10 Z'
  const wide = toBlobPath(WIDE_PATH)

  /* A single phase can land near a sine zero, so judge travel across the cycle. */
  const widestTravel = (stops: readonly BlobPath[]) => stops.reduce((widest, stop) => {
    for (const [index, cubic] of stop.cubics.entries()) {
      widest.x = Math.max(widest.x, Math.abs(cubic.x - wide.cubics[index].x))
      widest.y = Math.max(widest.y, Math.abs(cubic.y - wide.cubics[index].y))
    }
    return widest
  }, { x: 0, y: 0 })

  it('spends a radial deform mostly sideways on a wide flat shape', () => {
    const { x, y } = widestTravel(deformBlobPath(wide, { amplitude: 10 }))
    assert.ok(x > y, `expected a sideways bias, saw x ${x} y ${y}`)
  })

  it('confines a y axis deform to the vertical', () => {
    const { x, y } = widestTravel(deformBlobPath(wide, { amplitude: 10, axis: 'y' }))
    assert.equal(x, 0)
    assert.ok(y > 5, `expected vertical travel near the amplitude, saw ${y}`)
  })

  it('confines an x axis deform to the horizontal', () => {
    const { x, y } = widestTravel(deformBlobPath(wide, { amplitude: 10, axis: 'x' }))
    assert.equal(y, 0)
    assert.ok(x > 5, `expected horizontal travel near the amplitude, saw ${x}`)
  })

  it('keeps a positive bias on one side of the base outline', () => {
    for (const stop of deformBlobPath(wide, { amplitude: 8, axis: 'y', bias: 'positive' })) {
      for (const [index, cubic] of stop.cubics.entries()) {
        assert.ok(
          cubic.y >= wide.cubics[index].y - 0.001,
          `vertex ${index} crossed to the negative side: ${cubic.y}`,
        )
      }
    }
  })

  it('keeps a negative bias on one side of the base outline', () => {
    for (const stop of deformBlobPath(wide, { amplitude: 8, axis: 'y', bias: 'negative' })) {
      for (const [index, cubic] of stop.cubics.entries()) {
        assert.ok(
          cubic.y <= wide.cubics[index].y + 0.001,
          `vertex ${index} crossed to the positive side: ${cubic.y}`,
        )
      }
    }
  })
})

describe('deformBlobPath edge anchors', () => {
  /* The section border: vertices 4 to 8 carry the edges that must stay put. */
  const border = toBlobPath(SECTION_BORDER)
  const locked = new Set([4, 5, 6, 7, 8])
  const NEIGHBOUR_OF_LOCKED = 9

  it('fades offsets out towards locked vertices', () => {
    const options = { amplitude: 10, axis: 'y', locked, stops: 4 } as const
    const plain = deformBlobPath(border, options)
    const tapered = deformBlobPath(border, { ...options, taperToLocked: true })

    const largest = (stops: readonly BlobPath[]) => Math.max(...stops.map((stop) => (
      Math.abs(
        stop.cubics[NEIGHBOUR_OF_LOCKED - 1].y - border.cubics[NEIGHBOUR_OF_LOCKED - 1].y,
      )
    )))

    const plainOffset = largest(plain)
    const taperedOffset = largest(tapered)
    assert.ok(plainOffset > 0, 'expected the untapered run to move the vertex')
    assert.ok(
      taperedOffset < plainOffset / 2,
      `expected a much smaller offset beside a locked vertex, saw ${taperedOffset} vs ${plainOffset}`,
    )
  })

  it('still leaves locked vertices untouched when tapering', () => {
    for (const stop of deformBlobPath(border, {
      amplitude: 10,
      axis: 'y',
      locked,
      taperToLocked: true,
    })) {
      for (const index of locked) {
        assert.equal(stop.cubics[index - 1].y, border.cubics[index - 1].y)
      }
    }
  })

  it('holds vertices inside the given bounds', () => {
    const stops = deformBlobPath(border, {
      amplitude: 40,
      axis: 'y',
      bounds: [4, 44],
      stops: 4,
    })
    for (const stop of stops) {
      for (const cubic of stop.cubics) {
        assert.ok(cubic.y >= 4 - 0.001, `vertex left the band above: ${cubic.y}`)
        assert.ok(cubic.y <= 44 + 0.001, `vertex left the band below: ${cubic.y}`)
      }
    }
  })

  it('rejects bounds without a single axis', () => {
    assert.throws(
      () => deformBlobPath(border, { amplitude: 5, bounds: [0, 10] }),
      /single deform axis/,
    )
    assert.throws(
      () => deformBlobPath(border, { amplitude: 5, axis: 'y', bounds: [10, 0] }),
      /min,max/,
    )
  })
})

describe('toKeyframesBlock', () => {
  it('makes the first stop double as the loop end', () => {
    const stops = deformBlobPath(toBlobPath(HEADER_SMALL_BLOB), { amplitude: 5 })
    const block = toKeyframesBlock('blob-idle', stops)
    assert.match(block, /^@keyframes blob-idle \{/)
    assert.match(block, /\t0%, 100% \{\n\t\td: path\("M /)
    assert.match(block, /\t33\.333% \{/)
    assert.match(block, /\t66\.667% \{/)
  })
})

describe('extractPathData', () => {
  it('reads a raw path string', () => {
    assert.equal(extractPathData('M 0 0 L 1 1 Z'), 'M 0 0 L 1 1 Z')
  })

  it('reads a d attribute from markup', () => {
    assert.equal(
      extractPathData('<path fill="none" d="M23.363 0V0Z"/>'),
      'M23.363 0V0Z',
    )
  })

  it('selects a later path by index', () => {
    const markup = '<path d="M 0 0 Z"/><path d="M 1 1 Z"/><path d="M 2 2 Z"/>'
    assert.equal(extractAllPathData(markup).length, 3)
    assert.equal(extractPathData(markup, 2), 'M 2 2 Z')
  })

  it('reports how many paths exist when the index is out of range', () => {
    assert.throws(
      () => extractPathData('<path d="M 0 0 Z"/>', 4),
      /file contains 1/,
    )
  })
})
