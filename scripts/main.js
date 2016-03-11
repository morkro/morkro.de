'use strict';

import { $, getOffset } from './helper';
import setCurrentYear from './set-current-year';
import setNavigationState from './set-navigation-state';
import AnchoredHeadline from './anchored-headlines';

/**
 * App init
 */
const header = $('#page-header');
const isArticlePage = !!$('.content-article');
const footerYear = $('.footer-year');
const anchoredHeadlines = new AnchoredHeadline('.article-body');

setNavigationState({
   parent: header,
   className: 'active',
   url: ['/', '/is', '/writes', '/builds']
});
setCurrentYear( footerYear );

if (isArticlePage) { anchoredHeadlines.init(); }