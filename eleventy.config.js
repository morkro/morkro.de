const path = require('node:path')
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const sass = require('sass')

module.exports = function (config) {
	config.setLiquidOptions({
		dynamicPartials: false,
	})

	config.addTemplateFormats('scss')
	config.addExtension('scss', {
		outputFileExtension: 'css',
		compile: function (inputContent, inputPath) {
			const parsed = path.parse(inputPath)
			const result = sass.compileString(inputContent, {
				loadPaths: [parsed.dir || '.', this.config.dir.includes],
			})
			return () => result.css
		},
	})

	config.addPlugin(syntaxHighlight)

	// config.addWatchTarget('src/css/')
	config.addWatchTarget('src/scripts/')

	config.addPassthroughCopy('src/assets')
	// config.addPassthroughCopy('src/css')
	config.addPassthroughCopy('src/humans.txt')

	config.addShortcode('currentYear', () => new Date().getFullYear())

	config.addCollection('posts', function (collection) {
		return collection.getFilteredByGlob('src/_posts/*.md')
	})

	return {
		dir: {
			input: 'src',
			includes: '_includes',
			layouts: '_layouts',
		},
	}
}
