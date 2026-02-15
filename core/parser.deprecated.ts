import { relative } from "node:path";
import { removeFrontmatter, parseFrontmatter } from '#parser/frontmatter/parser.ts'
import { getFromObject } from '#utils/object.ts'
import { logParser as log, logGroupEnd } from '#utils/log.ts'
import { DIRECTORIES } from '#config'
import { parseLiquid, replaceVariables, type Variables } from '#root/liquid.deprecated.ts';
import { loadFile } from '#utils/fs.ts';
import { type DataFileMap } from "#root/data.ts";

type FileMeta = Partial<{
  layout: string
  title: string
  pageClass: string
  keywords: string[]
  permalink: string
}>

type ParsedFile = {
  content: string
  meta: FileMeta
  variables: Variables
  __data: {
    src: string
  }
}

async function parseVariables(content: string, meta: FileMeta, dataFiles: DataFileMap): Promise<Variables> {
  const variables = content.match(/{{.*?}}/g)
  const result: Variables = {}

  if (variables) {
    for (const variable of variables) {
      // remove padding ("{{", "}}") and extract variable value
      const value = variable.replace(/{{|}}/g, '').trim()
      const [identifier, ...objectPath] = value.split('.')

      // If it's a meta variable, we can just use the value from the meta object
      if (objectPath.length === 0) {
        const metaValue = meta[identifier as keyof FileMeta]
        if (metaValue !== undefined) {
          result[value] = String(metaValue)
        }
      } else {
        const data = dataFiles.get(identifier)

        if (data) {
          const replacer = getFromObject(objectPath, data)
          if (replacer === undefined) {
            log(`Variable '${value}' is undefined`, { lvl: 'error' })
          } else if (Array.isArray(replacer)) {
            log(`Variable '${value}' is an array and unsupported`, { lvl: 'debug' })
          } else if (typeof replacer === 'object') {
            log(`Variable '${value}' is an object and unsupported`, { lvl: 'debug' })
          } else {
            result[value] = String(replacer)
          }
        } else {
          log(`Data file "${identifier}" not found`, { lvl: 'error' })
        }
      }
    }
  }

  return result
}

async function applyLayout (layoutName: string, content: string): Promise<string> {
  const layout = await loadFile(DIRECTORIES.INTERNAL.LAYOUTS, `${layoutName}.html`)
  const meta = parseFrontmatter<FileMeta>(layout)
  const layoutContent = removeFrontmatter(layout)
  const composed = layoutContent.replaceAll(/\{\{\s*content\s*\}\}/g, `\n${content}\n`)

  if (meta.layout) {
    return await applyLayout(meta.layout, composed)
  }

  return composed
}

export async function parseFile(file: string, srcPath: string, dataFiles: DataFileMap): Promise<ParsedFile> {
  const fileName = relative(DIRECTORIES.SRC, srcPath)
  log(`Extracting file meta data (${fileName})`, { lvl: 'debug' })
  const meta = parseFrontmatter<FileMeta>(file)
  log(`Removing frontmatter (${fileName})`, { lvl: 'debug' })
  let content = removeFrontmatter(file)

  if (meta.layout) {
    log(`Applying layout "${meta.layout}" (${fileName})`, { lvl: 'debug' })
    content = await applyLayout(meta.layout, content)
  }

  log(`Parsing Liquid syntax (${fileName})`, { lvl: 'debug', type: 'group' })
  const liquidified = await parseLiquid(content)
  logGroupEnd()

  log(`Extracting file variables (${fileName})`, { lvl: 'debug' })
  const variables = await parseVariables(liquidified, meta, dataFiles)

  log(`Replacing variables (${fileName})`, { lvl: 'debug' })
  const rendered = replaceVariables(liquidified, variables)

  return {
    content: rendered,
    meta,
    variables,
    __data: {
      src: file
    }
  }
}
