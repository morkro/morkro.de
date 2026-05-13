import { resolve } from 'node:path'
import { build } from '#commands/build.ts'
import { serve } from '#commands/serve.ts'
import config from '#config'
import { getUserConfig } from '#config.user'
import { logger, perf } from '#utils/log.ts'

const log = logger('Build')

/**
 * Execute the build process
 */
const isMainModule = import.meta.filename === resolve(process.argv[1])
if (isMainModule) { 
  const buildStart = perf('Build duration')
  log.info(`Build settings NODE_ENV=${process.env.NODE_ENV}, DEBUG=${process.env.DEBUG}`)
  const userConfig = await getUserConfig()
  
  try {
    await build(config, userConfig)
  } catch (error) {
    log.error('Build failed', { error })
    process.exit(1)
  } finally {
    buildStart.end()
  }
  
  if (process.argv.includes('--serve')) {
    await serve(async () => {
      await build(config, userConfig)
    })
  }
}