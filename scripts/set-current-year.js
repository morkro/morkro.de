'use strict';

export default function setCurrentYear (el) {
	const date = new Date();
	const text = document.createTextNode(date.getFullYear());
	return el.appendChild(text);
}