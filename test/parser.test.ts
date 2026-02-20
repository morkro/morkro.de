import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseLiquid } from '#parser/liquid/parser.ts'
import type { NodeIf } from '#parser/liquid/types.ts'

describe('parseLiquid: if/elsif/else', () => {
  it('parses a single elsif branch', () => {
    const input = '{% if a %}A{% elsif b %}B{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    assert.strictEqual(ifNode.type, 'If')
    assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })

    assert.ok(ifNode.elseBody, 'expected elseBody to exist')
    assert.strictEqual(ifNode.elseBody!.length, 1)

    const elsifNode = ifNode.elseBody![0] as NodeIf
    assert.strictEqual(elsifNode.type, 'If')
    assert.deepStrictEqual(elsifNode.condition, { type: 'Var', path: ['b'] })
  })

  it('parses chained elsif branches without losing any', () => {
    const input = '{% if a %}A{% elsif b %}B{% elsif c %}C{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })

    const elsifB = ifNode.elseBody?.[0] as NodeIf
    assert.ok(elsifB, 'expected elsif b node')
    assert.deepStrictEqual(elsifB.condition, { type: 'Var', path: ['b'] })

    const elsifC = elsifB.elseBody?.[0] as NodeIf
    assert.ok(elsifC, 'expected elsif c node')
    assert.deepStrictEqual(elsifC.condition, { type: 'Var', path: ['c'] })
  })

  it('parses elsif followed by else', () => {
    const input = '{% if a %}A{% elsif b %}B{% else %}C{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })

    const elsifB = ifNode.elseBody?.[0] as NodeIf
    assert.ok(elsifB, 'expected elsif b node')
    assert.deepStrictEqual(elsifB.condition, { type: 'Var', path: ['b'] })

    assert.ok(elsifB.elseBody, 'expected else body on elsif b')
    assert.ok(elsifB.elseBody!.length > 0, 'else body should not be empty')
    const elseText = elsifB.elseBody!.find(n => n.type === 'Text' && n.value.includes('C'))
    assert.ok(elseText, 'expected else body to contain text C')
  })

  it('parses chained elsif branches followed by else', () => {
    const input = '{% if a %}A{% elsif b %}B{% elsif c %}C{% else %}D{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    const elsifB = ifNode.elseBody?.[0] as NodeIf
    const elsifC = elsifB.elseBody?.[0] as NodeIf
    assert.ok(elsifC, 'expected elsif c node')
    assert.deepStrictEqual(elsifC.condition, { type: 'Var', path: ['c'] })

    assert.ok(elsifC.elseBody, 'expected else body on elsif c')
    assert.ok(elsifC.elseBody!.length > 0, 'else body should not be empty')
    const elseText = elsifC.elseBody!.find(n => n.type === 'Text' && n.value.includes('D'))
    assert.ok(elseText, 'expected else body to contain text D')
  })

  it('parses if without elsif or else', () => {
    const input = '{% if a %}A{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    assert.strictEqual(ifNode.type, 'If')
    assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })
    assert.strictEqual(ifNode.elseBody, undefined)
  })

  it('parses if/else without elsif', () => {
    const input = '{% if a %}A{% else %}B{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const ifNode = body[0] as NodeIf
    assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })
    assert.ok(ifNode.elseBody, 'expected elseBody')
    assert.ok(ifNode.elseBody!.length > 0)

    const elseText = ifNode.elseBody!.find(n => n.type === 'Text' && n.value.includes('B'))
    assert.ok(elseText, 'expected else body to contain text B')
  })

  it('parses nested if inside else branch', () => {
    const input = '{% if a %}A{% else %}{% if b %}B{% else %}C{% endif %}{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const outer = body[0] as NodeIf
    assert.deepStrictEqual(outer.condition, { type: 'Var', path: ['a'] })

    const inner = outer.elseBody?.find(n => n.type === 'If') as NodeIf
    assert.ok(inner, 'expected nested if inside else branch')
    assert.deepStrictEqual(inner.condition, { type: 'Var', path: ['b'] })

    const innerIfText = inner.body.find(n => n.type === 'Text' && n.value.includes('B'))
    assert.ok(innerIfText, 'expected inner if body to contain B')

    const innerElseText = inner.elseBody?.find(n => n.type === 'Text' && n.value.includes('C'))
    assert.ok(innerElseText, 'expected inner else body to contain C')
  })

  it('parses nested if with elsif inside else branch', () => {
    const input = [
      '{% if a %}A',
      '{% else %}',
      '{% if b %}B{% elsif c %}C{% endif %}',
      '{% endif %}',
    ].join('')
    const { body } = parseLiquid(input, 'test')

    const outer = body[0] as NodeIf
    assert.deepStrictEqual(outer.condition, { type: 'Var', path: ['a'] })

    const inner = outer.elseBody?.find(n => n.type === 'If') as NodeIf
    assert.ok(inner, 'expected nested if inside else')
    assert.deepStrictEqual(inner.condition, { type: 'Var', path: ['b'] })

    const elsifC = inner.elseBody?.[0] as NodeIf
    assert.ok(elsifC, 'expected elsif c inside nested if')
    assert.deepStrictEqual(elsifC.condition, { type: 'Var', path: ['c'] })
  })

  it('parses deeply nested if inside elsif else chain', () => {
    const input = [
      '{% if a %}A',
      '{% elsif b %}',
      '{% if c %}C{% else %}D{% endif %}',
      '{% else %}E',
      '{% endif %}',
    ].join('')
    const { body } = parseLiquid(input, 'test')

    const outer = body[0] as NodeIf
    assert.deepStrictEqual(outer.condition, { type: 'Var', path: ['a'] })

    const elsifB = outer.elseBody?.[0] as NodeIf
    assert.ok(elsifB, 'expected elsif b')
    assert.deepStrictEqual(elsifB.condition, { type: 'Var', path: ['b'] })

    const innerIf = elsifB.body.find(n => n.type === 'If') as NodeIf
    assert.ok(innerIf, 'expected nested if inside elsif b body')
    assert.deepStrictEqual(innerIf.condition, { type: 'Var', path: ['c'] })

    const innerElseText = innerIf.elseBody?.find(n => n.type === 'Text' && n.value.includes('D'))
    assert.ok(innerElseText, 'expected inner else to contain D')

    const outerElseText = elsifB.elseBody?.find(n => n.type === 'Text' && n.value.includes('E'))
    assert.ok(outerElseText, 'expected outer else to contain E')
  })

  it('parses if inside if body (nested in truthy branch)', () => {
    const input = '{% if a %}{% if b %}B{% endif %}{% endif %}'
    const { body } = parseLiquid(input, 'test')

    const outer = body[0] as NodeIf
    assert.deepStrictEqual(outer.condition, { type: 'Var', path: ['a'] })

    const inner = outer.body.find(n => n.type === 'If') as NodeIf
    assert.ok(inner, 'expected nested if inside if body')
    assert.deepStrictEqual(inner.condition, { type: 'Var', path: ['b'] })
  })
})