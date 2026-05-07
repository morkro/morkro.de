import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, extname } from "node:path"
import type { UserConfig } from "#config.user"
import { injectLivereloadScript } from "#server/livereload.ts"
import { logger, perf } from "#utils/log.ts"
import { deepMergeMap } from "#utils/object.ts"

const log = logger('Emitter')

export type EmitContext = {
  userConfig?: UserConfig
}

export type EmitBody = (
  file: string,
  outputPath: string,
  ctx: EmitContext
) => string

export type EmitProfile = {
  prod?: EmitBody[]
  dev?: EmitBody[]
}

const defaultEmitProfiles = new Map<string, EmitProfile>([
  ['.html', {
    dev: [(body, outputPath, ctx) => injectLivereloadScript(body)]
  }]
])

function getMergedProfiles(ctx: EmitContext) {
  const userProfiles = ctx.userConfig?.artifactTransforms ?? new Map([])
  return deepMergeMap(defaultEmitProfiles, userProfiles,
    (baseProfile, overProfile) => ({
      dev: [...(baseProfile?.dev ?? []), ...(overProfile?.dev ?? [])],
	    prod: [...(baseProfile?.prod ?? []), ...(overProfile?.prod ?? [])],
    }))
}

export function applyEmitTransforms (body: string, outputPath: string, ctx: EmitContext) {
  const transforms = getMergedProfiles(ctx)
  const profile = transforms.get(extname(outputPath))
  if (!profile) {
    log.debug(`No emit profile found for file "${extname(outputPath)}"`)
    return body
  }

  const env = (ctx.userConfig?.devMode ? profile.dev : profile.prod) ?? []
  return env.reduce(
    (body, transform) => transform(body, outputPath, ctx),
    body
  )
}

export async function emitStaticFile (inputPath: string, outputPath: string, ctx: EmitContext) {
  await mkdir(dirname(outputPath), { recursive: true })
  const transforms = getMergedProfiles(ctx)
  
  if (transforms.has(extname(outputPath))) {
    const file = await readFile(inputPath, 'utf-8')
    const output = applyEmitTransforms(file, outputPath, ctx)
    await writeFile(outputPath, output, 'utf-8')
    return
  }

  await copyFile(inputPath, outputPath)
}

export async function writeBuildArtifact (body: string, outputPath: string, ctx: EmitContext): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  const transformPerf = perf(`Transforming file "${extname(outputPath)}"`)
  const file = applyEmitTransforms(body, outputPath, ctx)
  transformPerf.end()
  await writeFile(outputPath, file, 'utf-8')
}