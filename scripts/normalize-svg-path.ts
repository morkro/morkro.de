import assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PATH_COMMANDS = new Set([
  'M', 'm', 'L', 'l', 'H', 'h', 'V', 'v',
  'C', 'c', 'S', 's', 'Q', 'q', 'T', 't',
  'A', 'a', 'Z', 'z',
])

const COMMAND_ARITY: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1,
  C: 6, S: 4, Q: 4, T: 2,
  A: 7, Z: 0,
}

const NUMBER_PATTERN = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y
const PATH_ATTRIBUTE = /\bd\s*=\s*(?:"([^"]+)"|'([^']+)')/g
const OUTPUT_DECIMALS = 3
const TAU = Math.PI * 2
const QUARTER_TURN = Math.PI / 2

const DEFAULT_STOPS = 3
const DEFAULT_LOBES = 2
const DEFAULT_SEED = 1
const DEFAULT_TANGENTIAL_RATIO = 0.35
const DEFAULT_AXIS = 'radial'
const DEFAULT_BIAS = 'both'
/** Low frequencies only: neighbouring vertices must land on near-identical multipliers. */
const JITTER_HARMONICS = [
  { frequency: 3, weight: 0.18 },
  { frequency: 5, weight: 0.12 },
]
/** Vertex coordinates are compared loosely because paths are rounded on output. */
const CLOSED_PATH_EPSILON = 0.01

type Point = { readonly x: number; readonly y: number }

type CubicSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
  x: number
  y: number
}

/**
 * A single closed subpath expressed as `M` + n cubics + `Z`.
 * Vertex i is the start point when i is 0, otherwise the end of cubic i-1.
 */
export type BlobPath = {
  start: { x: number; y: number }
  cubics: CubicSegment[]
}

/**
 * `radial` pushes vertices away from the centroid, which suits a roughly round
 * blob. A wide flat shape has a near-horizontal radial direction at every vertex,
 * so nearly all of the amplitude lands in x where a shallow outline hides it;
 * pick `x` or `y` to spend the amplitude on one axis instead.
 */
export const DEFORM_AXES = ['radial', 'x', 'y'] as const
export type DeformAxis = (typeof DEFORM_AXES)[number]

/** `positive` and `negative` keep every offset on one side of the base outline. */
export const DEFORM_BIASES = ['both', 'positive', 'negative'] as const
export type DeformBias = (typeof DEFORM_BIASES)[number]

export type DeformOptions = {
  readonly amplitude: number
  readonly seed?: number
  readonly stops?: number
  readonly lobes?: number
  readonly locked?: ReadonlySet<number>
  readonly tangentialRatio?: number
  readonly axis?: DeformAxis
  readonly bias?: DeformBias
  readonly taperToLocked?: boolean
  /** Keep vertices inside `[min, max]` on the deform axis, e.g. the viewBox band. */
  readonly bounds?: readonly [number, number]
}

type OutputCommand =
  | { readonly type: 'M'; readonly x: number; readonly y: number }
  | {
    readonly type: 'C'
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
    readonly x: number
    readonly y: number
  }
  | { readonly type: 'Z' }

type ParsedCommand = {
  readonly command: string
  readonly params: readonly number[]
}

type Token =
  | { readonly kind: 'command'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }

/**
 * Rewrite an SVG `d` string to absolute `M` / `C` / `Z` only.
 * All line, quadratic, and smooth segments become cubics so two
 * paths with the same command count can interpolate.
 */
export const normalizeSvgPath = (pathData: string, { pretty = false } = {}): string => {
  const output = convertToAbsoluteCubics(parsePathCommands(tokenizePathData(pathData)))
  assert(output.length > 0, 'Path produced no drawing commands')
  return serializeCommands(output, pretty)
}

/**
 * Normalize, then reinterpret as a single closed loop so vertices can be offset.
 */
export const toBlobPath = (pathData: string): BlobPath => {
  const commands = convertToAbsoluteCubics(parsePathCommands(tokenizePathData(pathData)))
  const move = commands[0]
  assert(move?.type === 'M', 'Path must start with a move command')

  const cubics: CubicSegment[] = []
  for (const command of commands.slice(1)) {
    if (command.type === 'Z') {
      continue
    }
    assert(
      command.type === 'C',
      'Path must contain a single subpath; split multi-subpath shapes into separate paths first',
    )
    cubics.push({ ...command })
  }

  assert(cubics.length > 2, 'Need at least three cubics to deform a shape')
  const last = cubics.at(-1)
  assert(last, 'Path has no cubic segments')
  assert(
    Math.hypot(last.x - move.x, last.y - move.y) < CLOSED_PATH_EPSILON,
    'Path must be a closed loop: the last cubic has to end on the start point',
  )

  return { start: { x: move.x, y: move.y }, cubics }
}

