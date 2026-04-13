import { stderr } from 'node:process'
import { styleText } from 'node:util'

type LogDomain = 'parser' | 'server' | 'test' | 'emitter' | 'data'
type LogLevel = 'debug' | 'info' | 'error' | 'warn'

export type LogConfig = {
  lvl?: LogLevel
  d?: LogDomain
  type?: 'group'
}

export const logGroupEnd = console.groupEnd

export const log = (message: string, config: LogConfig): void => {
  const now = new Date().toLocaleDateString('de-DE',
    { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const { lvl = 'info', d = 'emitter', type } = config
  const domain = styleText(['inverse'], ` ${d.toUpperCase()} `)
  const logger = type === 'group' ? console.group : console.log
  
  const syntax = (_lvl: string) => `[${now}]${domain}[${_lvl}] ${message}`

  if (lvl === 'debug') {
    if (process.env.DEBUG === 'true') {
      logger(syntax(styleText(['bold'], 'debug')))
    }
  } else if (lvl === 'info') {
    logger(syntax(styleText(['blue', 'bold'], 'info')))
  } else if (lvl === 'warn') {
    logger(syntax(styleText(['yellow', 'bold'], 'warn')))
  } else if (config.lvl === 'error') {
    console.error(syntax(styleText(['red', 'bold'], 'error', { stream: stderr })))
  }
}

export const logParser = (message: string, config: LogConfig = { lvl: 'info' }): void =>
  log(message, { ...config, d: 'parser' })

export const logServer = (message: string, config: LogConfig = { lvl: 'info' }): void =>
  log(message, { ...config, d: 'server' })

export const logTest = (message: string, config: LogConfig = { lvl: 'info' }): void =>
  log(message, { ...config, d: 'test' })

export const logSsg = (message: string, config: LogConfig = { lvl: 'info',}): void =>
  log(message, { ...config, d: 'emitter' })

/**
 * Usage:
 * const perf = perf('Parsing Frontmatter')
 * const frontmatter = parseFrontmatter(file)
 * perf.end()
 */
export function perf (label: string): { end: () => void } {
  const now = performance.now()
  return {
    end () {
      const duration = (performance.now() - now).toFixed(2)
      log(`${label}: ${duration}ms`, { lvl: 'debug' })
    }
  }
}