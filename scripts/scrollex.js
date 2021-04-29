import { $, requestAnimFrame, easeInOutQuint, windowPosition } from './helper'

/**
 * @name Scrollex
 * @description Scrolls to the element defined in '[data-scrollto]'.
 * @param {Object} options
 * @example
 * let scroll = new Scrollex({ elements: '.foo', speed: 550 })
 * scroll.init()
 */
export default class Scrollex {
	constructor(options = {}) {
		this.keyword = options.keyword || 'data-scrollto'
		this.speed = options.speed || 333
		this.elements = this.resolve(options.elements)
		this.increment = options.increment || 20
		this.offset = options.offset || 10
		this.callback =
			typeof options.callback === 'function' ? options.callback : function () {}
	}

	/**
	 * @description Iterates through all nodes and stores them.
	 * @param  {NodeList} nodes
	 * @return {Array}
	 */
	resolve(nodes) {
		const stored = []
		for (let i = 0; i < nodes.length; i++) {
			let keyword = nodes[i].getAttribute(this.keyword)
			if (keyword === '#') keyword = 'body'
			stored[i] = [nodes[i], $(keyword)]
		}
		return stored
	}

	/**
	 * @description Sets the scrollTop value to the host element
	 * @param  {Number} amount
	 */
	moveBody(amount) {
		document.documentElement.scrollTop = amount
		document.body.scrollTop = amount
	}

	/**
	 * @description Blocks default behavior and scrolls to position defined by "this.keyword"
	 * @param  {HTMLElement} item
	 * @param  {Object} event
	 */
	scrollTo(item, event) {
		event.preventDefault()
		event.target.blur()

		let currentTime = 0
		const start = windowPosition()
		const change = item.getBoundingClientRect().top + this.offset
		const animateScroll = () => {
			currentTime += this.increment
			const easing = easeInOutQuint(currentTime, start, change, this.speed)
			this.moveBody(easing)
			if (currentTime < this.speed) {
				requestAnimFrame()(animateScroll)
			} else if (this.callback) {
				this.callback()
			}
		}

		animateScroll()
	}

	/**
	 * @description Initialises the module by adding all event listener
	 */
	init() {
		for (let i = 0; i < this.elements.length; i++) {
			this.elements[i][0].addEventListener(
				'click',
				this.scrollTo.bind(this, this.elements[i][1]),
				false
			)
		}
	}
}
