import { stderr } from 'node:process'
import { styleText } from 'node:util'

type LogMeta = Record<string, unknown>

function normaliseError (error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    }
  }
  return { value: String(error) }
}

const timestamp = () => new Date().toLocaleDateString('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function logger (label: string) {
  const syntax = (_lvl: string, message: string, meta?: LogMeta) => {
    let msg = `[${timestamp()}] ${_lvl} (${label}): ${message}`
    if (meta && Object.keys(meta).length > 0) {
      msg += `\n${styleText('dim', JSON.stringify(meta, null, 1))}`
    }
    return msg
  }

  return {
    debug (msg: string, meta?: LogMeta) {
      if (process.env.DEBUG !== 'true') return
      console.debug(
        syntax(
          styleText(['bold'], 'debug'), msg, meta))
    },
    info (msg: string, meta?: LogMeta) {
      console.info(
        syntax(
          styleText(['blue', 'bold'], 'info'), msg, meta))
    },
    warn (msg: string, meta?: LogMeta) {
      console.warn(
        syntax(
          styleText(['yellow', 'bold'], 'warn'), msg, meta))
    },
    error (msg: string, meta?: LogMeta) {
      const hasError = meta !== null && meta !== undefined && 'error' in meta
      const normalised = hasError ? normaliseError(meta?.error) : undefined
      const text = normalised && 'message' in normalised && typeof normalised.message === 'string'
        ? `${msg}: ${normalised.message}`
        : msg
      
      console.error(
        syntax(
          styleText(['red', 'bold'], 'error', { stream: stderr }),
          text,
          hasError ? { ...meta, error: normalised } : meta
        ))
    }
  }
}

/**
 * Usage:
 * const perf = perf('Parsing Frontmatter')
 * const frontmatter = parseFrontmatter(file)
 * perf.end()
 */
export function perf (label: string): { end: () => void } {
  const now = performance.now()
  const _logger = logger('Perf')
  return {
    end () {
      const duration = (performance.now() - now).toFixed(2)
      _logger.debug(`${label} in ${duration}ms`)
    }
  }
}