'use strict';

export default function setNavigationState (config = {}) {
	const location = window.location.pathname.split('/')[1];

	console.log(location);
}