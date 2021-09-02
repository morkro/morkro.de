const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

/**
 * @param {string} tag
 * @returns {HTMLElement}
 */
const $el = (tag) => document.createElement(tag)

/**
 * @returns {boolean}
 */
const isMacOS = () => navigator.userAgent.indexOf('Mac OS X') != -1

/**
 * @returns {boolean}
 */
const isMobileDevice = () =>
	window.matchMedia('only screen and (max-width: 760px)').matches

/**
 * @returns {boolean}
 */
const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @description Checks if a page is currently being visited.
 * @param {string} name
 * @returns {boolean|string}
 */
const currentPage = (name) => {
	if (!name) {
		const tmpl = /^template-/
		const classes = [...document.body.classList]
		return classes.find((name) => tmpl.test(name)).replace(tmpl, '')
	}
	return document.body.classList.contains(`template-${name}`)
}

const requestAnimFrame = () =>
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function (callback) {
		window.setTimeout(callback, 1000 / 60)
	}

/**
 * @param {number} time
 * @param {number} start
 * @param {number} change
 * @param {number} duration
 * @returns {number}
 */
const easeInOutQuint = function (time, start, change, duration) {
	if ((time /= duration / 2) < 1) {
		return (change / 2) * time * time * time * time * time + start
	}
	return (change / 2) * ((time -= 2) * time * time * time * time + 2) + start
}

export {
	$el,
	$,
	$$,
	isMacOS,
	isMobileDevice,
	prefersReducedMotion,
	currentPage,
	requestAnimFrame,
	easeInOutQuint,
}
