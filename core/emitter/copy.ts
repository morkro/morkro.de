import { copyFile, lstat, mkdir, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

export async function copyRecursive (input: string, output: string): Promise<boolean> {
  const stats = await lstat(input)
  if (stats.isSymbolicLink()) {
    log.debug(`Skipping symbolic link "${input}"`)
    return true
  }

  if (stats.isFile()) {
    try {
      await mkdir(dirname(output), { recursive: true })
      await copyFile(input, output)
    } catch (error) {
      log.error('Failed to copy file', { error, input, output })
      return false
    }
    return true
  }

  if (stats.isDirectory()) {
    try {
      const files = await readdir(input)
      for (const file of files) {
        const result = await copyRecursive(join(input, file), join(output, file))
        // if any file fails to copy, return false
        if (!result) {
          return false
        }
      }
      return true
    } catch (error) {
      log.error('Failed to copy directory', { error, input, output })
      return false
    }
  }

  return false
}