import { isMacOS, currentPage } from './helper'

/**
 * @typedef {{ [key: string]: string }} EmojiTitleConfig
 */

/**
 * @description Adds an emoji to the page title.
 * @param {EmojiTitleConfig} config
 */
export default function addEmojiTitle(config = {}) {
	const title = document.title.split('|')

	Object.keys(config)
		.filter((page) => isMacOS() && currentPage(page))
		.forEach((page) => {
			document.title = `${title[0]}${config[page]} | ${title[1]}`
		})
}
