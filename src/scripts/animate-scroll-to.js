const animationSpeed = 333
const animationOffset = -10
const animationIncrement = 20

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

/**
 * @returns {number}
 */
const windowPosition = () =>
	document.documentElement.scrollTop ||
	document.body.parentNode.scrollTop ||
	document.body.scrollTop

/**
 * @param {Number} amount
 */
function moveDocument(amount) {
	document.documentElement.scrollTop = amount
	document.body.scrollTop = amount
}

/**
 * @param {HTMLElement} $el
 * @param {Function} callback
 */
export default function animateScrollTo(
	$el,
	dataset = 'scrollto',
	callback = () => {}
) {
	const attr = $el.dataset[dataset]
	const $destination =
		attr === '#' ? document.body : document.querySelector(attr)

	$el.addEventListener('click', (event) => {
		event.preventDefault()
		event.target.blur()

		let currentTime = 0
		const start = windowPosition()
		const change = $destination.getBoundingClientRect().top + animationOffset
		const animateScroll = () => {
			currentTime += animationIncrement
			const easing = easeInOutQuint(currentTime, start, change, animationSpeed)
			moveDocument(easing)
			if (currentTime < animationSpeed) {
				requestAnimFrame()(animateScroll)
			} else if (callback) {
				callback()
			}
		}

		animateScroll()
	})
}
