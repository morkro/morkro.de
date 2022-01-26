import { $, requestAnimFrame, easeInOutQuint } from './helper'

const animationSpeed = 333
const animationOffset = -10
const animationIncrement = 20

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
	const $destination = attr === '#' ? document.body : $(attr)

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
