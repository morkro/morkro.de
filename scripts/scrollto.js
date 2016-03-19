import {
   requestAnimFrame,
   easeInOutQuint,
   windowPosition
} from './helper';

const moveToSection = function(event) {
   event.preventDefault();
	event.target.blur();

   const start = windowPosition();

};

export default function scrollTo (config = {}) {
   const elements = config.elements;
   const speed = config.speed || 250;

   for (let i = 0; i < elements.length; i++) {
      elements[i].addEventListener('click', moveToSection, false);
   }
}