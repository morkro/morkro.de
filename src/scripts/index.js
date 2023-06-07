// import FontFaceObserver from './fontfaceobserver.js'
import { $, $$, currentPage, prefersReducedMotion } from './helper.js'
import setPreferredTheme from './set-theme.js'
import addEmojiTitle from './add-emoji-title.js'
import animateScrollTo from './animate-scroll-to.js'
import setCurrentYear from './set-current-year.js'
import addGitHubStats from './add-github-stats.js'

/* 1. Set preferred theme */
setPreferredTheme()

console.log('executed')

/* 2. Load webfonts */
// Promise.all([
// 	new FontFaceObserver('Roboto').load(),
// 	new FontFaceObserver('Roboto Mono').load(),
// ]).then(() => document.body.classList.add('fonts-loaded'))

/* 3. Modify page titles */
addEmojiTitle()

/* 4. Update footer year */
setCurrentYear()

/* 5. Add animated scrolling effects */
if (prefersReducedMotion() === false) {
	// Only use animated scrolling if the user has it enabled
	for (const $el of $$('[data-scrollto]')) {
		animateScrollTo($el)
	}
}

/* 6. Run page-specific code */
const page = currentPage()
if (page === 'introduction') {
	addGitHubStats()
}
