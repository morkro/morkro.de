import 'whatwg-fetch'
import { $ } from './helper'

/**
 * @typedef {Object} GitHubRepositoryAPI
 * @property {string} GitHubRepositoryAPI.name
 * @property {string} GitHubRepositoryAPI.html_url
 * @property {number} GitHubRepositoryAPI.stargazers_count
 * @property {sring} GitHubRepositoryAPI.created_at
 */

/**
 * @typedef {Object} RepositoryData
 * @property {string} RepositoryData.name
 * @property {string} RepositoryData.url
 * @property {number} RepositoryData.stars
 * @property {sring} RepositoryData.created
 */

const featured = ['atom-emoji-syntax', 'happy-plants', 'papyrus']
const listed = [
	'vue-a11y-dialog',
	'euromat',
	'tetrys',
	'frontbook',
	'chrome-gist-word-count',
]

/**
 * @param {GitHubRepositoryAPI[]} repositories
 * @returns {RepositoryData[]}
 */
function prepare(repositories) {
	return repositories.map(
		({ name, html_url, stargazers_count, created_at }) => ({
			name: name.toLowerCase(),
			url: html_url,
			stars: stargazers_count,
			created: new Date(created_at).getFullYear(),
		})
	)
}

/**
 * @param {RepositoryData[]} repositories
 * @returns {{ featured: RepositoryData[], all: RepositoryData[] }}
 */
function filter(repositories) {
	return {
		featured: repositories.filter((repo) => featured.indexOf(repo.name) >= 0),
		all: repositories.filter((repo) => listed.indexOf(repo.name) >= 0),
	}
}

/**
 * @param {HTMLElement} $wrapper
 * @param {RepositoryData} repo
 * @returns {void}
 */
function insertStarCount($wrapper, repo) {
	const { name, stars } = repo
	const $starsEl = $wrapper.querySelector(`.project-${name} .project-stars`)
	if (!$starsEl) return

	$starsEl.insertBefore(document.createTextNode(stars), $starsEl.childNodes[0])
	$starsEl.style.display = 'flex'
}

/**
 * @param {{ featured: RepositoryData[], all: RepositoryData[] }} repositories
 */
function updateDOM(repositories) {
	const $featured = $('.projects-featured')
	const $list = $('.projects-list')

	for (const featured of repositories.featured) {
		insertStarCount($featured, featured)
	}

	for (const project of repositories.all) {
		insertStarCount($list, project)
	}
}

export default function addGitHubStats() {
	fetch('https://api.github.com/users/morkro/repos?per_page=100')
		.then((data) => data.json())
		.then(prepare)
		.then(filter)
		.then(updateDOM)
		.catch(console.error)
}
