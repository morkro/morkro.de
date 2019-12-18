import FontFaceObserver from 'fontfaceobserver'
import { $, $$, currentPage } from './helper'
import addEmojiTitle from './add-emoji-title'
import setNavigationState from './set-navigation-state'
import setCurrentYear from './set-current-year'
import addGitHubStats from './add-github-stats'
import loadInstagram from './instagram'
import Scrollex from './scrollex'

/**
 * =========================================================================== *
 *                                CONFIGURATION
 * =========================================================================== *
 */
const fontRoboto = new FontFaceObserver('Roboto')
const fontRobotoMono = new FontFaceObserver('Roboto Mono')
const scrollex = new Scrollex({
	elements: $$('[data-scrollto]'),
	speed: 333,
	offset: -10
})
const titleConfig = {
	about: '🙋',
	blog: '📰',
	projects: '📦',
	imprint: '📄',
	404: '🔮'
}
const navigationConfig = {
	parent: $('#page-header'),
	className: 'active',
	url: ['/', '/is', '/writes', '/builds']
}

/**
 * =========================================================================== *
 *                                  LET'S GO
 * =========================================================================== *
 */
// GENERAL
Promise.all([fontRoboto.load(), fontRobotoMono.load()])
	.then(() => document.body.classList.add('fonts-loaded'))
addEmojiTitle(titleConfig)
setNavigationState(navigationConfig)
setCurrentYear( $('.footer-year') )
scrollex.init()

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
