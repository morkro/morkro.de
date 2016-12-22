const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const getOffset = elem => {
	let offsetTop = 0
	do {
		if ( !isNaN( elem.offsetTop ) ) {
			offsetTop += elem.offsetTop
		}
	} while (elem = elem.offsetParent)
	return offsetTop
}

const isMacOS = () =>
	navigator.userAgent.indexOf('Mac OS X') != -1

const currentPage = (name) => {
	if (!name) {
		const tmpl = /^template-/
		return Array.from(document.body.classList)
			.find(name => tmpl.test(name)).replace(tmpl, '')
	}
	return document.body.classList.contains(`template-${name}`)
}

const requestAnimFrame = () =>
	window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function (callback) { window.setTimeout(callback, 1000 / 60) }

const windowPosition = () =>
	document.documentElement.scrollTop ||
		document.body.parentNode.scrollTop ||
		document.body.scrollTop

const easeInOutQuint = function (time, start, change, duration) {
	if ((time /= duration / 2) < 1) {
		return change / 2 * time * time * time * time * time + start
	}
	return change / 2 * ((time -= 2) * time * time * time * time + 2) + start
}

export {
	$,
	$$,
	getOffset,
	isMacOS,
	currentPage,
	requestAnimFrame,
	easeInOutQuint,
	windowPosition
}
