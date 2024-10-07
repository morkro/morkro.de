const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const bundlerPlugin = require('@11ty/eleventy-plugin-bundle')
const htmlmin = require('html-minifier')
const postcss = require('postcss')

function minifyHtml(content, outputPath) {
	if (outputPath.endsWith('.html')) {
		return htmlmin.minify(content, {
			removeComments: true,
			collapseWhitespace: true,
		})
	}
	return content
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

module.exports = (config) => {
	const isProduction = process.env.NODE_ENV === 'production'
	if (isProduction) {
		config.addTransform('htmlmin', minifyHtml)
	}

	config.setLiquidOptions({
		dynamicPartials: false,
	})

	/** Add PostCSS */
	config.addTemplateFormats('css')
	config.addExtension('css', {
		outputFileExtension: 'css',
		compile: async (content, path) => {
			return async () => {
				const output = await postcss([
					require('postcss-import'),
					require('postcss-custom-media'),
					require('postcss-color-functional-notation'),
					require('postcss-selector-not'),
					require('autoprefixer'),
					require('cssnano'),
				]).process(content, { from: path })
				return output.css
			}
		},
	})

	/** Plugins */
	config.addPlugin(syntaxHighlight, {
		preAttributes: {
			tabindex: 0,
			'data-language': ({ language, content, options }) => language,
		},
	})
	config.addPlugin(bundlerPlugin)

	/** Watch these files for changes */
	config.addWatchTarget('src/css/**/*.css')
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
	config.addCollection('posts', (collection) =>
		collection
			.getFilteredByGlob('src/_posts/*.md')
			.sort((a, b) => b.date - a.date),
	)

	return {
		dir: {
			input: 'src',
			includes: '_includes',
			layouts: '_layouts',
		},
	}
}
