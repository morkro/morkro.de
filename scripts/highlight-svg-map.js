export default function highlightSVGMap (config = {}) {
	const { trigger, hover, defaultState, attr, map } = config;

	if (!trigger.getAttribute(attr)) {
		return;
	}

	const country = map.querySelector(`${trigger.getAttribute(attr)}`);

	function toggleHighlight (event) {
		if (event.type === 'mouseover') {
			country.style.fill = hover;
			country.style.stroke = 'white';
		}
		else {
			country.style.fill = 'white';
			country.style.stroke = defaultState;
		}
	}

	trigger.addEventListener('mouseover', toggleHighlight, false);
	trigger.addEventListener('mouseleave', toggleHighlight, false);
}