import { $, $$, currentPage } from './helper';
import addEmojiTitle from './add-emoji-title';
import setNavigationState from './set-navigation-state';
import setCurrentYear from './set-current-year';
import highlightSVGMap from './highlight-svg-map';
import Scrollex from './scrollex';

/**
 * =========================================================================== *
 *                                CONFIGURATION
 * =========================================================================== *
 */
const titleConfig = {
	about: '🙋',
	blog: '📰',
	projects: '📦',
	imprint: '📄',
	404: '🔮'
};
const navigationConfig = {
	parent: $('#page-header'),
	className: 'active',
	url: ['/', '/is', '/writes', '/builds']
};
const scrollexConfig = {
	elements: $$('[data-scrollto]'),
	speed: 333,
	offset: -10
};
const scrollex = new Scrollex(scrollexConfig);

/**
 * =========================================================================== *
 *                                  LET'S GO
 * =========================================================================== *
 */
// GENERAL
addEmojiTitle(titleConfig);
setNavigationState(navigationConfig);
setCurrentYear( $('.footer-year') );
scrollex.init();

// PAGE SPECIFIC
if (currentPage('about')) {
	const mapConfig = {
		map: $('#map'),
		trigger: $('.travels-nextcity'),
		attr: 'data-area',
		hover: '#ff7c00',
		defaultState: '#3652cf'
	};

	highlightSVGMap(mapConfig);
}