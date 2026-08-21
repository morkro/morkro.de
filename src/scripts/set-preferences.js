// First paint is set in src/includes/meta-head.liquid.
// This module binds the toggles and follows OS changes when nothing is saved.

function bindPreference(preference) {
	const { dataKey, storageKey, systemQuery, whenMatches, whenMisses, toggleSelector } = preference
	const $root = document.documentElement
	const $toggle = document.querySelector(toggleSelector)
	const media = window.matchMedia(systemQuery)

	const apply = (value) => {
		$root.dataset[dataKey] = value
	}

	media.addEventListener('change', ({ matches }) => {
		if (localStorage.getItem(storageKey)) return
		apply(matches ? whenMatches : whenMisses)
	})

	if (!$toggle) return
	$toggle.hidden = false
	$toggle.addEventListener('click', () => {
		const nextValue = $root.dataset[dataKey] === whenMatches ? whenMisses : whenMatches
		apply(nextValue)
		localStorage.setItem(storageKey, nextValue)
	})
}

const PREFERENCES = [
	{
		dataKey: 'theme',
		storageKey: 'morkro:theme',
		systemQuery: '(prefers-color-scheme: dark)',
		whenMatches: 'dark',
		whenMisses: 'light',
		toggleSelector: '.js-toggle-btn.toggle-theme',
	},
	{
		dataKey: 'anim',
		storageKey: 'morkro:anim',
		systemQuery: '(prefers-reduced-motion: reduce)',
		whenMatches: 'off',
		whenMisses: 'on',
		toggleSelector: '.js-toggle-btn.toggle-anim',
	},
]

for (const preference of PREFERENCES) {
	bindPreference(preference)
}
