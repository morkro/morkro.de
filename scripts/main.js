'use strict';

import { $, getOffset } from './helper';
import setCurrentYear from './set-current-year';
import AnchoredHeadline from './anchored-headlines';

/**
 * App init
 */
const isArticlePage = !!$('.content-article');
const footerYear = $('.footer-year');
const anchoredHeadlines = new AnchoredHeadline('.article-body');

setCurrentYear( footerYear );
if (isArticlePage) { anchoredHeadlines.init(); }