/**
 * Produce evenly spaced morph targets by walking a sine wave of bulges around
 * the outline. Each stop shifts the wave's phase, so consecutive stops sit the
 * same distance apart and the loop never returns to the undeformed shape.
 * The wave is driven by arc length, so vertex spacing does not affect the result.
 */
export const deformBlobPath = (blob: BlobPath, options: DeformOptions): BlobPath[] => {
  const {
    amplitude,
    seed = DEFAULT_SEED,
    stops = DEFAULT_STOPS,
    lobes = DEFAULT_LOBES,
    locked = new Set<number>(),
    tangentialRatio = DEFAULT_TANGENTIAL_RATIO,
    axis = DEFAULT_AXIS,
    bias = DEFAULT_BIAS,
    taperToLocked = false,
    bounds,
  } = options

  assert(amplitude > 0, 'Deform amplitude must be greater than zero')
  assert(stops > 0, 'Need at least one stop')
  assert(DEFORM_AXES.includes(axis), `Unknown deform axis "${axis}"`)
  assert(DEFORM_BIASES.includes(bias), `Unknown deform bias "${bias}"`)
  if (bounds) {
    assert(axis !== 'radial', 'Bounds need a single deform axis; pass axis "x" or "y"')
    assert(bounds[0] < bounds[1], 'Bounds must be given as min,max')
  }

  const count = blob.cubics.length
  const vertices = collectVertices(blob)
  const centre = averagePoint(vertices)
  const positions = arcLengthPositions(vertices)
  const jitter = createJitter(seed)
  const taper = createTaper(positions, locked, taperToLocked)

  return Array.from({ length: stops }, (_unused, stopIndex) => {
    const phase = (TAU * stopIndex) / stops
    const draft: BlobPath = {
      start: { ...blob.start },
      cubics: blob.cubics.map((cubic) => ({ ...cubic })),
    }

    for (let index = 0; index < count; index += 1) {
      if (locked.has(index)) {
        continue
      }

      const position = positions[index]
      const wave = applyBias(Math.sin(TAU * lobes * position + phase), bias)
      const reach = wave * jitter(position) * taper(index) * amplitude
      const scale = clampToBounds(reach, vertices[index], axis, bounds)
      offsetVertex(draft, index, axisOffset(axis, vertices[index], centre, tangentialRatio, scale))
    }

    return draft
  })
}

export const serializeBlobPath = (blob: BlobPath, { pretty = false } = {}): string => {
  const commands: OutputCommand[] = [
    { type: 'M', x: blob.start.x, y: blob.start.y },
    ...blob.cubics.map((cubic) => ({ type: 'C' as const, ...cubic })),
    { type: 'Z' as const },
  ]
  return serializeCommands(commands, pretty)
}

/** Wrap morph targets in a keyframe block whose first stop is also the last. */
export const toKeyframesBlock = (name: string, blobs: readonly BlobPath[]): string => {
  const body = blobs.map((blob, index) => {
    const selector = index === 0
      ? '0%, 100%'
      : `${formatNumber((100 * index) / blobs.length)}%`
    return `\t${selector} {\n\t\td: path("${serializeBlobPath(blob)}");\n\t}`
  })
  return `@keyframes ${name} {\n${body.join('\n\n')}\n}`
}

export const extractPathData = (source: string, index = 0): string => {
  const trimmed = source.trim()
  if (/^[Mm]/.test(trimmed)) {
    return trimmed
  }

  const all = extractAllPathData(source)
  assert(all.length > 0, 'No SVG path data found (raw `d` string or `d="…"` attribute)')
  const pathData = all[index]
  assert(pathData, `No path at index ${index}; file contains ${all.length}`)
  return pathData
}

export const extractAllPathData = (source: string): string[] => {
  const matches = [...source.matchAll(PATH_ATTRIBUTE)]
  return matches
    .map((match) => match[1] ?? match[2] ?? '')
    .filter((pathData) => pathData.trim() !== '')
}

