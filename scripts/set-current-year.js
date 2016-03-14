'use strict';

export default function setCurrentYear (el) {
	const text = document.createTextNode(new Date().getFullYear());
	return el.appendChild(text);
}