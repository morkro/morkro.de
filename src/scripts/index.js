import FontFaceObserver from 'fontfaceobserver'
import { $, $$, currentPage, prefersReducedMotion } from './helper'
import setPreferredTheme from './set-theme'
import addEmojiTitle from './add-emoji-title'
import animateScrollTo from './animate-scroll-to'
import setCurrentYear from './set-current-year'
import addGitHubStats from './add-github-stats'

/* 1. Set preferred theme */
setPreferredTheme()

/* 2. Load webfonts */
Promise.all([
	new FontFaceObserver('Roboto').load(),
	new FontFaceObserver('Roboto Mono').load(),
]).then(() => document.body.classList.add('fonts-loaded'))

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
