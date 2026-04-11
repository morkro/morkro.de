import { copyFile, mkdir, readdir, stat } from "node:fs/promises"
import { dirname, join } from "node:path"
import { log } from "#utils/log.ts"

export async function copyRecursive (src: string, dest: string): Promise<boolean> {
  const stats = await stat(src)

  if (stats.isFile()) {
    try {
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(src, dest)
    } catch (error) {
      log(`Failed to copy file "${src}" to "${dest}" with error: ${error}`, { lvl: 'error' })
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
      log(`Failed to copy directory "${src}" to "${dest}" with error: ${error}`, { lvl: 'error' })
      return false
    }
  }

  return false
}