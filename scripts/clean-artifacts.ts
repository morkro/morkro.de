import { rm } from 'node:fs/promises'

for (const dir of ['.build', '.tmp', '_site']) {
  await rm(dir, { recursive: true, force: true })
}