const collectVertices = (blob: BlobPath): Point[] => (
  Array.from({ length: blob.cubics.length }, (_unused, index) => {
    const { x, y } = index === 0 ? blob.start : blob.cubics[index - 1]
    return { x, y }
  })
)

const averagePoint = (points: readonly Point[]): Point => ({
  x: points.reduce((total, point) => total + point.x, 0) / points.length,
  y: points.reduce((total, point) => total + point.y, 0) / points.length,
})

/**
 * Position each vertex by its share of the perimeter. Index position assumes even
 * spacing; shapes with converted line runs pack dozens of vertices into a few
 * units, so neighbours would otherwise receive unrelated offsets and kink.
 */
const arcLengthPositions = (vertices: readonly Point[]): number[] => {
  const count = vertices.length
  const spans = vertices.map((point, index) => {
    const next = vertices[(index + 1) % count]
    return Math.hypot(next.x - point.x, next.y - point.y)
  })
  const perimeter = spans.reduce((total, span) => total + span, 0)
  assert(perimeter > 0, 'Path has zero length')

  let travelled = 0
  return spans.map((span) => {
    const position = travelled / perimeter
    travelled += span
    return position
  })
}

const createJitter = (seed: number) => {
  const random = createRandom(seed)
  const phases = JITTER_HARMONICS.map(() => random() * TAU)
  return (position: number) => 1 + JITTER_HARMONICS.reduce(
    (total, { frequency, weight }, index) => (
      total + weight * Math.sin(TAU * frequency * position + phases[index])
    ),
    0,
  )
}

const applyBias = (wave: number, bias: DeformBias): number => {
  if (bias === 'positive') {
    return (wave + 1) / 2
  }
  if (bias === 'negative') {
    return (wave - 1) / 2
  }
  return wave
}

/**
 * Trim an offset so the vertex lands inside the allowed band. A vertex pushed
 * past the viewBox edge is clipped into a flat line by the renderer, which is far
 * more obvious than the short dwell that clamping produces.
 */
const clampToBounds = (
  reach: number,
  vertex: Point,
  axis: DeformAxis,
  bounds: readonly [number, number] | undefined,
): number => {
  if (!bounds || axis === 'radial') {
    return reach
  }

  const [minimum, maximum] = bounds
  const current = axis === 'x' ? vertex.x : vertex.y
  return Math.min(Math.max(current + reach, minimum), maximum) - current
}

const axisOffset = (
  axis: DeformAxis,
  vertex: Point,
  centre: Point,
  tangentialRatio: number,
  scale: number,
): Point => {
  if (axis === 'x') {
    return { x: scale, y: 0 }
  }
  if (axis === 'y') {
    return { x: 0, y: scale }
  }

  const outward = radialDirection(vertex, centre)
  return {
    x: (outward.x - outward.y * tangentialRatio) * scale,
    y: (outward.y + outward.x * tangentialRatio) * scale,
  }
}

/**
 * Fade offsets out towards locked vertices, measured along the perimeter. Without
 * it a free vertex sitting next to a locked one takes the full amplitude and
 * kinks the short segment between them, which is what edge-anchored shapes hit.
 */
const createTaper = (
  positions: readonly number[],
  locked: ReadonlySet<number>,
  enabled: boolean,
) => {
  if (!enabled || locked.size === 0) {
    return () => 1
  }

  const anchors = [...locked].map((index) => positions[index])
  const distances = positions.map((position, index) => (
    locked.has(index)
      ? 0
      : Math.min(...anchors.map((anchor) => cyclicDistance(position, anchor)))
  ))
  const furthest = Math.max(...distances)
  if (furthest === 0) {
    return () => 0
  }

  return (index: number) => Math.sin(QUARTER_TURN * (distances[index] / furthest))
}

/** Perimeter positions wrap, so the shorter way round is the real distance. */
const cyclicDistance = (first: number, second: number): number => {
  const gap = Math.abs(first - second)
  return Math.min(gap, 1 - gap)
}

const radialDirection = (point: Point, centre: Point): Point => {
  const deltaX = point.x - centre.x
  const deltaY = point.y - centre.y
  const length = Math.hypot(deltaX, deltaY)
  if (length === 0) {
    return { x: 0, y: 0 }
  }
  return { x: deltaX / length, y: deltaY / length }
}

/**
 * Move a vertex together with both of its handles. Shifting all three by the
 * same delta keeps the tangent direction intact, which avoids kinks.
 */
