export function removeFrontmatter(file: string) {
  const frontmatter = file.match(/^---[\s\S]*?^---/m)
  let result = file
  if (frontmatter) {
    result = result.replace(frontmatter[0], '')
  }
  return result.trim()
}

export function parseFrontmatter<T>(content: string): T {
  // files can have some frontmatter meta data at the top, wrapped in "---" lines.
  // the wrapped text structure is in YAML format. we parse the content using regex and return it as an object.
  const result = {}
  const frontmatter = content.match(/^---[\s\S]*?^---/m)
  if (!frontmatter) {
    return result as T
  }

  const yaml = frontmatter[0]
  const lines = yaml.split('\n')

  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line || line.startsWith('#') || !line.includes(':')) {
      index++
      continue
    }
    
    const colonIdx = line.indexOf(':')
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    
    // if value is an empty string, it might be a multiline array
    if (value === '') {
      const arrayRegex = /^\s+-\s/
      const values: string[] = []
      index++ 
      while (index < lines.length && lines[index].match(arrayRegex)) {
         values.push(lines[index].replace(arrayRegex, '').trim())
         index++
      }
      result[key] = values
    } else {
      result[key] = value
      index++
    }
  }

  return result as T
}