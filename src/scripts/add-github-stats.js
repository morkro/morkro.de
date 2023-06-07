import { $$ } from './helper.js'

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
 * @property {number} RepositoryData.stars
 */

const projects = Array.from($$('[data-project]'))

/**
 * @param {GitHubRepositoryAPI[]} repositories
 * @returns {RepositoryData[]}
 */
function prepare(repositories) {
	return repositories.map(({ name, stargazers_count }) => ({
		name: name.toLowerCase(),
		stars: stargazers_count,
	}))
}

/**
 * @param {RepositoryData[]} repositories
 * @returns {RepositoryData[]}
 */
function filter(repositories) {
	const projectNames = projects.map((el) => el.dataset.project)
	return repositories.filter((repo) => projectNames.includes(repo.name))
}

/**
 * @param {RepositoryData[]} repositories
 */
function updateDOM(repositories) {
	for (const repo of repositories) {
		const $span = projects
			.find((el) => el.dataset.project === repo.name)
			.querySelector('h3 span')
		$span.insertBefore(document.createTextNode(repo.stars), $span.children[0])
		$span.style.display = 'inline-flex'
	}
}

export default function addGitHubStats() {
	fetch('https://api.github.com/users/morkro/repos?per_page=100')
		.then((data) => data.json())
		.then(filter)
		.then(prepare)
		.then(updateDOM)
		.catch(console.error)
}
