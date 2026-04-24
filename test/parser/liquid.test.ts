import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { render, type RenderContext } from '#parser/liquid/renderer.ts'
import type { Template } from '#parser/liquid/types.ts'
import { ParserError } from '#parser/utils.ts'
import type {
	Expression,
	ExpressionBinary,
	ExpressionFilter,
	ExpressionUnary,
	Node,
	NodeAssign,
	NodeCapture,
	NodeCase,
	NodeComment,
	NodeCycle,
	NodeDecrement,
	NodeEcho,
	NodeFor,
	NodeIf,
	NodeIncrement,
	NodeOutput,
	NodeRaw,
	NodeRender,
	NodeShortCode,
	NodeTableRow,
	NodeText,
} from '#parser/liquid/types.ts'

const parse = (input: string) => parseLiquid(input, 'test').body

describe('parseLiquid: text and output', () => {
	it('parses plain text as a single Text node', () => {
		const body = parse('hello world')
		assert.strictEqual(body.length, 1)
		assert.strictEqual(body[0].type, 'Text')
		assert.strictEqual((body[0] as NodeText).value, 'hello world')
	})

	it('parses a simple variable output', () => {
		const body = parse('{{ title }}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeOutput
		assert.strictEqual(node.type, 'Output')
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['title'] })
	})

	it('parses dot-notation variable output', () => {
		const body = parse('{{ site.title }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['site', 'title'] })
	})

	it('parses deeply nested dot-notation', () => {
		const body = parse('{{ a.b.c.d }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['a', 'b', 'c', 'd'] })
	})

	it('parses string literal output', () => {
		const body = parse('{{ "hello" }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 'hello' })
	})

	it('parses number literal output', () => {
		const body = parse('{{ 42 }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 42 })
	})

	it('parses text interleaved with outputs', () => {
		const body = parse('Hello {{ name }}, welcome!')
		assert.strictEqual(body.length, 3)
		assert.strictEqual(body[0].type, 'Text')
		assert.strictEqual(body[1].type, 'Output')
		assert.strictEqual(body[2].type, 'Text')
	})

	it('returns empty body for empty input', () => {
		const body = parse('')
		assert.strictEqual(body.length, 0)
	})
})

describe('parseLiquid: if/elsif/else', () => {
	it('parses a single elsif branch', () => {
		const input = '{% if a %}A{% elsif b %}B{% endif %}'
		const { body } = parseLiquid(input, 'test')

		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.type, 'If')
		assert.deepStrictEqual(ifNode.condition, { type: 'Var', path: ['a'] })

		const elseBody = ifNode.elseBody
		assert.ok(elseBody, 'expected elseBody to exist')
		assert.strictEqual(elseBody.length, 1)

		const elsifNode = elseBody[0] as NodeIf
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

		const elsifBElse = elsifB.elseBody
		assert.ok(elsifBElse, 'expected else body on elsif b')
		assert.ok(elsifBElse.length > 0, 'else body should not be empty')
		const elseText = elsifBElse.find(n => n.type === 'Text' && n.value.includes('C'))
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

		const elsifCElse = elsifC.elseBody
		assert.ok(elsifCElse, 'expected else body on elsif c')
		assert.ok(elsifCElse.length > 0, 'else body should not be empty')
		const elseText = elsifCElse.find(n => n.type === 'Text' && n.value.includes('D'))
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
		const elseBody = ifNode.elseBody
		assert.ok(elseBody, 'expected elseBody')
		assert.ok(elseBody.length > 0)

		const elseText = elseBody.find(n => n.type === 'Text' && n.value.includes('B'))
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

	it('parses if with comparison operator', () => {
		const body = parse('{% if count > 5 %}big{% endif %}')
		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.condition.type, 'Binary')
		assert.strictEqual(ifNode.condition.type === 'Binary' && ifNode.condition.operator, '>')
	})

	it('parses if with == comparison', () => {
		const body = parse('{% if status == "active" %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.condition.type, 'Binary')
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, '==')
			assert.deepStrictEqual(ifNode.condition.left, { type: 'Var', path: ['status'] })
			assert.deepStrictEqual(ifNode.condition.right, { type: 'Literal', value: 'active' })
		}
	})

	it('parses if with != operator', () => {
		const body = parse('{% if a != b %}diff{% endif %}')
		const ifNode = body[0] as NodeIf
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, '!=')
		}
	})

	it('parses if with >= and <= operators', () => {
		const body = parse('{% if x >= 1 %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, '>=')
		}

		const body2 = parse('{% if x <= 10 %}yes{% endif %}')
		const ifNode2 = body2[0] as NodeIf
		if (ifNode2.condition.type === 'Binary') {
			assert.strictEqual(ifNode2.condition.operator, '<=')
		}
	})

	it('parses if with "and" logical operator', () => {
		const body = parse('{% if a and b %}both{% endif %}')
		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.condition.type, 'Binary')
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, 'and')
		}
	})

	it('parses if with "or" logical operator', () => {
		const body = parse('{% if a or b %}either{% endif %}')
		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.condition.type, 'Binary')
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, 'or')
		}
	})

	it('parses if with "contains" operator', () => {
		const body = parse('{% if tags contains "js" %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		assert.strictEqual(ifNode.condition.type, 'Binary')
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, 'contains')
		}
	})

	it('parses chained logical operators with correct precedence', () => {
		const body = parse('{% if a or b and c %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		// or is lower precedence than and, so tree is: or(a, and(b, c))
		assert.strictEqual(ifNode.condition.type, 'Binary')
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, 'or')
			assert.deepStrictEqual(ifNode.condition.left, { type: 'Var', path: ['a'] })
			assert.strictEqual(ifNode.condition.right.type, 'Binary')
			if (ifNode.condition.right.type === 'Binary') {
				assert.strictEqual(ifNode.condition.right.operator, 'and')
			}
		}
	})
})

