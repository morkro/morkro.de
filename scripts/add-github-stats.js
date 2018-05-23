import 'whatwg-fetch'
import { $ } from './helper'

const featured = ['atom-emoji-syntax', 'happy-plants', 'papyrus']
const listed = ['tetrys', 'frontbook', 'domtimer', 'chrome-gist-word-count']

function prepare (repositories) {
	return repositories.map(({ name, html_url, stargazers_count, created_at }) => (
		{
			name: name.toLowerCase(),
			url: html_url,
			stars: stargazers_count,
			created: new Date(created_at).getFullYear()
		}
	))
}

function filter (repositories) {
	return {
		featured: repositories.filter(repo => featured.indexOf(repo.name) >= 0),
		all: repositories.filter(repo => listed.indexOf(repo.name) >= 0)
	}
}

function insertStarCount ($wrapper, repo) {
	const { name, stars } = repo
	const $starsEl = $wrapper.querySelector(`.project-${name} .project-stars`)
	if (!$starsEl) return

	$starsEl.insertBefore(document.createTextNode(stars), $starsEl.childNodes[0])
	$starsEl.style.display = 'flex'
}

function addCreatedDate ($wrapper, repo) {
	const { name, created } = repo
	const $headline = $wrapper.querySelector(`.project-${name} h3`)
	if (!$headline) return

	const $span = document.createElement('span')
	$span.textContent = created

	$headline.appendChild($span)
}

function updateDOM (repositories) {
	const $featured = $('.projects-featured')
	const $list = $('.projects-list')

	for (const featured of repositories.featured) {
		insertStarCount($featured, featured)
	}

	for (const project of repositories.all) {
		insertStarCount($list, project)
	}
}

export default function addGitHubStats () {
	fetch('https://api.github.com/users/morkro/repos?per_page=100')
		.then(data => data.json())
		.then(prepare)
		.then(filter)
		.then(updateDOM)
		.catch(console.error)
}
