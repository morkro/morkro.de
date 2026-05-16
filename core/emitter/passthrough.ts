import { join, relative, resolve } from 'node:path'
import type { PassThroughCopy } from '#config.user'

export type PassthroughRoot = {
	from: string
	to: string
}

export function getPassthrough (output: string, passthrough: PassThroughCopy[] = []): PassthroughRoot[] {
  return passthrough.map(entry => ({
    from: resolve(entry.from),
    to: resolve(output, entry.to)
  }))
}

export function resolvePassthrough (
	inputPath: string,
	roots: PassthroughRoot[]
): string | undefined {
	for (const root of roots) {
		if (inputPath === root.from || inputPath.startsWith(`${root.from}/`)) {
			return join(root.to, relative(root.from, inputPath))
		}
	}
	return undefined
}