/**
 * @typedef {Object} NavigationState
 * @param {HTMLElement} NavigationState.parent
 * @param {string} NavigationState.className
 * @param {string[]} NavigationState.url
 */

/**
 * @description Adds a CSS class to the active navigation element.
 * @param {NavigationState} config
 */
export default function setNavigationState(config = {}) {
	const location = window.location.pathname
		.split('/')[1]
		.replace(/index\.html/g, '')
	const className = config.className || 'active'
	let isAvailableUrl = false

	for (let i = 0; i < config.url.length; i++) {
		if (config.url[i] === `/${location}`) {
			isAvailableUrl = true
		}
	}

	if (isAvailableUrl) {
		const navElem = config.parent.querySelector(`a[href="/${location}"]`)
		if (navElem) navElem.classList.add(className)
	}
}
