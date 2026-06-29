import { startServer } from '#server/index.ts'
import { startWatcher } from "#server/watcher.ts"
import { broadcastReload, closeAllClients } from '#transforms/livereload.ts'

export async function serve (onBuild: () => Promise<void>) {
  let shutdown = false
  const server = startServer()
  broadcastReload()

  const watcher = startWatcher(async () => {
    await onBuild()
    broadcastReload()
  })

  const handler = async () => {
    if (shutdown) return
    shutdown = true
    closeAllClients()
    await server.stop()
    watcher.stop()
    process.exit(0)
  }

  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)
}