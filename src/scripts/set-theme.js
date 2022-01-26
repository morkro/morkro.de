import { $ } from './helper'

const scheme = ([mode]) => `(prefers-color-scheme: ${mode})`
const darkScheme = window.matchMedia(scheme`dark`)
const lightScheme = window.matchMedia(scheme`light`)
const namespace = 'morkro:theme'

/**
 * @description Sets the theme on html[data-theme] and saves it to localStorage
 * @param {string} theme
 */
function setTheme(theme) {
	document.documentElement.dataset.theme = theme
	localStorage.setItem(namespace, theme)
}

export default function setPreferredTheme() {
	const isDarkScheme = darkScheme.matches
	const isLightScheme = lightScheme.matches
	const isUserPreferredScheme = localStorage.getItem(namespace)
	const $toggleThemeBtn = $('.js-theme-toggle')

	if (isUserPreferredScheme) {
		setTheme(isUserPreferredScheme)
	} else if (isDarkScheme) {
		setTheme('dark')
	} else if (isLightScheme) {
		setTheme('light')
	}

	darkScheme.addEventListener(
		'change',
		({ matches }) => matches && setTheme('dark')
	)
	lightScheme.addEventListener(
		'change',
		({ matches }) => matches && setTheme('light')
	)

	$toggleThemeBtn.addEventListener('click', () => {
		const currentTheme = document.documentElement.dataset.theme
		setTheme(currentTheme === 'light' ? 'dark' : 'light')
	})
}
