import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { logger } from '#utils/log.ts'

const log = logger('Emitter')

type CopyResult = {
  ok: boolean
  inputPath: string
  outputPath: string
  error?: unknown
}

export async function copyRecursive (input: string, output: string): Promise<CopyResult> {
  const stats = await lstat(input)
  if (stats.isSymbolicLink()) {
    log.debug(`Skipping symbolic link "${input}"`)
    return { ok: true, inputPath: input, outputPath: output }
  }

  if (stats.isFile()) {
    try {
      await mkdir(dirname(output), { recursive: true })
      await copyFile(input, output)
    } catch (error) {
      log.error('Failed to copy file', { error, input, output })
      return { ok: false, inputPath: input, outputPath: output, error }
    }
    return { ok: true, inputPath: input, outputPath: output }
  }

  if (stats.isDirectory()) {
    try {
      const files = await readdir(input)
      for (const file of files) {
        const result = await copyRecursive(join(input, file), join(output, file))
        if (!result.ok) {
          return { ok: false, inputPath: input, outputPath: output, error: result.error }
        }
      }
      return { ok: true, inputPath: input, outputPath: output }
    } catch (error) {
      log.error('Failed to copy directory', { error, input, output })
      return { ok: false, inputPath: input, outputPath: output, error }
    }
  }

  return { ok: false, inputPath: input, outputPath: output }
}