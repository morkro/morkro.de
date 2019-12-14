import 'whatwg-fetch'
import { $ } from './helper'

export default function loadInstagram () {
	const $list = $('.instagram-list')

	fetch('https://api.instagram.com/v1/users/self/media/recent/?access_token=38879863.d1ca157.372823cf31b5429bbd6863d84db75635')
		.then(response => response.json())
		.then(json => {
			for (const post of json.data) {
				const $el = document.createElement('li')
				const $img = document.createElement('img')

				$img.setAttribute('alt', post.caption.text)
				$img.setAttribute('src', post.images.standard_resolution.url)
				$el.appendChild($img)
				$list.appendChild($el)
			}
		})
}
