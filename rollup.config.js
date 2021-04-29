const resolve = require('@rollup/plugin-node-resolve')
const minify = require('rollup-plugin-babel-minify')
const commonjs = require('rollup-plugin-commonjs')

module.exports = {
	input: 'src/scripts/main.js',
	output: {
		file: 'src/assets/main.min.js',
		format: 'iife',
	},
	plugins: [
		resolve({ browser: true }),
		commonjs({ include: 'node_modules/**' }),
		minify({ comments: false }),
	],
}
