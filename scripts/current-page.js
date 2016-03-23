export default function currentPage (name) {
   return document.body.classList.contains(`template-${name}`);
}