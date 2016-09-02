// Inserts the current year into an element
export default (el) => el.replaceChild(
	document.createTextNode(new Date().getFullYear()), // new node
	el.childNodes[0] // old node
)
