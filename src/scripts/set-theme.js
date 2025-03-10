const THEME_STORAGE_KEY = 'morkro:theme'
const THEMES = {
	DARK: 'dark',
	LIGHT: 'light'
}

const mediaQuery = (mode) => window.matchMedia(`(prefers-color-scheme: ${mode})`)
const darkScheme = mediaQuery(THEMES.DARK)
const lightScheme = mediaQuery(THEMES.LIGHT)
const $toggleThemeBtn = document.querySelector('.js-theme-toggle')

/**
 * @description Sets the theme on html[data-theme] and saves it to localStorage
 * @param {string} theme
 */
function setTheme(theme) {
	document.documentElement.dataset.theme = theme
	localStorage.setItem(THEME_STORAGE_KEY, theme)
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
if (savedTheme) {
	setTheme(savedTheme)
} else if (darkScheme.matches) {
	setTheme(THEMES.DARK)
} else if (lightScheme.matches) {
	setTheme(THEMES.LIGHT)
}

darkScheme.addEventListener('change', ({ matches }) => matches && setTheme(THEMES.DARK))
lightScheme.addEventListener('change', ({ matches }) => matches && setTheme(THEMES.LIGHT))

$toggleThemeBtn.addEventListener('click', () => {
	const currentTheme = document.documentElement.dataset.theme
	setTheme(currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT)
})
