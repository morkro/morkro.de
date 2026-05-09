import { watch } from 'node:fs'
import { resolve } from 'node:path'
import config from '#config'
import { logger } from '#utils/log.ts'

const log = logger('Server')

export function createWatcher () {
  let isRunning = false
  let shouldRunAgain = false

  return {
    /** Queue rebuilds after source file changes */
    async schedule (onRebuild: () => Promise<void>) {
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
  const watcher = createWatcher()
  const tick = debounce(() => {
    void watcher.schedule(onRebuild)
  }, 150)
    
  try {
    const fsWatcher = watch(inputRoot, { recursive: true }, async (_, filename) => {
      if (filename === null) return
      tick()
    })
    return { stop: () => { fsWatcher.close() } }
  } catch (error) {
    log.error('Could not watch input root', { error, inputRoot })
    return { stop: () => void 0 }
  }
}