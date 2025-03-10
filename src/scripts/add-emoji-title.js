import { currentPage } from './helper.js'

const config = {
	about: '🙋🏻‍♀️',
	blog: '🗞️',
	resume: '📑',
	404: '💥',
}

const isMacOS = () => window.navigator.userAgent.toLowerCase().includes('mac')
const [baseTitle, suffix] = document.title.split('|')
const currentPageKey = Object.keys(config).find(page => currentPage(page))

if (isMacOS() && currentPageKey) {
	document.title = `${baseTitle}${config[currentPageKey]} | ${suffix}`
}
