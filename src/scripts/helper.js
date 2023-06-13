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

export { currentPage }
