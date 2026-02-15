import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { DIRECTORIES } from '#config'
import { loadFile } from '#utils/fs.ts'
import { parseLiquid } from '#parser/liquid/parser.ts'
import { removeFrontmatter } from '#parser/frontmatter/parser.ts'

/** TEMP */
async function cleanup () {
  try {
    await rm(resolve(DIRECTORIES.TEMP), { recursive: true })
  } catch {}

  try {
    await mkdir(resolve(DIRECTORIES.TEMP), { recursive: true })
  } catch (error){
    throw new Error('Failed to cleanup temporary directory', { cause: error })
  }
}

if (process.argv.includes('--parse=liquid')) {
  await cleanup()
  const file = await loadFile(`../test/fixtures/liquid`, 'dev.html')

  console.time('Parsing Liquid')
  const liquid = parseLiquid(removeFrontmatter(file))
  console.timeEnd('Parsing Liquid')

  await writeFile(join(DIRECTORIES.TEMP, 'index.json'), JSON.stringify(liquid, null, 2), 'utf-8')
}