describe('parseLiquid: unless', () => {
	it('parses unless as negated If', () => {
		const body = parse('{% unless hidden %}visible{% endunless %}')
		const node = body[0] as NodeIf
		assert.strictEqual(node.type, 'If')
		assert.strictEqual(node.negated, true)
		assert.deepStrictEqual(node.condition, { type: 'Var', path: ['hidden'] })
		assert.ok(node.body.some(n => n.type === 'Text' && n.value.includes('visible')))
	})

	it('parses unless with else', () => {
		const body = parse('{% unless logged_in %}guest{% else %}user{% endunless %}')
		const node = body[0] as NodeIf
		assert.strictEqual(node.negated, true)
		const elseBody = node.elseBody
		assert.ok(elseBody)
		assert.ok(elseBody.some(n => n.type === 'Text' && n.value.includes('user')))
	})

	it('parses unless with comparison condition', () => {
		const body = parse('{% unless count == 0 %}has items{% endunless %}')
		const node = body[0] as NodeIf
		assert.strictEqual(node.negated, true)
		assert.strictEqual(node.condition.type, 'Binary')
	})
})

describe('parseLiquid: for', () => {
	it('parses basic for loop', () => {
		const body = parse('{% for item in items %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.strictEqual(node.type, 'For')
		assert.strictEqual(node.variable, 'item')
		assert.deepStrictEqual(node.collection, { type: 'Var', path: ['items'] })
		assert.ok(node.body.length > 0)
	})

	it('parses for loop with dot-notation collection', () => {
		const body = parse('{% for post in site.posts %}{{ post }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.deepStrictEqual(node.collection, { type: 'Var', path: ['site', 'posts'] })
	})

	it('parses for loop with limit param', () => {
		const body = parse('{% for item in items limit: 5 %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		const params = node.params
		assert.ok(params)
		const limitParam = params.find(p => p.type === 'limit')
		assert.ok(limitParam)
		assert.strictEqual(limitParam.type === 'limit' && limitParam.value, 5)
	})

	it('parses for loop with offset param', () => {
		const body = parse('{% for item in items offset: 2 %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		const params = node.params
		assert.ok(params)
		const offsetParam = params.find(p => p.type === 'offset')
		assert.ok(offsetParam)
		assert.strictEqual(offsetParam.type === 'offset' && offsetParam.value, 2)
	})

	it('parses for loop with reversed param', () => {
		const body = parse('{% for item in items reversed %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		const params = node.params
		assert.ok(params)
		const reversedParam = params.find(p => p.type === 'reversed')
		assert.ok(reversedParam)
	})

	it('parses for loop with multiple params', () => {
		const body = parse('{% for item in items limit: 3 offset: 1 reversed %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		const params = node.params
		assert.ok(params)
		assert.strictEqual(params.length, 3)
	})

	it('parses for loop with else (empty collection)', () => {
		const body = parse('{% for item in items %}{{ item }}{% else %}none{% endfor %}')
		const node = body[0] as NodeFor
		const elseBody = node.elseBody
		assert.ok(elseBody)
		assert.ok(elseBody.some(n => n.type === 'Text' && n.value.includes('none')))
	})

	it('parses for loop with range expression', () => {
		const body = parse('{% for i in (1..5) %}{{ i }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.strictEqual(node.collection.type, 'Range')
		if (node.collection.type === 'Range') {
			assert.deepStrictEqual(node.collection.from, { type: 'Literal', value: 1 })
			assert.deepStrictEqual(node.collection.to, { type: 'Literal', value: 5 })
		}
	})

	it('parses for loop with range using variables', () => {
		const body = parse('{% for i in (start..end) %}{{ i }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.strictEqual(node.collection.type, 'Range')
		if (node.collection.type === 'Range') {
			assert.deepStrictEqual(node.collection.from, { type: 'Var', path: ['start'] })
			assert.deepStrictEqual(node.collection.to, { type: 'Var', path: ['end'] })
		}
	})

	it('sets params to undefined when none are specified', () => {
		const body = parse('{% for item in items %}x{% endfor %}')
		const node = body[0] as NodeFor
		assert.strictEqual(node.params, undefined)
	})
})

describe('parseLiquid: break and continue', () => {
	it('parses break inside for loop', () => {
		const body = parse('{% for item in items %}{% if item == "stop" %}{% break %}{% endif %}{{ item }}{% endfor %}')
		const forNode = body[0] as NodeFor
		const ifNode = forNode.body.find(n => n.type === 'If') as NodeIf
		const breakNode = ifNode.body.find(n => n.type === 'ForBreak')
		assert.ok(breakNode)
		assert.strictEqual(breakNode.type, 'ForBreak')
	})

	it('parses continue inside for loop', () => {
		const body = parse('{% for item in items %}{% if item == "skip" %}{% continue %}{% endif %}{{ item }}{% endfor %}')
		const forNode = body[0] as NodeFor
		const ifNode = forNode.body.find(n => n.type === 'If') as NodeIf
		const continueNode = ifNode.body.find(n => n.type === 'ForContinue')
		assert.ok(continueNode)
		assert.strictEqual(continueNode.type, 'ForContinue')
	})
})

describe('parseLiquid: case/when', () => {
	it('parses basic case/when', () => {
		const body = parse('{% case color %}{% when "red" %}Red{% when "blue" %}Blue{% endcase %}')
		const node = body[0] as NodeCase
		assert.strictEqual(node.type, 'Case')
		assert.deepStrictEqual(node.subject, { type: 'Var', path: ['color'] })
		assert.strictEqual(node.whens.length, 2)
		assert.deepStrictEqual(node.whens[0].values, [{ type: 'Literal', value: 'red' }])
		assert.deepStrictEqual(node.whens[1].values, [{ type: 'Literal', value: 'blue' }])
	})

	it('parses case/when with else', () => {
		const body = parse('{% case x %}{% when 1 %}one{% else %}other{% endcase %}')
		const node = body[0] as NodeCase
		const elseBody = node.elseBody
		assert.ok(elseBody)
		assert.ok(elseBody.some(n => n.type === 'Text' && n.value.includes('other')))
	})

	it('parses when with comma-separated values', () => {
		const body = parse('{% case size %}{% when "small", "medium" %}fits{% endcase %}')
		const node = body[0] as NodeCase
		assert.strictEqual(node.whens[0].values.length, 2)
		assert.deepStrictEqual(node.whens[0].values[0], { type: 'Literal', value: 'small' })
		assert.deepStrictEqual(node.whens[0].values[1], { type: 'Literal', value: 'medium' })
	})

	it('parses case with dot-notation subject', () => {
		const body = parse('{% case page.status %}{% when "draft" %}draft{% endcase %}')
		const node = body[0] as NodeCase
		assert.deepStrictEqual(node.subject, { type: 'Var', path: ['page', 'status'] })
	})

	it('parses case with multiple whens and else', () => {
		const body = parse([
			'{% case tier %}',
			'{% when "gold" %}Gold',
			'{% when "silver" %}Silver',
			'{% when "bronze" %}Bronze',
			'{% else %}None',
			'{% endcase %}',
		].join(''))
		const node = body[0] as NodeCase
		assert.strictEqual(node.whens.length, 3)
		assert.ok(node.elseBody)
	})
})

describe('parseLiquid: assign', () => {
	it('parses assign with string literal', () => {
		const body = parse('{% assign name = "world" %}')
		const node = body[0] as NodeAssign
		assert.strictEqual(node.type, 'Assign')
		assert.strictEqual(node.name, 'name')
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 'world' })
	})

	it('parses assign with number literal', () => {
		const body = parse('{% assign count = 42 %}')
		const node = body[0] as NodeAssign
		assert.strictEqual(node.name, 'count')
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 42 })
	})

	it('parses assign with variable reference', () => {
		const body = parse('{% assign alias = original %}')
		const node = body[0] as NodeAssign
		assert.strictEqual(node.name, 'alias')
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['original'] })
	})

	it('parses assign with dot-notation variable', () => {
		const body = parse('{% assign title = page.title %}')
		const node = body[0] as NodeAssign
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['page', 'title'] })
	})
})