const offsetVertex = (blob: BlobPath, index: number, delta: Point) => {
  const count = blob.cubics.length
  const incoming = blob.cubics[(index - 1 + count) % count]
  const outgoing = blob.cubics[index % count]

  incoming.x2 += delta.x
  incoming.y2 += delta.y
  outgoing.x1 += delta.x
  outgoing.y1 += delta.y

  if (index === 0) {
    blob.start.x += delta.x
    blob.start.y += delta.y
    incoming.x += delta.x
    incoming.y += delta.y
    return
  }

  const vertex = blob.cubics[index - 1]
  vertex.x += delta.x
  vertex.y += delta.y
}

/** mulberry32 keeps deformations reproducible for a given seed. */
const createRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const tokenizePathData = (pathData: string): Token[] => {
  const tokens: Token[] = []
  let index = 0

  while (index < pathData.length) {
    const character = pathData[index]
    if (character === ',' || /\s/.test(character)) {
      index += 1
      continue
    }

    if (PATH_COMMANDS.has(character)) {
      tokens.push({ kind: 'command', value: character })
      index += 1
      continue
    }

    NUMBER_PATTERN.lastIndex = index
    const numberMatch = NUMBER_PATTERN.exec(pathData)
    assert(numberMatch, `Unexpected character "${character}" at index ${index}`)
    tokens.push({ kind: 'number', value: Number(numberMatch[0]) })
    index = NUMBER_PATTERN.lastIndex
  }

  return tokens
}

const parsePathCommands = (tokens: Token[]): ParsedCommand[] => {
  const commands: ParsedCommand[] = []
  let currentCommand: string | undefined
  let isFirstMovePair = false
  let index = 0

  while (index < tokens.length) {
    const token = tokens[index]
    if (token.kind === 'command') {
      currentCommand = token.value
      index += 1
      isFirstMovePair = currentCommand === 'M' || currentCommand === 'm'
      if (currentCommand === 'Z' || currentCommand === 'z') {
        commands.push({ command: currentCommand, params: [] })
        continue
      }
    }

    assert(currentCommand, 'Path data must start with a command letter')
    const arity = COMMAND_ARITY[currentCommand.toUpperCase()]
    assert(arity !== undefined, `Unknown path command "${currentCommand}"`)
    assert(arity > 0, `Command "${currentCommand}" does not take numbers`)

    const params = takeNumbers(tokens, index, arity)
    index += arity
    commands.push({ command: currentCommand, params })

    if (isFirstMovePair) {
      currentCommand = currentCommand === 'm' ? 'l' : 'L'
      isFirstMovePair = false
    }
  }

  return commands
}

const takeNumbers = (tokens: Token[], start: number, count: number): number[] => {
  const values: number[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const token = tokens[start + offset]
    assert(token?.kind === 'number', `Expected ${count} numbers, found ${offset}`)
    values.push(token.value)
  }
  return values
}

