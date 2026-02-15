import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseFrontmatter, removeFrontmatter } from '#utils/frontmatter.ts'

const testFrontmatter = `---
title: Test
keywords:
  - test
  - test2
permalink: /test
layout: default
pageClass: test
---`

const testFileWithout = `<html>
  <body>
    <h1>{{ title }}</h1>
  </body>
</html>`

const testFileFull = `${testFrontmatter}

${testFileWithout}
`

const testFileWithBrokenFrontmatter = `-_-
title: Test
keywords:
  - test
  - test2
layout: default
pageClass: test
-

${testFileWithout}
`

const testFileWithCommentedFrontmatter = `---
title: Test
# comment foo
keywords:
  - test
  - test2
---

${testFileWithout}
`

type FileMeta = {
  title: string
  keywords: string[]
  permalink: string
  layout: string
  pageClass: string
}

describe('parseFrontmatter function', () => {
  it('should remove the frontmatter from a file', () => {
    const file = removeFrontmatter(testFileFull)
    assert.strictEqual(file, testFileWithout)
  })

  it('should return the meta data as object from a file with frontmatter', async () => {
    const frontmatter = await parseFrontmatter<FileMeta>(testFileFull)
    assert.strictEqual(frontmatter.title, 'Test')
    assert.deepStrictEqual(frontmatter.keywords, ['test', 'test2'])
    assert.strictEqual(frontmatter.permalink, '/test')
    assert.strictEqual(frontmatter.layout, 'default')
    assert.strictEqual(frontmatter.pageClass, 'test')
  })

  it('should return an empty object if the file has no frontmatter', async () => {
    const frontmatter = await parseFrontmatter<FileMeta>(testFileWithout)
    assert.deepStrictEqual(frontmatter, {})
  })

  it('should return an empty object if the frontmatter is invalid', async () => {
    const frontmatter = await parseFrontmatter<FileMeta>(testFileWithBrokenFrontmatter)
    assert.deepStrictEqual(frontmatter, {})
  })

  it('should skip commented frontmatter', async () => {
    const frontmatter = await parseFrontmatter<FileMeta>(testFileWithCommentedFrontmatter)
    assert.deepStrictEqual(frontmatter, {
      title: 'Test',
      keywords: ['test', 'test2'],
    })
  })
})