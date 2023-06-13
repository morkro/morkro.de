const path = require('node:path')
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const bundlerPlugin = require('@11ty/eleventy-plugin-bundle')
const htmlmin = require('html-minifier')
const sass = require('sass')

function minifyHtml(content, outputPath) {
	if (outputPath.endsWith('.html')) {
		return htmlmin.minify(content, {
			removeComments: true,
			collapseWhitespace: true,
		})
	}
	return content
}

function compileSass(inputContent, inputPath) {
	const parsed = path.parse(inputPath)
	const result = sass.compileString(inputContent, {
		loadPaths: [parsed.dir || '.', this.config.dir.includes],
	})
	return () => result.css
}

module.exports = function (config) {
	if (process.env.NODE_ENV === 'production') {
		config.addTransform('htmlmin', minifyHtml)
	}

	config.setLiquidOptions({
		dynamicPartials: false,
	})

	/** Plugins */
	config.addPlugin(syntaxHighlight, {
		preAttributes: {
			tabindex: 0,
			'data-language': function ({ language, content, options }) {
				return language
			},
		},
	})
	config.addPlugin(bundlerPlugin)

	/** Add different template actions */
	config.addTemplateFormats('scss')
	config.addExtension('scss', {
		outputFileExtension: 'css',
		compile: compileSass,
	})

	/** Watch these files for changes */
	config.addWatchTarget('src/css/**/*.scss')
	config.addWatchTarget('src/scripts/**/*.js')

	/** Copy these files around */
	config.addPassthroughCopy('src/assets')
	config.addPassthroughCopy('src/_redirects')
	config.addPassthroughCopy({ 'src/scripts': '/assets/scripts' })

	/** Shorthands */
	config.addShortcode('currentYear', () => new Date().getFullYear())

	/** Creates a list of blog posts */
	config.addCollection('posts', function (collection) {
		return collection
			.getFilteredByGlob('src/_posts/*.md')
			.sort((a, b) => b.date - a.date)
	})

	return {
		dir: {
			input: 'src',
			includes: '_includes',
			layouts: '_layouts',
		},
	}
}