const convertToAbsoluteCubics = (commands: readonly ParsedCommand[]): OutputCommand[] => {
  const output: OutputCommand[] = []
  let current: Point = { x: 0, y: 0 }
  let subpathStart: Point = { x: 0, y: 0 }
  let previousCommand = ''
  let previousCubicControl: Point | null = null
  let previousQuadControl: Point | null = null

  const resetSmoothControls = () => {
    previousCubicControl = null
    previousQuadControl = null
  }

  for (const { command, params } of commands) {
    const isRelative = command === command.toLowerCase()
    const type = command.toUpperCase()
    assert(type !== 'A', 'Arc commands (A/a) are not supported; convert them to cubics first')

    if (type === 'Z') {
      output.push({ type: 'Z' })
      current = subpathStart
      previousCommand = 'Z'
      resetSmoothControls()
      continue
    }

    if (type === 'M') {
      const point = toAbsolutePoint(current, params[0], params[1], isRelative)
      output.push({ type: 'M', x: point.x, y: point.y })
      current = point
      subpathStart = point
      previousCommand = 'M'
      resetSmoothControls()
      continue
    }

    if (type === 'L') {
      const point = toAbsolutePoint(current, params[0], params[1], isRelative)
      output.push({ type: 'C', ...lineToCubic(current, point) })
      current = point
      previousCommand = 'L'
      resetSmoothControls()
      continue
    }

    if (type === 'H') {
      const x = isRelative ? current.x + params[0] : params[0]
      const point = { x, y: current.y }
      output.push({ type: 'C', ...lineToCubic(current, point) })
      current = point
      previousCommand = 'H'
      resetSmoothControls()
      continue
    }

    if (type === 'V') {
      const y = isRelative ? current.y + params[0] : params[0]
      const point = { x: current.x, y }
      output.push({ type: 'C', ...lineToCubic(current, point) })
      current = point
      previousCommand = 'V'
      resetSmoothControls()
      continue
    }

    if (type === 'C') {
      const cubic = toAbsoluteCubic(current, params, isRelative)
      output.push({ type: 'C', ...cubic })
      current = { x: cubic.x, y: cubic.y }
      previousCubicControl = { x: cubic.x2, y: cubic.y2 }
      previousQuadControl = null
      previousCommand = 'C'
      continue
    }

    if (type === 'S') {
      const canReflect = previousCommand === 'C' || previousCommand === 'S'
      const firstControl = reflectOrCurrent(previousCubicControl, current, canReflect)
      const second = toAbsolutePoint(current, params[0], params[1], isRelative)
      const end = toAbsolutePoint(current, params[2], params[3], isRelative)
      output.push({
        type: 'C',
        x1: firstControl.x,
        y1: firstControl.y,
        x2: second.x,
        y2: second.y,
        x: end.x,
        y: end.y,
      })
      current = end
      previousCubicControl = second
      previousQuadControl = null
      previousCommand = 'S'
      continue
    }

    if (type === 'Q') {
      const control = toAbsolutePoint(current, params[0], params[1], isRelative)
      const end = toAbsolutePoint(current, params[2], params[3], isRelative)
      output.push({ type: 'C', ...quadraticToCubic(current, control, end) })
      current = end
      previousQuadControl = control
      previousCubicControl = null
      previousCommand = 'Q'
      continue
    }

    if (type === 'T') {
      const canReflect = previousCommand === 'Q' || previousCommand === 'T'
      const control = reflectOrCurrent(previousQuadControl, current, canReflect)
      const end = toAbsolutePoint(current, params[0], params[1], isRelative)
      output.push({ type: 'C', ...quadraticToCubic(current, control, end) })
      current = end
      previousQuadControl = control
      previousCubicControl = null
      previousCommand = 'T'
      continue
    }

    assert.fail(`Unhandled path command "${command}"`)
  }

  return output
}

const toAbsolutePoint = (current: Point, x: number, y: number, isRelative: boolean): Point => (
  isRelative ? { x: current.x + x, y: current.y + y } : { x, y }
)

const toAbsoluteCubic = (current: Point, params: readonly number[], isRelative: boolean) => {
  const first = toAbsolutePoint(current, params[0], params[1], isRelative)
  const second = toAbsolutePoint(current, params[2], params[3], isRelative)
  const end = toAbsolutePoint(current, params[4], params[5], isRelative)
  return { x1: first.x, y1: first.y, x2: second.x, y2: second.y, x: end.x, y: end.y }
}

const lineToCubic = (from: Point, to: Point) => {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  return {
    x1: from.x + deltaX / 3,
    y1: from.y + deltaY / 3,
    x2: from.x + (2 * deltaX) / 3,
    y2: from.y + (2 * deltaY) / 3,
    x: to.x,
    y: to.y,
  }
}

const quadraticToCubic = (from: Point, control: Point, to: Point) => ({
  x1: from.x + (2 / 3) * (control.x - from.x),
  y1: from.y + (2 / 3) * (control.y - from.y),
  x2: to.x + (2 / 3) * (control.x - to.x),
  y2: to.y + (2 / 3) * (control.y - to.y),
  x: to.x,
  y: to.y,
})

const reflectOrCurrent = (control: Point | null, current: Point, canReflect: boolean): Point => {
  if (!canReflect || !control) {
    return current
  }
  return {
    x: 2 * current.x - control.x,
    y: 2 * current.y - control.y,
  }
}

const serializeCommands = (commands: readonly OutputCommand[], pretty: boolean): string => {
  const parts = commands.map((command) => {
    if (command.type === 'M') {
      return `M ${formatNumber(command.x)} ${formatNumber(command.y)}`
    }
    if (command.type === 'Z') {
      return 'Z'
    }
    return [
      'C',
      formatNumber(command.x1),
      formatNumber(command.y1),
      formatNumber(command.x2),
      formatNumber(command.y2),
      formatNumber(command.x),
      formatNumber(command.y),
    ].join(' ')
  })
  return parts.join(pretty ? '\n' : ' ')
}

