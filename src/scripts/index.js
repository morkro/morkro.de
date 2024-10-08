import './console.js'
import './add-emoji-title.js'

/**
 *
 * @param {string} selector - The query selector to check if the widget is part of the DOM
 * @param {string} widgetName
 * @param {string} widgetFile - File name of the widget to load
 * @returns {Promise<void>}
 */
async function loadWidget(selector, widgetName, widgetFile) {
	if (!selector && !widgetFile) {
		console.error('No selector or widget file provided')
		return
	}

	const domList = [...document.querySelectorAll(selector)]
	const isConnected = (el) => el?.isConnected

	if (domList.some(isConnected)) {
		console.group(
			`📦 %c${widgetName}%c widget found, initialising`,
			'background:#ebebeb;padding:2px 4px;',
			'background:unset;',
		)
		try {
			await import(`./${widgetFile}`)
			console.info(`✅ Loaded ./${widgetFile}`)
		} catch (error) {
			console.error(`Failed loading ./${widgetFile} with message:`, error)
		} finally {
			console.groupEnd()
		}
	}
}

const widgets = [
	/* Set preferred theme */
	['.js-theme-toggle', 'Theme', 'set-theme.js'],
	/* Update footer year */
	['.footer-year', 'Current year', 'set-current-year.js'],
	/* Interactive world map */
	['#map', 'World map', 'world-map.js'],
]

for (const widget of widgets) {
	await loadWidget(...widget)
}
