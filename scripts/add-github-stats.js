import 'whatwg-fetch'

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
	console.log(repositories)
}

export default function addGitHubStats () {
	fetch('https://api.github.com/users/morkro/repos')
		.then(data => data.json())
		.then(filter)
		.then(prepare)
		.then(updateDOM)
		.catch(console.error)
}
