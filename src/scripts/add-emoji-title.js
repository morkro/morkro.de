import { currentPage } from './helper.js'

const config = {
	about: '🙋🏻‍♀️',
	blog: '🗞️',
	resume: '📑',
	404: '💥',
}
const isMacOS = () => navigator.userAgent.indexOf('Mac OS X') !== -1
const title = document.title.split('|')

for (const page of Object.keys(config).filter(
	(page) => isMacOS() && currentPage(page),
)) {
	document.title = `${title[0]}${config[page]} | ${title[1]}`
}
