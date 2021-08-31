import FontFaceObserver from 'fontfaceobserver'
import { $, $$, currentPage } from './helper'
import addEmojiTitle from './add-emoji-title'
import animateScrollTo from './animate-scroll-to'
import setNavigationState from './set-navigation-state'
import setCurrentYear from './set-current-year'
import addGitHubStats from './add-github-stats'
import loadInstagram from './instagram'

/**
 * =========================================================================== *
 *                                CONFIGURATION
 * =========================================================================== *
 */
const config = {
	user: {
		prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
			.matches,
	},
	titles: {
		about: '🙋',
		blog: '📰',
		projects: '📦',
		imprint: '📄',
		404: '🔮',
	},
	navigation: {
		parent: $('#page-header'),
		className: 'active',
		url: ['/', '/is', '/writes', '/builds'],
	},
}
const fontRoboto = new FontFaceObserver('Roboto')
const fontRobotoMono = new FontFaceObserver('Roboto Mono')

/**
 * =========================================================================== *
 *                                  LET'S GO
 * =========================================================================== *
 */
// GENERAL
Promise.all([fontRoboto.load(), fontRobotoMono.load()]).then(() =>
	document.body.classList.add('fonts-loaded')
)
addEmojiTitle(config.titles)
setNavigationState(config.navigation)
setCurrentYear($('.footer-year'))

// A11Y
if (config.user.prefersReducedMotion === false) {
	for (const $el of $$('[data-scrollto]')) {
		animateScrollTo($el)
	}
}

// PAGE SPECIFIC
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
