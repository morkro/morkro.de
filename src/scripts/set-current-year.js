/**
 * @description Inserts the current year into an elements
 * @param {HTMLElement} $el
 */
export default ($el) =>
	$el.replaceChild(
		document.createTextNode(new Date().getFullYear()), // new node
		$el.childNodes[0] // old node
	)
