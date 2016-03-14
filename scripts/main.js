'use strict';

import { $, $$ } from './helper';
import setNavigationState from './set-navigation-state';
import scrollTo from './scroll-to';
import setCurrentYear from './set-current-year';

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