const formatNumber = (value: number): string => {
  const rounded = Number(value.toFixed(OUTPUT_DECIMALS))
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

type CliFlags = {
  readonly values: Map<string, string>
  readonly booleans: ReadonlySet<string>
  readonly positional: readonly string[]
}

const VALUE_FLAGS = new Set([
  'file', 'index', 'deform', 'seed', 'stops', 'lobes', 'lock', 'css', 'axis', 'bias', 'bounds',
])

const parseCliFlags = (args: readonly string[]): CliFlags => {
  const values = new Map<string, string>()
  const booleans = new Set<string>()
  const positional: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument.startsWith('--')) {
      positional.push(argument)
      continue
    }

    const name = argument.slice(2)
    if (!VALUE_FLAGS.has(name)) {
      booleans.add(name)
      continue
    }

    const value = args[index + 1]
    assert(value !== undefined && !value.startsWith('--'), `Expected a value after --${name}`)
    values.set(name, value)
    index += 1
  }

  return { values, booleans, positional }
}

const readNumberFlag = (flags: CliFlags, name: string, fallback: number): number => {
  const raw = flags.values.get(name)
  if (raw === undefined) {
    return fallback
  }
  const value = Number(raw)
  assert(Number.isFinite(value), `--${name} must be a number`)
  return value
}

const readChoiceFlag = <Choice extends string>(
  flags: CliFlags,
  name: string,
  allowed: readonly Choice[],
  fallback: Choice,
): Choice => {
  const raw = flags.values.get(name)
  if (raw === undefined) {
    return fallback
  }
  assert(
    allowed.includes(raw as Choice),
    `--${name} must be one of: ${allowed.join(', ')}`,
  )
  return raw as Choice
}

const readBoundsFlag = (flags: CliFlags): [number, number] | undefined => {
  const raw = flags.values.get('bounds')
  if (!raw) {
    return undefined
  }

  const parts = raw.split(',').map((entry) => Number(entry.trim()))
  assert(
    parts.length === 2 && parts.every((value) => Number.isFinite(value)),
    '--bounds takes two numbers as min,max',
  )
  return [parts[0], parts[1]]
}

const readLockedFlag = (flags: CliFlags): Set<number> => {
  const raw = flags.values.get('lock')
  if (!raw) {
    return new Set()
  }
  return new Set(raw.split(',').map((entry) => {
    const value = Number(entry.trim())
    assert(Number.isInteger(value) && value >= 0, '--lock takes comma-separated vertex indices')
    return value
  }))
}

const resolveSource = async (flags: CliFlags): Promise<string> => {
  const file = flags.values.get('file')
  if (file) {
    return readFile(file, 'utf8')
  }
  if (flags.positional[0]) {
    return flags.positional[0]
  }
  return readStdin()
}

const runCli = async () => {
  const flags = parseCliFlags(process.argv.slice(2))
  const pretty = flags.booleans.has('pretty')
  const source = await resolveSource(flags)
  const pathData = extractPathData(source, readNumberFlag(flags, 'index', 0))

  if (!flags.values.has('deform')) {
    process.stdout.write(`${normalizeSvgPath(pathData, { pretty })}\n`)
    return
  }

  const stops = deformBlobPath(toBlobPath(pathData), {
    amplitude: readNumberFlag(flags, 'deform', 0),
    seed: readNumberFlag(flags, 'seed', DEFAULT_SEED),
    stops: readNumberFlag(flags, 'stops', DEFAULT_STOPS),
    lobes: readNumberFlag(flags, 'lobes', DEFAULT_LOBES),
    locked: readLockedFlag(flags),
    axis: readChoiceFlag(flags, 'axis', DEFORM_AXES, DEFAULT_AXIS),
    bias: readChoiceFlag(flags, 'bias', DEFORM_BIASES, DEFAULT_BIAS),
    taperToLocked: flags.booleans.has('taper'),
    bounds: readBoundsFlag(flags),
  })

  const keyframeName = flags.values.get('css')
  if (keyframeName) {
    process.stdout.write(`${toKeyframesBlock(keyframeName, stops)}\n`)
    return
  }

  for (const [index, blob] of stops.entries()) {
    process.stdout.write(`/* stop ${index + 1} */\n${serializeBlobPath(blob, { pretty })}\n`)
  }
}

const isCliEntry = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCliEntry) {
  await runCli()
}
