import { isMacOS, currentPage } from './helper';

export default function addEmojiTitle (config = {}) {
	const title = document.title.split('|');

	Object.keys(config).forEach(page => {
		if (isMacOS() && currentPage(page)) {
			document.title = `${title[0]}${config[page]} | ${title[1]}`;
		}
	});
}