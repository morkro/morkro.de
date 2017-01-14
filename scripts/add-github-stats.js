import 'whatwg-fetch'
import { $ } from './helper'

const featured = ['atom-emoji-syntax', 'frontbook', 'papyrus']
const listed = ['tetrys', 'browdash', 'domtimer', 'chrome-gist-word-count']
const $projectsFeatured = $('.projects-featured')
const $projectsList = $('.projects-list')

function prepare (repositories) {
	return repositories.map(({ name, html_url, stargazers_count }) => (
		{
			name: name.toLowerCase(),
			url: html_url,
			stars: stargazers_count
		}
	))
}

function filter (repositories) {
	return {
		featured: repositories.filter(repo =>
			featured.indexOf(repo.name.toLowerCase()) >= 0
		),
		all: repositories.filter(repo =>
			listed.indexOf(repo.name.toLowerCase()) >= 0
		)
	}
}

function insertStarCount ($wrapper, repo) {
	const { name, stars } = repo
	const shortened = name.replace(/atom/, '').replace(/-/g, '')
	const $starsEl = $wrapper.querySelector(`.project-${shortened} .project-stars`)
	$starsEl.insertBefore(document.createTextNode(stars), $starsEl.childNodes[0])
	$starsEl.style.display = 'flex'
}

function updateDOM (repositories) {
	console.log(repositories)
	repositories.featured.forEach(repo => insertStarCount($projectsFeatured, repo))
	repositories.all.forEach(repo => insertStarCount($projectsList, repo))
}

export default function addGitHubStats () {
	fetch('https://api.github.com/users/morkro/repos')
		.then(data => data.json())
		.then(prepare)
		.then(filter)
		.then(updateDOM)
		.catch(console.error)
}
