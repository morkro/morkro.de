import { startServer } from '#server/index.ts'
import { startWatcher } from "#server/watcher.ts"
import { broadcastReload } from '#transforms/livereload.ts'

export async function serve (onBuild: () => Promise<void>) {
  const server = startServer()
  broadcastReload()
  const watcher = startWatcher(async () => {
    await onBuild()
    broadcastReload()
  })
  process.on('SIGINT', async () => {
    await server.stop()
    watcher.stop()
    process.exit(0)
  })
}