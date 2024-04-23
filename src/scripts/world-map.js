/**
 * @typedef {Object} Timestamp
 * @property {number} year
 * @property {string[]} countries
 */

/**
 * @typedef {Object} SortedTimestamps
 * @property {string[]} visited
 * @property {string[]} clean
 */

/**
 * @param {string} selector - a CSS selector
 * @returns {Timestamp[]}
 */
function getTimestamps(selector) {
	return (
		[...document.querySelectorAll(selector)]
			// e.g., [[2012, 'DE'], [2023, 'LU']]
			.map(($el) => [parseInt($el.dataset.visitedYear), $el.id])
			// e.g., [{ year: 2012, countries: ['DE'] }, { year: 2023, countries: ['LU', 'AL'] }]
			.reduce((acc, [year, country]) => {
				const index = acc.findIndex((structure) => structure.year === year)
				if (index !== -1) {
					const structure = acc[index]
					acc[index] = { year, countries: [...structure.countries, country] }
				} else {
					acc.push({ year, countries: [country] })
				}
				return acc
			}, [])
			// Sort by year ascending
			.sort((a, b) => a.year - b.year)
	)
}

/**
 * @param {Timestamp[]} timestamps - a list of timestamps
 * @param {number} year - the year to be sorted for
 * @returns {SortedTimestamps}
 */
function sortTimestamps(timestamps, year) {
	const markers = { visited: [], clean: [] }
	for (const country of timestamps) {
		if (country.year <= year) {
			markers.visited = [...markers.visited, ...country.countries]
		} else {
			markers.clean = [...markers.clean, ...country.countries]
		}
	}
	return markers
}

const timestamps = getTimestamps('#map [data-visited-year]')
const $output = document.querySelector('output[for="timeframe"]')
const getName = new Intl.DisplayNames(['en'], { type: 'region' })

document
	.querySelector('.travel-select-menu')
	.addEventListener('change', (event) => {
		if (event.target?.nodeName !== 'INPUT') return

		const year = event.target.value
		const { visited, clean } = sortTimestamps(timestamps, year)
		const countries = visited.map((code) => getName.of(code))

		$output.innerHTML = countries.length
			? `Countries visited as of ${year}: ${countries.join(', ')}`
			: `No countries were visited yet in ${year}.`

		for (const code of visited) {
			document.querySelector('#' + code).classList.add('visited')
		}
		for (const code of clean) {
			document.querySelector('#' + code).classList.remove('visited')
		}
	})
