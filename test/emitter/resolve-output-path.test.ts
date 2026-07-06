import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import config from '#config'
import { resolveBuildItemOutputPath } from '#emitter/resolve-output-path.ts'

describe('resolveBuildItemOutputPath function', () => {
	const inputDir = resolve(config.directories.input)
	const outputRoot = '.build'

	it('preserves the .css extension for CSS engine files', async () => {
		assert.strictEqual(
			await resolveBuildItemOutputPath(
				resolve(inputDir, 'css/main.css'),
				inputDir,
				outputRoot,
				undefined,
				[],
			),
			'.build/css/main.css',
		)
	})

	it('maps site-template files to .html output paths', async () => {
		assert.strictEqual(
			await resolveBuildItemOutputPath(
				resolve(inputDir, 'pages/is/index.liquid'),
				inputDir,
				outputRoot,
				undefined,
				[],
			),
			'.build/is/index.html',
		)
	})
})