describe('parseLiquid: render', () => {
	it('parses render with quoted filename', () => {
		const body = parse('{% render "header.html" %}')
		const node = body[0] as NodeRender
		assert.strictEqual(node.type, 'Render')
		assert.strictEqual(node.file, 'header.html')
		assert.deepStrictEqual(node.variables, [])
	})

	it('parses render with single-quoted filename', () => {
		const body = parse("{% render 'footer.html' %}")
		const node = body[0] as NodeRender
		assert.strictEqual(node.file, 'footer.html')
	})

	it('parses render with identifier filename', () => {
		const body = parse('{% render header %}')
		const node = body[0] as NodeRender
		assert.strictEqual(node.file, 'header')
	})

	it('parses render with variable passing', () => {
		const body = parse('{% render "card.html", title: page.title, count: 5 %}')
		const node = body[0] as NodeRender
		assert.strictEqual(node.file, 'card.html')
		assert.strictEqual(node.variables.length, 2)
		assert.strictEqual(node.variables[0].name, 'title')
		assert.deepStrictEqual(node.variables[0].expression, { type: 'Var', path: ['page', 'title'] })
		assert.strictEqual(node.variables[1].name, 'count')
		assert.deepStrictEqual(node.variables[1].expression, { type: 'Literal', value: 5 })
	})

	it('parses render with string variable values', () => {
		const body = parse('{% render "btn.html", label: "Click me" %}')
		const node = body[0] as NodeRender
		assert.strictEqual(node.variables[0].name, 'label')
		assert.deepStrictEqual(node.variables[0].expression, { type: 'Literal', value: 'Click me' })
	})
})

describe('parseLiquid: capture', () => {
	it('parses capture block', () => {
		const body = parse('{% capture greeting %}Hello {{ name }}{% endcapture %}')
		const node = body[0] as NodeCapture
		assert.strictEqual(node.type, 'Capture')
		assert.strictEqual(node.name, 'greeting')
		assert.ok(node.body.length > 0)
		assert.ok(node.body.some(n => n.type === 'Text'))
		assert.ok(node.body.some(n => n.type === 'Output'))
	})

	it('parses capture with nested tags', () => {
		const body = parse('{% capture output %}{% if show %}yes{% endif %}{% endcapture %}')
		const node = body[0] as NodeCapture
		assert.strictEqual(node.name, 'output')
		assert.ok(node.body.some(n => n.type === 'If'))
	})
})

describe('parseLiquid: comment', () => {
	it('parses comment block', () => {
		const body = parse('{% comment %}this is hidden{% endcomment %}')
		const node = body[0] as NodeComment
		assert.strictEqual(node.type, 'Comment')
		assert.ok(node.body.length > 0)
	})

	it('parses inline Liquid comment syntax', () => {
		const body = parse('before{%# inline comment %}after')
		assert.strictEqual(body.length, 2)
		assert.strictEqual((body[0] as NodeText).value, 'before')
		assert.strictEqual((body[1] as NodeText).value, 'after')
	})

	it('preserves content around comment blocks', () => {
		const body = parse('A{% comment %}hidden{% endcomment %}B')
		const texts = body.filter(n => n.type === 'Text') as NodeText[]
		assert.ok(texts.some(t => t.value === 'A'))
		assert.ok(texts.some(t => t.value === 'B'))
	})
})

describe('parseLiquid: raw', () => {
	it('parses raw block preserving Liquid syntax as text', () => {
		const body = parse('{% raw %}{{ not_rendered }}{% endraw %}')
		const node = body[0] as NodeRaw
		assert.strictEqual(node.type, 'Raw')
		const textNode = node.body[0] as NodeText
		assert.strictEqual(textNode.type, 'Text')
		assert.strictEqual(textNode.value, '{{ not_rendered }}')
	})

	it('parses raw block with tag syntax inside', () => {
		const body = parse('{% raw %}{% if x %}hello{% endif %}{% endraw %}')
		const node = body[0] as NodeRaw
		const textNode = node.body[0] as NodeText
		assert.ok(textNode.value.includes('{% if x %}'))
	})
})

describe('parseLiquid: shortcode', () => {
	it('parses standalone identifier as shortcode', () => {
		const body = parse('{% currentYear %}')
		const node = body[0] as NodeShortCode
		assert.strictEqual(node.type, 'ShortCode')
		assert.strictEqual(node.name, 'currentYear')
	})
})

