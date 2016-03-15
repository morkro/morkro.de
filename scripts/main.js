'use strict';

import { $, $$ } from './helper';
import setNavigationState from './set-navigation-state';
import scrollTo from './scrollto';
import setCurrentYear from './set-current-year';
import highlightSVGMap from './highlight-svg-map';

// GENERAL
setNavigationState({
   parent: $('#page-header'),
   className: 'active',
   url: ['/', '/is', '/writes', '/builds']
});

scrollTo({
   elements: $$('[data-scrollto]') ,
   speed: 333,
   offset: 10
});

setCurrentYear( $('.footer-year') );

// PAGE SPECIFIC
highlightSVGMap({
   map: $('#map'),
   trigger: $('.travels-nextcity'),
   attr: 'data-area',
   hover: '#ff7c00',
   defaultState: '#3652cf'
});