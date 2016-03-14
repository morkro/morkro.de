const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const getOffset = elem => {
	let offsetTop = 0;
	do {
		if ( !isNaN( elem.offsetTop ) ) {
			offsetTop += elem.offsetTop;
		}
	} while (elem = elem.offsetParent);
	return offsetTop;
};

const requestAnimFrame = function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function (callback) { window.setTimeout(callback, 1000 / 60); };
};

const easeInOutQuint = function (time, start, change, duration) {
	if ((time /= duration / 2) < 1) {
		return change / 2 * time * time * time * time * time + start;
	}
	return change / 2 * ((time -= 2) * time * time * time * time + 2) + start;
};

export { $, $$, getOffset, requestAnimFrame, easeInOutQuint };