import { stderr } from 'node:process'
import { styleText } from 'node:util'

type LogMeta = Record<string, unknown>

export function logger (label: string) {
  const now = new Date().toLocaleDateString('de-DE',
    { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const syntax = (_lvl: string, message: string, meta?: LogMeta) => {
    let msg = `[${now}] ${_lvl} (${label}): ${message}`
    if (meta && Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`
    }
    return msg
  }
  
  return {
    debug (msg: string, meta?: LogMeta) {
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
      console.error(
        syntax(
          styleText(['red', 'bold'], 'error', { stream: stderr }), msg, meta))
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