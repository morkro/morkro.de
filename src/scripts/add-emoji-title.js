import { isMacOS, currentPage } from './helper'

const config = {
	about: '🙋',
	blog: '📰',
	projects: '📦',
	imprint: '📄',
	404: '🔮',
}

/**
 * @description Adds an emoji to the page title.
 */
export default function addEmojiTitle() {
	const title = document.title.split('|')

	Object.keys(config)
		.filter((page) => isMacOS() && currentPage(page))
		.forEach((page) => {
			document.title = `${title[0]}${config[page]} | ${title[1]}`
		})
}
