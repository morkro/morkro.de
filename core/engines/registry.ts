import { createCssEngine } from './css.ts';
import { createSiteTemplateEngine } from './site-template.ts';
import type { BuildEngine } from './types.ts';

export const defaultEngines: BuildEngine[] = [
  createSiteTemplateEngine(),
  createCssEngine(),
]

export function resolveEngine(
  engines: BuildEngine[],
  inputPath: string
): BuildEngine | undefined {
  for (const engine of engines) {
    if (engine.canRun(inputPath)) {
      return engine
    }
  }
}