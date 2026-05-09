import { watch } from "node:fs"
import { resolve } from "node:path"
import config from "#core/config.core.ts"
import { logger } from "#utils/log.ts"

const log = logger('Server')
let isRunning = false
let shouldRunAgain = false

/**
 * Queue rebuilds after source file changes
 */
async function schedule (onRebuild: () => Promise<void>) {
  if (isRunning) {
    shouldRunAgain = true
    return
  }
  isRunning = true
  
  try {
    do {
      shouldRunAgain = false
      await onRebuild()
    } while (shouldRunAgain)
  } catch (error) {
    log.error('Rebuild after src change failed', { error })
  } finally {
    isRunning = false
  }
}

function debounce (callback: () => void, delayMs: number): () => void {
	let timeoutId: ReturnType<typeof setTimeout> | undefined
	return () => {
		if (timeoutId !== undefined) clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			timeoutId = undefined
			callback()
		}, delayMs)
	}
}

export function startWatcher (onRebuild: () => Promise<void>) {
  const inputRoot = resolve(config.directories.input)
  const tick = debounce(() => {
    void schedule(onRebuild)
  }, 150)
    
  try {
    const watcher = watch(inputRoot, { recursive: true }, async (_, filename) => {
      if (filename === null) return
      tick()
    })
    return { stop: () => { watcher.close() } }
  } catch (error) {
    log.error('Could not watch input root', { error, inputRoot })
    return undefined
  }
}