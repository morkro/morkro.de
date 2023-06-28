import { currentPage } from './helper.js'
import setPreferredTheme from './set-theme.js'
import addEmojiTitle from './add-emoji-title.js'
import animateScrollTo from './animate-scroll-to.js'
import setCurrentYear from './set-current-year.js'
import addGitHubStats from './add-github-stats.js'
import interactiveMap from './world-map.js'

/* 1. Set preferred theme */
setPreferredTheme()
/* 2. Modify page titles */
addEmojiTitle()
/* 3. Update footer year */
setCurrentYear()
/* 4. Add animated scrolling effects */
const prefersReducedMotion = window.matchMedia(
	'(prefers-reduced-motion: reduce)'
).matches
if (prefersReducedMotion === false) {
	// Only use animated scrolling if the user has it enabled
	for (const $el of document.querySelectorAll('[data-scrollto]')) {
		animateScrollTo($el)
	}
}
/* 5. Run page-specific code */
const page = currentPage()
if (page === 'introduction') {
	addGitHubStats()
} else if (page === 'about') {
	interactiveMap()
}
