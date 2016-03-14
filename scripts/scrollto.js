import { requestAnimFrame, easeInOutQuint } from './helper';

const moveToSection = event => {

};

export default function scrollTo (config = {}) {

   
   for (let i = 0; i < config.elements.length; i++) {
      config.elements[i].addEventListener('click', moveToSection);
   }
}