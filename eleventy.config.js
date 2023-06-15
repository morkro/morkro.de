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

function datetoRFC3339(inputDate) {
	const date = new Date(inputDate).toISOString()
	const chunks = date.split('.')
	chunks.pop()
	return `${chunks.join('')}Z`
}

function encodeXML(string) {
	return string
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
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

	/** Filter */
	config.addFilter('dateToRFC3339', datetoRFC3339)
	config.addFilter('encodeXML', encodeXML)

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
