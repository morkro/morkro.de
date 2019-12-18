import 'whatwg-fetch'
import { $, $el, isMobileDevice } from './helper'

const instagramAPI = 'https://api.instagram.com/v1/users/self/media/recent/?access_token=38879863.d1ca157.372823cf31b5429bbd6863d84db75635'

function createLink (post) {
	const $link = $el('a')
	$link.setAttribute('href', post.link)
	$link.setAttribute('target', '_blank')
	$link.setAttribute('rel', 'noopener')
	return $link
}

function createImage (post) {
	const $img = $el('img')
	$img.setAttribute('alt', post.caption.text)
	if (isMobileDevice()) {
		$img.setAttribute('src', post.images.low_resolution.url)
	} else {
		$img.setAttribute('src', post.images.standard_resolution.url)
	}
	return $img
}

function createList (json) {
	const $list = $('.instagram-list')
	const $children = Array.from($list.children)

	for (const [index, post] of json.data.entries()) {
		console.log(post)
		const $link = createLink(post)
		const $img = createImage(post)
		const $child = $children[index]

		$link.appendChild($img)
		$child.appendChild($link)
	}

	$list.classList.remove('is-loading')
}

export default function loadInstagram () {
	fetch(instagramAPI)
		.then(response => response.json())
		.then(createList)
}