describe('parseLiquid: expressions', () => {
	it('parses decimal number in output', () => {
		const body = parse('{{ 3.14 }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 3.14 })
	})

	it('parses range expression in for loop', () => {
		const body = parse('{% for i in (1..10) %}{{ i }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.strictEqual(node.collection.type, 'Range')
	})

	it('parses comparison with string literals', () => {
		const body = parse('{% if name == "alice" %}hi{% endif %}')
		const ifNode = body[0] as NodeIf
		if (ifNode.condition.type === 'Binary') {
			assert.deepStrictEqual(ifNode.condition.right, { type: 'Literal', value: 'alice' })
		}
	})

	it('parses comparison with number literals', () => {
		const body = parse('{% if count < 10 %}few{% endif %}')
		const ifNode = body[0] as NodeIf
		if (ifNode.condition.type === 'Binary') {
			assert.strictEqual(ifNode.condition.operator, '<')
			assert.deepStrictEqual(ifNode.condition.right, { type: 'Literal', value: 10 })
		}
	})
})

describe('parseLiquid: bracket access', () => {
	it('parses numeric index on variable', () => {
		const body = parse('{{ items[0] }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['items'] },
			key: { type: 'Literal', value: 0 },
		})
	})

	it('parses string key on variable', () => {
		const body = parse('{{ obj["name"] }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['obj'] },
			key: { type: 'Literal', value: 'name' },
		})
	})

	it('parses bracket after dot-notation path', () => {
		const body = parse('{{ a.b[0] }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['a', 'b'] },
			key: { type: 'Literal', value: 0 },
		})
	})

	it('parses variable as bracket key', () => {
		const body = parse('{{ items[idx] }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['items'] },
			key: { type: 'Var', path: ['idx'] },
		})
	})

	it('parses chained bracket access', () => {
		const body = parse('{{ matrix[0][1] }}')
		const node = body[0] as NodeOutput
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: {
				type: 'Access',
				object: { type: 'Var', path: ['matrix'] },
				key: { type: 'Literal', value: 0 },
			},
			key: { type: 'Literal', value: 1 },
		})
	})

	it('parses bracket access in assign expression', () => {
		const body = parse('{% assign first = items[0] %}')
		const node = body[0] as NodeAssign
		assert.strictEqual(node.type, 'Assign')
		assert.strictEqual(node.name, 'first')
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['items'] },
			key: { type: 'Literal', value: 0 },
		})
	})

	it('parses bracket access in if condition', () => {
		const body = parse('{% if items[0] == "a" %}yes{% endif %}')
		const node = body[0] as NodeIf
		assert.strictEqual(node.condition.type, 'Binary')
		if (node.condition.type === 'Binary') {
			assert.deepStrictEqual(node.condition.left, {
				type: 'Access',
				object: { type: 'Var', path: ['items'] },
				key: { type: 'Literal', value: 0 },
			})
		}
	})

	it('parses bracket access as for collection', () => {
		const body = parse('{% for item in nested[0] %}{{ item }}{% endfor %}')
		const node = body[0] as NodeFor
		assert.deepStrictEqual(node.collection, {
			type: 'Access',
			object: { type: 'Var', path: ['nested'] },
			key: { type: 'Literal', value: 0 },
		})
	})

	it('throws on unclosed bracket', () => {
		assert.throws(() => parse('{{ items[0 }}'), ParserError)
	})
})

describe('parseLiquid: increment and decrement', () => {
	it('parses increment tag', () => {
		const body = parse('{% increment my_counter %}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeIncrement
		assert.strictEqual(node.type, 'Increment')
		assert.strictEqual(node.variable, 'my_counter')
	})

	it('parses decrement tag', () => {
		const body = parse('{% decrement my_counter %}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeDecrement
		assert.strictEqual(node.type, 'Decrement')
		assert.strictEqual(node.variable, 'my_counter')
	})

	it('parses multiple increment tags with same variable', () => {
		const body = parse('{% increment x %}{% increment x %}{% increment x %}')
		assert.strictEqual(body.length, 3)
		for (const node of body) {
			assert.strictEqual(node.type, 'Increment')
			assert.strictEqual((node as NodeIncrement).variable, 'x')
		}
	})

	it('parses increment and decrement on same variable', () => {
		const body = parse('{% increment x %}{% decrement x %}')
		assert.strictEqual(body.length, 2)
		assert.strictEqual(body[0].type, 'Increment')
		assert.strictEqual(body[1].type, 'Decrement')
		assert.strictEqual((body[0] as NodeIncrement).variable, 'x')
		assert.strictEqual((body[1] as NodeDecrement).variable, 'x')
	})

	it('parses increment with hyphenated variable name', () => {
		const body = parse('{% increment my-var %}')
		const node = body[0] as NodeIncrement
		assert.strictEqual(node.variable, 'my-var')
	})

	it('throws on increment without variable name', () => {
		assert.throws(() => parse('{% increment %}'), ParserError)
	})

	it('throws on decrement without variable name', () => {
		assert.throws(() => parse('{% decrement %}'), ParserError)
	})
})

describe('parseLiquid: echo', () => {
	it('parses echo with variable', () => {
		const body = parse('{% echo title %}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeEcho
		assert.strictEqual(node.type, 'Echo')
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['title'] })
	})

	it('parses echo with dot-notation path', () => {
		const body = parse('{% echo site.title %}')
		const node = body[0] as NodeEcho
		assert.deepStrictEqual(node.expression, { type: 'Var', path: ['site', 'title'] })
	})

	it('parses echo with string literal', () => {
		const body = parse('{% echo "hello" %}')
		const node = body[0] as NodeEcho
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 'hello' })
	})

	it('parses echo with number literal', () => {
		const body = parse('{% echo 42 %}')
		const node = body[0] as NodeEcho
		assert.deepStrictEqual(node.expression, { type: 'Literal', value: 42 })
	})

	it('parses echo with bracket access', () => {
		const body = parse('{% echo items[0] %}')
		const node = body[0] as NodeEcho
		assert.deepStrictEqual(node.expression, {
			type: 'Access',
			object: { type: 'Var', path: ['items'] },
			key: { type: 'Literal', value: 0 },
		})
	})
})

