import { copyFile, lstat, mkdir, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

export async function copyRecursive (src: string, dest: string): Promise<boolean> {
  const stats = await lstat(src)
  if (stats.isSymbolicLink()) {
    log.debug(`Skipping symbolic link "${src}"`)
    return true
  }

  if (stats.isFile()) {
    try {
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(src, dest)
    } catch (error) {
      log.error(`Failed to copy file "${src}" to "${dest}" with error: ${error}`)
      return false
    }
    return true
  }

  if (stats.isDirectory()) {
    try {
      const files = await readdir(src)
      for (const file of files) {
        await copyRecursive(join(src, file), join(dest, file))
      }
      return true
    } catch (error) {
      log.error(`Failed to copy directory "${src}" to "${dest}" with error: ${error}`)
      return false
    }
  }

  return false
}