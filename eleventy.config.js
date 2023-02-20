const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')

module.exports = function (config) {
	config.setLiquidOptions({
		dynamicPartials: false,
	})

	config.addPlugin(syntaxHighlight)

	config.addWatchTarget('src/css/')
	config.addWatchTarget('src/scripts/')

	config.addPassthroughCopy('src/assets')
	config.addPassthroughCopy('src/humans.txt')

	return {
		dir: {
			input: 'src',
			includes: '_includes',
			layouts: '_layouts',
		},
	}
}
