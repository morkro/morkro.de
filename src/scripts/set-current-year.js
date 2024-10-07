const node = document.querySelector('.footer-year')
node.replaceChild(
	document.createTextNode(new Date().getFullYear()), // new node
	node.childNodes[0], // old node
)