describe('parseLiquid: cycle', () => {
	it('parses unnamed cycle with string literals', () => {
		const body = parse('{% cycle "one", "two", "three" %}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeCycle
		assert.strictEqual(node.type, 'Cycle')
		assert.strictEqual(node.values.length, 3)
		assert.deepStrictEqual(node.values[0], { type: 'Literal', value: 'one' })
		assert.deepStrictEqual(node.values[1], { type: 'Literal', value: 'two' })
		assert.deepStrictEqual(node.values[2], { type: 'Literal', value: 'three' })
	})

	it('derives group name from values for unnamed cycle', () => {
		const body = parse('{% cycle "one", "two" %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.group, 'one.two')
	})

	it('parses named cycle with explicit group', () => {
		const body = parse('{% cycle "row": "odd", "even" %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.type, 'Cycle')
		assert.strictEqual(node.group, 'row')
		assert.strictEqual(node.values.length, 2)
		assert.deepStrictEqual(node.values[0], { type: 'Literal', value: 'odd' })
		assert.deepStrictEqual(node.values[1], { type: 'Literal', value: 'even' })
	})

	it('parses cycle with number literals', () => {
		const body = parse('{% cycle 1, 2, 3 %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.values.length, 3)
		assert.deepStrictEqual(node.values[0], { type: 'Literal', value: 1 })
		assert.deepStrictEqual(node.values[1], { type: 'Literal', value: 2 })
		assert.deepStrictEqual(node.values[2], { type: 'Literal', value: 3 })
	})

	it('parses cycle with variable references', () => {
		const body = parse('{% cycle a, b %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.values.length, 2)
		assert.deepStrictEqual(node.values[0], { type: 'Var', path: ['a'] })
		assert.deepStrictEqual(node.values[1], { type: 'Var', path: ['b'] })
	})

	it('derives group from variable paths', () => {
		const body = parse('{% cycle a.x, b %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.group, 'a.x.b')
	})

	it('parses cycle with single value', () => {
		const body = parse('{% cycle "only" %}')
		const node = body[0] as NodeCycle
		assert.strictEqual(node.values.length, 1)
		assert.deepStrictEqual(node.values[0], { type: 'Literal', value: 'only' })
	})

	it('throws when named cycle group is not a string literal', () => {
		assert.throws(() => parse('{% cycle 123: "a", "b" %}'), ParserError)
	})
})

describe('parseLiquid: tablerow', () => {
	it('parses basic tablerow', () => {
		const body = parse('{% tablerow item in items %}{{ item }}{% endtablerow %}')
		assert.strictEqual(body.length, 1)
		const node = body[0] as NodeTableRow
		assert.strictEqual(node.type, 'TableRow')
		assert.strictEqual(node.variable, 'item')
		assert.deepStrictEqual(node.collection, { type: 'Var', path: ['items'] })
		assert.ok(node.body.length > 0)
	})

	it('parses tablerow with cols param', () => {
		const body = parse('{% tablerow item in items cols:2 %}{{ item }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		const params = node.params
		assert.ok(params)
		const colsParam = params.find(p => p.type === 'cols')
		assert.ok(colsParam)
		assert.strictEqual(colsParam.type === 'cols' && colsParam.value, 2)
	})

	it('parses tablerow with limit param', () => {
		const body = parse('{% tablerow item in items limit:3 %}{{ item }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		const params = node.params
		assert.ok(params)
		const limitParam = params.find(p => p.type === 'limit')
		assert.ok(limitParam)
		assert.strictEqual(limitParam.type === 'limit' && limitParam.value, 3)
	})

	it('parses tablerow with offset param', () => {
		const body = parse('{% tablerow item in items offset:1 %}{{ item }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		const params = node.params
		assert.ok(params)
		const offsetParam = params.find(p => p.type === 'offset')
		assert.ok(offsetParam)
		assert.strictEqual(offsetParam.type === 'offset' && offsetParam.value, 1)
	})

	it('parses tablerow with multiple params', () => {
		const body = parse('{% tablerow item in items cols:3 limit:6 offset:2 %}{{ item }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		const params = node.params
		assert.ok(params)
		assert.strictEqual(params.length, 3)
	})

	it('parses tablerow with dot-notation collection', () => {
		const body = parse('{% tablerow tag in site.tags %}{{ tag }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		assert.deepStrictEqual(node.collection, { type: 'Var', path: ['site', 'tags'] })
	})

	it('parses tablerow with range expression', () => {
		const body = parse('{% tablerow i in (1..5) cols:3 %}{{ i }}{% endtablerow %}')
		const node = body[0] as NodeTableRow
		assert.strictEqual(node.collection.type, 'Range')
		if (node.collection.type === 'Range') {
			assert.deepStrictEqual(node.collection.from, { type: 'Literal', value: 1 })
			assert.deepStrictEqual(node.collection.to, { type: 'Literal', value: 5 })
		}
	})

	it('sets params to undefined when none are specified', () => {
		const body = parse('{% tablerow item in items %}x{% endtablerow %}')
		const node = body[0] as NodeTableRow
		assert.strictEqual(node.params, undefined)
	})
})

describe('parseLiquid: error handling', () => {
	it('throws ParserError on unclosed output tag', () => {
		assert.throws(() => parse('{{ broken'), ParserError)
	})

	it('throws ParserError on unclosed tag', () => {
		assert.throws(() => parse('{% if true'), ParserError)
	})

	it('throws ParserError on unclosed string literal', () => {
		assert.throws(() => parse('{{ "unclosed }}'), ParserError)
	})

	it('throws ParserError on unclosed raw block', () => {
		assert.throws(() => parse('{% raw %}no endraw'), ParserError)
	})

	it('throws ParserError on unexpected character in expression', () => {
		assert.throws(() => parse('{{ @invalid }}'), ParserError)
	})
})

describe('parseLiquid: arithmetic expressions', () => {
	it('parses addition in output', () => {
		const body = parse('{{ 2 + 3 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.type, 'Binary')
		assert.strictEqual(expr.operator, '+')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 2 })
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 3 })
	})

	it('parses subtraction in output', () => {
		const body = parse('{{ 10 - 4 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.type, 'Binary')
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 10 })
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 4 })
	})

	it('parses multiplication in output', () => {
		const body = parse('{{ 3 * 7 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.type, 'Binary')
		assert.strictEqual(expr.operator, '*')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 3 })
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 7 })
	})

	it('parses division in output', () => {
		const body = parse('{{ 20 / 4 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.type, 'Binary')
		assert.strictEqual(expr.operator, '/')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 20 })
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 4 })
	})

	it('parses multiplication before addition (precedence)', () => {
		const body = parse('{{ 2 + 3 * 4 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '+')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 2 })
		const right = expr.right as ExpressionBinary
		assert.strictEqual(right.operator, '*')
		assert.deepStrictEqual(right.left, { type: 'Literal', value: 3 })
		assert.deepStrictEqual(right.right, { type: 'Literal', value: 4 })
	})

	it('parses left-associative addition', () => {
		const body = parse('{{ 1 + 2 + 3 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '+')
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 3 })
		const left = expr.left as ExpressionBinary
		assert.strictEqual(left.operator, '+')
		assert.deepStrictEqual(left.left, { type: 'Literal', value: 1 })
		assert.deepStrictEqual(left.right, { type: 'Literal', value: 2 })
	})

	it('parses left-associative multiplication', () => {
		const body = parse('{{ 2 * 3 * 4 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '*')
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 4 })
		const left = expr.left as ExpressionBinary
		assert.strictEqual(left.operator, '*')
		assert.deepStrictEqual(left.left, { type: 'Literal', value: 2 })
		assert.deepStrictEqual(left.right, { type: 'Literal', value: 3 })
	})

	it('parses mixed arithmetic with correct precedence', () => {
		const body = parse('{{ 10 - 2 * 3 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 10 })
		const right = expr.right as ExpressionBinary
		assert.strictEqual(right.operator, '*')
	})

	it('parses arithmetic with variables', () => {
		const body = parse('{{ price * quantity }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '*')
		assert.deepStrictEqual(expr.left, { type: 'Var', path: ['price'] })
		assert.deepStrictEqual(expr.right, { type: 'Var', path: ['quantity'] })
	})

	it('parses arithmetic in assign', () => {
		const body = parse('{% assign total = price * quantity %}')
		const node = body[0] as NodeAssign
		assert.strictEqual(node.type, 'Assign')
		assert.strictEqual(node.name, 'total')
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '*')
	})

	it('parses arithmetic in if condition with comparison', () => {
		const body = parse('{% if a + b > 10 %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		const cond = ifNode.condition as ExpressionBinary
		assert.strictEqual(cond.operator, '>')
		const left = cond.left as ExpressionBinary
		assert.strictEqual(left.operator, '+')
	})

	it('parses division with decimal result operands', () => {
		const body = parse('{{ 7.5 / 2.5 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '/')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 7.5 })
		assert.deepStrictEqual(expr.right, { type: 'Literal', value: 2.5 })
	})
})

describe('parseLiquid: unary not', () => {
	it('parses not operator on variable', () => {
		const body = parse('{% if not hidden %}visible{% endif %}')
		const ifNode = body[0] as NodeIf
		const cond = ifNode.condition as ExpressionUnary
		assert.strictEqual(cond.type, 'Unary')
		assert.strictEqual(cond.operator, 'not')
		assert.deepStrictEqual(cond.operand, { type: 'Var', path: ['hidden'] })
	})

	it('parses not with comparison: not binds tighter than comparison', () => {
		const body = parse('{% if not count > 5 %}small{% endif %}')
		const ifNode = body[0] as NodeIf
		const cond = ifNode.condition as ExpressionBinary
		assert.strictEqual(cond.operator, '>')
		const left = cond.left as ExpressionUnary
		assert.strictEqual(left.type, 'Unary')
		assert.strictEqual(left.operator, 'not')
		assert.deepStrictEqual(left.operand, { type: 'Var', path: ['count'] })
		assert.deepStrictEqual(cond.right, { type: 'Literal', value: 5 })
	})

	it('parses double not', () => {
		const body = parse('{% if not not x %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		const outer = ifNode.condition as ExpressionUnary
		assert.strictEqual(outer.type, 'Unary')
		assert.strictEqual(outer.operator, 'not')
		const inner = outer.operand as ExpressionUnary
		assert.strictEqual(inner.type, 'Unary')
		assert.strictEqual(inner.operator, 'not')
		assert.deepStrictEqual(inner.operand, { type: 'Var', path: ['x'] })
	})

	it('parses not combined with and', () => {
		const body = parse('{% if not a and b %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		const cond = ifNode.condition as ExpressionBinary
		assert.strictEqual(cond.operator, 'and')
		const left = cond.left as ExpressionUnary
		assert.strictEqual(left.type, 'Unary')
		assert.strictEqual(left.operator, 'not')
		assert.deepStrictEqual(left.operand, { type: 'Var', path: ['a'] })
		assert.deepStrictEqual(cond.right, { type: 'Var', path: ['b'] })
	})

	it('parses not combined with or', () => {
		const body = parse('{% if not a or b %}yes{% endif %}')
		const ifNode = body[0] as NodeIf
		const cond = ifNode.condition as ExpressionBinary
		assert.strictEqual(cond.operator, 'or')
		const left = cond.left as ExpressionUnary
		assert.strictEqual(left.type, 'Unary')
		assert.strictEqual(left.operator, 'not')
	})
})

describe('parseLiquid: unary minus', () => {
	it('parses unary minus on number literal', () => {
		const body = parse('{{ -5 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionUnary
		assert.strictEqual(expr.type, 'Unary')
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.operand, { type: 'Literal', value: 5 })
	})

	it('parses unary minus on variable', () => {
		const body = parse('{{ -x }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionUnary
		assert.strictEqual(expr.type, 'Unary')
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.operand, { type: 'Var', path: ['x'] })
	})

	it('parses unary minus in assign', () => {
		const body = parse('{% assign neg = -1 %}')
		const node = body[0] as NodeAssign
		const expr = node.expression as ExpressionUnary
		assert.strictEqual(expr.type, 'Unary')
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.operand, { type: 'Literal', value: 1 })
	})

	it('parses binary minus after unary minus', () => {
		const body = parse('{{ 10 - -3 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionBinary
		assert.strictEqual(expr.operator, '-')
		assert.deepStrictEqual(expr.left, { type: 'Literal', value: 10 })
		const right = expr.right as ExpressionUnary
		assert.strictEqual(right.type, 'Unary')
		assert.strictEqual(right.operator, '-')
		assert.deepStrictEqual(right.operand, { type: 'Literal', value: 3 })
	})
})

const stubResolver = () => {
	throw new Error('resolver should not be called in these tests')
}

const renderTemplate = async (input: string, context: RenderContext = {}) => {
	const template = parseLiquid(input, 'test')
	return render(template, context, stubResolver as never)
}

describe('renderLiquid: arithmetic', () => {
	it('renders addition', async () => {
		const result = await renderTemplate('{{ 2 + 3 }}')
		assert.strictEqual(result, '5')
	})

	it('renders subtraction', async () => {
		const result = await renderTemplate('{{ 10 - 4 }}')
		assert.strictEqual(result, '6')
	})

	it('renders multiplication', async () => {
		const result = await renderTemplate('{{ 3 * 7 }}')
		assert.strictEqual(result, '21')
	})

	it('renders division', async () => {
		const result = await renderTemplate('{{ 20 / 4 }}')
		assert.strictEqual(result, '5')
	})

	it('renders multiplication before addition', async () => {
		const result = await renderTemplate('{{ 2 + 3 * 4 }}')
		assert.strictEqual(result, '14')
	})

	it('renders chained addition', async () => {
		const result = await renderTemplate('{{ 1 + 2 + 3 }}')
		assert.strictEqual(result, '6')
	})

	it('renders chained subtraction left-to-right', async () => {
		const result = await renderTemplate('{{ 10 - 3 - 2 }}')
		assert.strictEqual(result, '5')
	})

	it('renders mixed precedence: sub and mul', async () => {
		const result = await renderTemplate('{{ 10 - 2 * 3 }}')
		assert.strictEqual(result, '4')
	})

	it('renders division with decimal result', async () => {
		const result = await renderTemplate('{{ 7 / 2 }}')
		assert.strictEqual(result, '3.5')
	})

	it('renders arithmetic with variables', async () => {
		const result = await renderTemplate(
			'{{ price * quantity }}',
			{ price: 25, quantity: 4 }
		)
		assert.strictEqual(result, '100')
	})

	it('renders assign with arithmetic', async () => {
		const result = await renderTemplate(
			'{% assign total = 5 * 3 %}{{ total }}'
		)
		assert.strictEqual(result, '15')
	})

	it('renders assign with variable arithmetic', async () => {
		const result = await renderTemplate(
			'{% assign total = price + tax %}{{ total }}',
			{ price: 100, tax: 21 }
		)
		assert.strictEqual(result, '121')
	})

	it('renders arithmetic in if condition', async () => {
		const result = await renderTemplate(
			'{% if 2 + 2 > 3 %}yes{% else %}no{% endif %}'
		)
		assert.strictEqual(result, 'yes')
	})
})

describe('renderLiquid: unary minus', () => {
	it('renders negative number literal', async () => {
		const result = await renderTemplate('{{ -5 }}')
		assert.strictEqual(result, '-5')
	})

	it('renders negative variable', async () => {
		const result = await renderTemplate('{{ -x }}', { x: 10 })
		assert.strictEqual(result, '-10')
	})

	it('renders assign with negative value', async () => {
		const result = await renderTemplate(
			'{% assign neg = -1 %}{{ neg }}'
		)
		assert.strictEqual(result, '-1')
	})

	it('renders binary minus with unary minus operand', async () => {
		const result = await renderTemplate('{{ 10 - -3 }}')
		assert.strictEqual(result, '13')
	})

	it('renders multiplication with negative operand', async () => {
		const result = await renderTemplate('{{ 5 * -2 }}')
		assert.strictEqual(result, '-10')
	})
})

describe('renderLiquid: unary not', () => {
	it('renders not with falsy variable', async () => {
		const result = await renderTemplate(
			'{% if not hidden %}visible{% endif %}',
			{ hidden: false }
		)
		assert.strictEqual(result, 'visible')
	})

	it('renders not with truthy variable', async () => {
		const result = await renderTemplate(
			'{% if not hidden %}visible{% endif %}',
			{ hidden: true }
		)
		assert.strictEqual(result, '')
	})

	it('renders not with undefined variable', async () => {
		const result = await renderTemplate(
			'{% if not missing %}shown{% endif %}'
		)
		assert.strictEqual(result, 'shown')
	})

	it('renders not with comparison (not binds tighter)', async () => {
		const result = await renderTemplate(
			'{% if not active == true %}shown{% else %}hidden{% endif %}',
			{ active: false }
		)
		assert.strictEqual(result, 'shown')
	})

	it('renders double not as identity', async () => {
		const result = await renderTemplate(
			'{% if not not active %}yes{% else %}no{% endif %}',
			{ active: true }
		)
		assert.strictEqual(result, 'yes')
	})

	it('renders not with and', async () => {
		const result = await renderTemplate(
			'{% if not a and b %}yes{% else %}no{% endif %}',
			{ a: false, b: true }
		)
		assert.strictEqual(result, 'yes')
	})

	it('renders not with or', async () => {
		const result = await renderTemplate(
			'{% if not a or b %}yes{% else %}no{% endif %}',
			{ a: true, b: false }
		)
		assert.strictEqual(result, 'no')
	})
})

describe('parseLiquid: filters', () => {
	it('parses single filter without arguments', () => {
		const body = parse('{{ title | upcase }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.type, 'Filter')
		assert.deepStrictEqual(expr.input, { type: 'Var', path: ['title'] })
		assert.strictEqual(expr.filters.length, 1)
		assert.strictEqual(expr.filters[0].name, 'upcase')
		assert.deepStrictEqual(expr.filters[0].args, [])
	})

	it('parses filter with one argument', () => {
		const body = parse('{{ page.date | date: "full" }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.type, 'Filter')
		assert.deepStrictEqual(expr.input, { type: 'Var', path: ['page', 'date'] })
		assert.strictEqual(expr.filters[0].name, 'date')
		assert.strictEqual(expr.filters[0].args.length, 1)
		assert.deepStrictEqual(expr.filters[0].args[0], { type: 'Literal', value: 'full' })
	})

	it('parses filter with multiple arguments', () => {
		const body = parse('{{ text | replace: "a", "b" }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.filters[0].name, 'replace')
		assert.strictEqual(expr.filters[0].args.length, 2)
		assert.deepStrictEqual(expr.filters[0].args[0], { type: 'Literal', value: 'a' })
		assert.deepStrictEqual(expr.filters[0].args[1], { type: 'Literal', value: 'b' })
	})

	it('parses chained filters', () => {
		const body = parse('{{ title | upcase | prepend: "PREFIX" }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.filters.length, 2)
		assert.strictEqual(expr.filters[0].name, 'upcase')
		assert.deepStrictEqual(expr.filters[0].args, [])
		assert.strictEqual(expr.filters[1].name, 'prepend')
		assert.strictEqual(expr.filters[1].args.length, 1)
	})

	it('parses filter on string literal', () => {
		const body = parse('{{ "hello" | upcase }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.type, 'Filter')
		assert.deepStrictEqual(expr.input, { type: 'Literal', value: 'hello' })
	})

	it('parses filter on number literal', () => {
		const body = parse('{{ 42 | times: 2 }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.deepStrictEqual(expr.input, { type: 'Literal', value: 42 })
		assert.strictEqual(expr.filters[0].name, 'times')
	})

	it('parses filter with variable argument', () => {
		const body = parse('{{ title | prepend: baseUrl }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.deepStrictEqual(expr.filters[0].args[0], { type: 'Var', path: ['baseUrl'] })
	})

	it('parses filter in assign', () => {
		const body = parse('{% assign year = page.date | date: "year" %}')
		const node = body[0] as NodeAssign
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.type, 'Filter')
		assert.deepStrictEqual(expr.input, { type: 'Var', path: ['page', 'date'] })
		assert.strictEqual(expr.filters[0].name, 'date')
	})

	it('parses filter in echo', () => {
		const body = parse('{% echo title | upcase %}')
		const node = body[0] as NodeEcho
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.type, 'Filter')
		assert.strictEqual(expr.filters[0].name, 'upcase')
	})

	it('returns plain expression when no filter present', () => {
		const body = parse('{{ title }}')
		const node = body[0] as NodeOutput
		assert.strictEqual(node.expression.type, 'Var')
	})

	it('throws on missing filter name after pipe', () => {
		assert.throws(() => parse('{{ title | }}'), ParserError)
	})

	it('parses three chained filters with mixed args', () => {
		const body = parse('{{ text | replace: "x", "y" | upcase | prepend: "/" }}')
		const node = body[0] as NodeOutput
		const expr = node.expression as ExpressionFilter
		assert.strictEqual(expr.filters.length, 3)
		assert.strictEqual(expr.filters[0].name, 'replace')
		assert.strictEqual(expr.filters[0].args.length, 2)
		assert.strictEqual(expr.filters[1].name, 'upcase')
		assert.strictEqual(expr.filters[1].args.length, 0)
		assert.strictEqual(expr.filters[2].name, 'prepend')
		assert.strictEqual(expr.filters[2].args.length, 1)
	})
})

describe('renderLiquid: filters', () => {
	it('renders built-in date filter with "year" preset', async () => {
		const result = await renderTemplate(
			'{{ myDate | date: "year" }}',
			{ myDate: new Date(2026, 3, 24) }
		)
		assert.strictEqual(result, '2026')
	})

	it('renders built-in date filter with "rfc3339" preset', async () => {
		const result = await renderTemplate(
			'{{ myDate | date: "rfc3339" }}',
			{ myDate: new Date('2026-04-24T12:00:00Z') }
		)
		assert.strictEqual(result, '2026-04-24T12:00:00.000Z')
	})

	it('renders built-in date filter with string input', async () => {
		const result = await renderTemplate(
			'{{ myDate | date: "year" }}',
			{ myDate: '2025-01-15' }
		)
		assert.strictEqual(result, '2025')
	})

	it('renders chained filters left to right', async () => {
		const result = await renderTemplate(
			'{{ title | upcase }}',
			{ title: 'hello', __filters__: { upcase: (v: unknown) => String(v).toUpperCase() } }
		)
		assert.strictEqual(result, 'HELLO')
	})

	it('renders user-defined filter', async () => {
		const result = await renderTemplate(
			'{{ name | shout }}',
			{ name: 'world', __filters__: { shout: (v: unknown) => `${v}!!!` } }
		)
		assert.strictEqual(result, 'world!!!')
	})

	it('renders user-defined filter with arguments', async () => {
		const result = await renderTemplate(
			'{{ text | wrap: "<b>", "</b>" }}',
			{
				text: 'bold',
				__filters__: {
					wrap: (v: unknown, open: unknown, close: unknown) => `${open}${v}${close}`
				}
			}
		)
		assert.strictEqual(result, '<b>bold</b>')
	})

	it('renders user filter overriding built-in', async () => {
		const result = await renderTemplate(
			'{{ myDate | date: "year" }}',
			{
				myDate: new Date(2026, 0, 1),
				__filters__: { date: () => 'custom' }
			}
		)
		assert.strictEqual(result, 'custom')
	})

	it('renders filter in assign', async () => {
		const result = await renderTemplate(
			'{% assign year = myDate | date: "year" %}The year is {{ year }}',
			{ myDate: new Date(2026, 3, 24) }
		)
		assert.strictEqual(result, 'The year is 2026')
	})

	it('throws on unknown filter', async () => {
		await assert.rejects(
			() => renderTemplate('{{ title | nonexistent }}', { title: 'hi' }),
			ParserError
		)
	})

	it('renders multiple chained filters', async () => {
		const result = await renderTemplate(
			'{{ name | upcase | prepend: "Hi " }}',
			{
				name: 'world',
				__filters__: {
					upcase: (v: unknown) => String(v).toUpperCase(),
					prepend: (v: unknown, prefix: unknown) => `${prefix}${v}`
				}
			}
		)
		assert.strictEqual(result, 'Hi WORLD')
	})

	it('renders filter on literal value', async () => {
		const result = await renderTemplate(
			'{{ "hello" | upcase }}',
			{ __filters__: { upcase: (v: unknown) => String(v).toUpperCase() } }
		)
		assert.strictEqual(result, 'HELLO')
	})
})
