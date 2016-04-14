export default function highlightSVGMap (config = {}) {
	const trigger = config.trigger;
	const hover = config.hover;
	const defaultState = config.defaultState;
	const country = config.map.querySelector(`${trigger.getAttribute(config.attr)}`);

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