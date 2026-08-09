import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'

const hooksPath = '.githooks'
const preCommitPath = `${hooksPath}/pre-commit`

/** Install guard: .git not found */
if (!existsSync('.git')) {
  console.log('Skipping git hook install: .git not found')
  process.exit(0)
}

const result = spawnSync(
  'git',
  ['config', 'core.hooksPath', hooksPath],
  { stdio: 'inherit' }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

/** Make pre-commit hook executable */
if (existsSync(preCommitPath)) {
  chmodSync(preCommitPath, 0o755) // 0o755 means executable by the user and group
}