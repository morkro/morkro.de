'use strict';

import { $, $$ } from './helper';
import setNavigationState from './set-navigation-state';
import currentPage from './current-page';
import setCurrentYear from './set-current-year';
import highlightSVGMap from './highlight-svg-map';
import Scrollex from './scrollex';
import AnchoredHeadline from './anchored-headlines';

// GENERAL
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
else if (currentPage('article')) {
   const anchor = new AnchoredHeadline($('.article-body'));
   anchor.init();
}