import { dirname, resolve } from "node:path";
import { DIRECTORIES } from "#config";
import type { Template } from "./types";
import { ensureExtension, loadFile } from "#utils/fs.ts";
import { parseLiquid } from "./parser.ts";

export async function templateResolver(parentPath: string, file: string): Promise<Template> {
  const base = dirname(parentPath)
  const includesPath = resolve(base, DIRECTORIES.INTERNAL.INCLUDES)
  const fileName = ensureExtension(file, '.html')
  const content = await loadFile(includesPath, fileName)
  return parseLiquid(content, resolve(includesPath, fileName))
}