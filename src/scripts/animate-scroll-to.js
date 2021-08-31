import { requestAnimFrame, easeInOutQuint, windowPosition } from './helper'

const animationSpeed = 333
const animationOffset = -10
const animationIncrement = 20

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
export default function animateScrollTo($el, callback = () => {}) {
	$el.addEventListener('click', (event) => {
		event.preventDefault()
		event.target.blur()

		let currentTime = 0
		const start = windowPosition()
		const change = document.body.getBoundingClientRect().top + animationOffset
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
