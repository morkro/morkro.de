import { currentPage } from './helper.js'

const config = {
	about: '🙋',
	blog: '📰',
	projects: '📦',
	imprint: '📄',
	404: '🔮',
}
const isMacOS = () => navigator.userAgent.indexOf('Mac OS X') != -1
const title = document.title.split('|')

Object.keys(config)
	.filter((page) => isMacOS() && currentPage(page))
	.forEach((page) => {
		document.title = `${title[0]}${config[page]} | ${title[1]}`
	})
