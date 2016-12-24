import 'whatwg-fetch'
import { $ } from './helper'

const $projectsList = $('.projects-banner')

function filter (repositories) {
	const chosen = ['atom-emoji-syntax', 'frontbook', 'papyrus']
	return repositories.filter(repo => chosen.indexOf(repo.name.toLowerCase()) >= 0)
}

function prepare (repositories) {
	return repositories.map(({ name, html_url, stargazers_count }) => (
		{
			name,
			url: html_url,
			stars: stargazers_count
		}
	))
}

function updateDOM (repositories) {
	repositories.forEach(repo => {
		const { name, stars } = repo
		const shortened = name.replace(/atom/, '').replace(/-/g, '').toLowerCase()
		const $starsEl = $projectsList.querySelector(`.project-${shortened} .project-stars`)
		$starsEl.insertBefore(document.createTextNode(stars), $starsEl.childNodes[0])
		$starsEl.style.display = 'flex'
	})
}

export default function addGitHubStats () {
	fetch('https://api.github.com/users/morkro/repos')
		.then(data => data.json())
		.then(filter)
		.then(prepare)
		.then(updateDOM)
		.catch(console.error)
}
