import { rm } from 'node:fs/promises'

for (const dir of ['.build', '.tmp']) {
  await rm(dir, { recursive: true, force: true })
}