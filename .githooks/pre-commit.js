#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import readline from 'node:readline'
import tty from 'node:tty'

const pkgPath = './package.json'

// Handle non-interactive environments by assigning /dev/tty to process.stdin
if (!process.stdin.isTTY) {
	const { O_RDONLY, O_NOCTTY } = fs.constants
	let fd
	try {
		fd = fs.openSync('/dev/tty', O_RDONLY | O_NOCTTY)
	} catch (error) {
		console.error('Please push your code in a terminal.')
		process.exit(1)
	}

	const stdin = new tty.ReadStream(fd)

	Object.defineProperty(process, 'stdin', {
		configurable: true,
		enumerable: true,
		get: () => stdin,
	})
}

function prompt(question) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		rl.question(question, (answer) => {
			rl.close()
			resolve(answer.trim())
		})
	})
}

async function getCurrentVersion() {
	const packageJson = JSON.parse(await readFile(pkgPath, 'utf8'))
	return packageJson.version
}

async function updateVersion(newVersion) {
	const packageJson = JSON.parse(await readFile(pkgPath, 'utf8'))
	packageJson.version = newVersion
	await writeFile(pkgPath, JSON.stringify(packageJson, null, 2), 'utf8')
}

function getTotalCommitsForYear() {
	const currentYear = new Date().getFullYear()
	const gitCommand = `git rev-list --count --since="${currentYear}-01-01" HEAD`
	return Number.parseInt(execSync(gitCommand).toString().trim(), 10) || 0
}

async function main() {
	try {
		const currentVersion = await getCurrentVersion()
		console.log(`Current version: ${currentVersion}`)

		const currentYear = new Date().getFullYear().toString().slice(-2)
		const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
		const totalCommits = getTotalCommitsForYear()

		console.log('Select the version type:')
		console.log('[1] M1 (Major)')
		console.log('[2] M2 (Minor)')
		console.log('[3] P0 (Patch)')

		const choice = await prompt('Enter your choice (1-3): ')

		let versionType
		switch (choice) {
			case '1':
				versionType = 'M1'
				break
			case '2':
				versionType = 'M2'
				break
			case '3':
				versionType = 'P0'
				break
			default:
				console.error('Invalid choice. Aborting commit.')
				process.exit(1)
		}

		const newVersion = `${currentYear}.${currentMonth}.${totalCommits}.${versionType}`
		console.log(`New version: ${newVersion}`)
		await updateVersion(newVersion)

		// Just stage the package.json - it will be included in the commit being created
		execSync(`git add ${pkgPath}`)
		console.log('Version updated and staged for commit.')
		
		process.stdin.destroy()
		process.exit(0)
	} catch (err) {
		console.error('Error:', err.message)
		process.stdin.destroy()
		process.exit(1)
	}
}

main()
