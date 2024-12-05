#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'

const packageJsonPath = './package.json'

async function getCurrentVersion() {
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
	return packageJson.version
}

async function updateVersion(newVersion) {
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
	packageJson.version = newVersion
	await fs.writeFile(
		packageJsonPath,
		JSON.stringify(packageJson, null, 2),
		'utf8',
	)
}

function getTotalCommitsForYear() {
	const currentYear = new Date().getFullYear()
	const gitCommand = `git rev-list --count --since="${currentYear}-01-01" HEAD`
	try {
		return Number.parseInt(execSync(gitCommand).toString().trim(), 10) || 0
	} catch (err) {
		console.error('Error calculating commits:', err.message)
		process.exit(1)
	}
}

async function promptVersionType() {
	console.log('Select the version type:')
	console.log('1) M1 (Major)')
	console.log('2) M2 (Minor)')
	console.log('3) P0 (Patch)')

	const input = await new Promise((resolve) => {
		process.stdin.setEncoding('utf8')
		process.stdin.once('data', (data) => resolve(data.trim()))
	})

	switch (input) {
		case '1':
			return 'M1'
		case '2':
			return 'M2'
		case '3':
			return 'P0'
		default:
			console.error('Invalid choice. Aborting push.')
			process.exit(1)
	}
}

async function main() {
	try {
		const currentVersion = await getCurrentVersion()
		console.log(`Current version: ${currentVersion}`)

		const currentYear = new Date().getFullYear().toString().slice(-2)
		const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
		const totalCommits = getTotalCommitsForYear()

		const versionType = await promptVersionType()
		const newVersion = `${currentYear}.${currentMonth}.${totalCommits}.${versionType}`

		console.log(`New version: ${newVersion}`)
		await updateVersion(newVersion)

		execSync(`git add ${packageJsonPath}`)
		console.log('Version updated and staged for commit.')

		process.exit(0)
	} catch (err) {
		console.error('Error:', err.message)
		process.exit(1)
	}
}

main()
