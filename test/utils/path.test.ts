import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import config from '#config'
import { ensureOutputPath, resolveOutput } from '#utils/path.ts'

describe('ensureOutputPath function', () => {
	const buildRoot = '.build'

	describe('without permalink', () => {
		it('converts source filename to .html in build root', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot),
				'.build/index.html'
			)
		})

		it('preserves subdirectory structure', () => {
			assert.strictEqual(
				ensureOutputPath('pages/about/index.liquid', buildRoot),
				'.build/pages/about/index.html'
			)
		})

		it('replaces any extension with .html', () => {
			assert.strictEqual(
				ensureOutputPath('post.md', buildRoot),
				'.build/post.html'
			)
		})

		it('treats undefined permalink as no permalink', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, undefined),
				'.build/index.html'
			)
		})

		it('treats non-string permalink as no permalink', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, 42 as unknown as string),
				'.build/index.html'
			)
		})
	})

	describe('with permalink ending in /', () => {
		it('uses source basename as filename under permalink path', () => {
			assert.strictEqual(
				ensureOutputPath('about.liquid', buildRoot, '/about/'),
				'.build/about/about.html'
			)
		})

		it('handles nested permalink paths', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, '/blog/posts/'),
				'.build/blog/posts/index.html'
			)
		})

		it('places file at build root when permalink is /', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, '/'),
				'.build/index.html'
			)
		})

		it('prepends / when permalink lacks leading slash', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, 'about/'),
				'.build/about/index.html'
			)
		})

		it('trims whitespace from permalink', () => {
			assert.strictEqual(
				ensureOutputPath('index.liquid', buildRoot, '  /about/  '),
				'.build/about/index.html'
			)
		})
	})

	describe('with permalink not ending in /', () => {
		it('uses permalink as the exact output filename', () => {
			assert.strictEqual(
				ensureOutputPath('feed.liquid', buildRoot, '/feed.xml'),
				'.build/feed.xml'
			)
		})

		it('handles nested file permalink', () => {
			assert.strictEqual(
				ensureOutputPath('page.liquid', buildRoot, '/about/resume.html'),
				'.build/about/resume.html'
			)
		})

		it('prepends / when permalink lacks leading slash', () => {
			assert.strictEqual(
				ensureOutputPath('feed.liquid', buildRoot, 'feed.xml'),
				'.build/feed.xml'
			)
		})
	})
})

describe('resolveOutput function', () => {
	const buildRoot = '.build'
	const inputRoot = resolve(config.directories.input)

	it('strips the pages directory when no permalink is provided', () => {
		assert.strictEqual(
			resolveOutput(resolve(inputRoot, 'pages/is/index.liquid'), buildRoot),
			'.build/is/index.html',
		)
	})

	it('maps a pages permalink to the build root index file', () => {
		assert.strictEqual(
			resolveOutput(resolve(inputRoot, 'pages/home/index.liquid'), buildRoot, '/'),
			'.build/index.html',
		)
	})

	it('maps a pages permalink to a nested output directory', () => {
		assert.strictEqual(
			resolveOutput(resolve(inputRoot, 'pages/is/index.liquid'), buildRoot, '/is/'),
			'.build/is/index.html',
		)
	})

	it('maps a non-page file permalink to an exact output filename', () => {
		assert.strictEqual(
			resolveOutput(resolve(inputRoot, 'pages/rss/index.liquid'), buildRoot, '/feed.xml'),
			'.build/feed.xml',
		)
	})
})
