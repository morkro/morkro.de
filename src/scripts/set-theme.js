const scheme = ([mode]) => `(prefers-color-scheme: ${mode})`
const darkScheme = window.matchMedia(scheme`dark`)
const isDarkScheme = darkScheme.matches
const lightScheme = window.matchMedia(scheme`light`)
const isLightScheme = lightScheme.matches
const namespace = 'morkro:theme'
const isUserPreferredScheme = localStorage.getItem(namespace)
const $toggleThemeBtn = document.querySelector('.js-theme-toggle')

/**
 * @description Sets the theme on html[data-theme] and saves it to localStorage
 * @param {string} theme
 */
function setTheme(theme) {
	document.documentElement.dataset.theme = theme
	localStorage.setItem(namespace, theme)
}

if (isUserPreferredScheme) {
	setTheme(isUserPreferredScheme)
} else if (isDarkScheme) {
	setTheme('dark')
} else if (isLightScheme) {
	setTheme('light')
}

darkScheme.addEventListener(
	'change',
	({ matches }) => matches && setTheme('dark'),
)
lightScheme.addEventListener(
	'change',
	({ matches }) => matches && setTheme('light'),
)

$toggleThemeBtn.addEventListener('click', () => {
	const currentTheme = document.documentElement.dataset.theme
	setTheme(currentTheme === 'light' ? 'dark' : 'light')
})
