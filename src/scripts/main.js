import FontFaceObserver from 'fontfaceobserver'
import { $, $$, currentPage, prefersReducedMotion } from './helper'
import addEmojiTitle from './add-emoji-title'
import animateScrollTo from './animate-scroll-to'
import setCurrentYear from './set-current-year'
import addGitHubStats from './add-github-stats'
import loadInstagram from './instagram'

const config = {
	pageTitles: {
		about: '🙋',
		blog: '📰',
		projects: '📦',
		imprint: '📄',
		404: '🔮',
	},
}

/* 1. Load webfonts */
Promise.all([
	new FontFaceObserver('Roboto').load(),
	new FontFaceObserver('Roboto Mono').load(),
]).then(() => document.body.classList.add('fonts-loaded'))

/* 2. Modify page titles */
addEmojiTitle(config.pageTitles)

/* 3. Update footer year */
setCurrentYear($('.footer-year'))

/* 4. Only use animated scrolling if the user has it enabled */
if (prefersReducedMotion() === false) {
	for (const $el of $$('[data-scrollto]')) {
		animateScrollTo($el, 'scrollto')
	}
}

/** 5. Run page-specific code */
switch (currentPage()) {
	case 'projects':
		addGitHubStats()
		break

	case 'about':
		loadInstagram()
		break

	default:
		break
}
