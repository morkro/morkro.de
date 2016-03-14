'use strict';

import { $, $$ } from './helper';
import setNavigationState from './set-navigation-state';
import scrollTo from './scrollto';
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

const nextCity = $('.travels-nextcity');

function highlightCountry (event) {
   const color = '#ff7c00';
   const country = $(`#map ${nextCity.getAttribute('data-area')}`);
   console.log(event);
   if (event.type === 'mouseover') {
      country.style.fill = color;
      country.style.stroke = 'white';
   }
   else {
      country.style.fill = 'white';
      country.style.stroke = '';
   }
}

nextCity.addEventListener('mouseover', highlightCountry, false);
nextCity.addEventListener('mouseleave', highlightCountry, false);