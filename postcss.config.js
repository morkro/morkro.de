const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
	plugins: [
		require('postcss-import'),
		require('postcss-nesting'),
		require('postcss-custom-media'),
		require('postcss-color-functional-notation'),
		require('postcss-selector-not'),
		require('autoprefixer'),
		isProduction ? require('cssnano') : false,
	],
}
