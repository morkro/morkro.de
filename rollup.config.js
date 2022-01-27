const { nodeResolve } = require('@rollup/plugin-node-resolve')
const minify = require('rollup-plugin-babel-minify')
const commonjs = require('rollup-plugin-commonjs')

module.exports = {
	input: 'src/scripts/index.js',
	output: {
		file: 'src/assets/fun.min.js',
		format: 'iife',
	},
	plugins: [
		nodeResolve({ browser: true }),
		commonjs({ include: 'node_modules/**' }),
		minify({ comments: false }),
	],
}
