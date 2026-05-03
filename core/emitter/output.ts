import { mkdir, writeFile } from "node:fs/promises"
import { dirname, extname } from "node:path"
import type { UserConfig } from "#config.user"
import { injectLivereloadScript } from "#server/livereload.ts"
import { minifyHtml } from "#transforms/minify-html.ts"
import { logger } from "#utils/log.ts"

const log = logger('Emitter')

export type EmitContext = {
  userConfig?: UserConfig
}

export type EmitBody = (
  file: string,
  outputPath: string,
  ctx: EmitContext
) => string

type EmitProfile = {
  prod: EmitBody[]
  dev: EmitBody[]
}

const emitProfiles = new Map<string, EmitProfile>([
  ['.html', {
    prod: [(body, outputPath, ctx) => minifyHtml(body)],
    dev: [(body, outputPath, ctx) => injectLivereloadScript(body)]
  }]
])

export function finishEmitFile (body: string, outputPath: string, ctx: EmitContext) {
  const profile = emitProfiles.get(extname(outputPath))
  if (!profile) {
    log.debug(`No emit profile found for file "${extname(outputPath)}"`)
    return body
  }

  const env = ctx.userConfig?.devMode ? profile.dev : profile.prod
  return env.reduce(
    (body, transform) => transform(body, outputPath, ctx),
    body
  )
}

export async function writeEmittedFile (body: string, outputPath: string, ctx: EmitContext): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    finishEmitFile(body, outputPath, ctx)
  )
}