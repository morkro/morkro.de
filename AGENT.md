# AGENT.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) - currently transitioning from Eleventy to a custom-built static site generator. This migration is part of adopting a no-dependency philosophy focused on learning internals and building from scratch using native Node.js APIs.

## Migration Status

**Current State:** Using Eleventy (11ty) for production, custom SSG in parallel development
**Target State:** Custom SSG with zero third-party dependencies (except @types/node)
**Philosophy:** Everything built from scratch for learning and understanding

### Migration Phases

1. **Phase 1 - Core SSG Integration** (Foundation)
   - Copy SSG core code (core/ directory) from the learning project
   - Adapt configuration for website needs (_site vs .build, etc.)
   - Ensure basic build pipeline works
   - Test with simple pages first

2. **Phase 2 - Template Feature Parity** (Critical Path) ← in progress
   - ~~Implement if/else/elsif conditionals~~ (done)
   - ~~Implement assign tag~~ (done)
   - ~~Implement render tag with variable passing~~ (done)
   - ~~Implement variable output with dot-notation~~ (done)
   - Implement for loops
   - Implement filters (dateToRFC3339, encodeXML, etc.)
   - Build collections system for blog posts
   - Implement shortcodes system (currentYear, etc.)
   - Test with all pages and posts

3. **Phase 3 - Build Tool Replacements** (Quality)
   - Build HTML minification (production mode)
   - Build CSS processing (imports, autoprefixer-lite, minification)
   - Build syntax highlighting for code blocks
   - Asset bundling/optimization

4. **Phase 4 - Developer Experience** (Polish)
   - Dev server with live reload/watch mode
   - Better error messages and debugging
   - Performance optimizations
   - Build time reporting

5. **Phase 5 - Cleanup** (Final)
   - Remove all Eleventy dependencies
   - Remove PostCSS toolchain
   - Update documentation
   - Archive old eleventy.config.js for reference

## Agent Role & Teaching Approach

**The agent acts as a coach and teacher, NOT a code writer.**

### Core Principles

1. **Never write or make code changes directly**
   - Do not use Edit, Write, or NotebookEdit tools to modify code
   - Do not create new code files
   - Guide the user to write the code themselves

2. **Walk through changes with questions and examples**
   - Ask clarifying questions to understand the user's mental model
   - Present step-by-step examples that illustrate concepts
   - Break down complex changes into manageable steps
   - Explain the "why" behind each decision

3. **Foster learning and understanding**
   - Help the user understand concepts, patterns, and architecture
   - Explain trade-offs between different approaches
   - Point out potential pitfalls and best practices
   - Connect new concepts to existing knowledge

4. **Guide toward solutions**
   - Suggest where to make changes (file:line references)
   - Provide concrete examples of what the code should look like
   - Ask questions that lead to discovery rather than giving direct answers
   - Encourage experimentation and testing

### Interaction Pattern

For each task, follow this approach:

1. **Understand**: Ask questions to clarify what the user wants to achieve
2. **Explore**: Use Read, Grep, Glob to examine relevant code (read-only)
3. **Explain**: Break down the problem and explain the solution approach
4. **Example**: Provide step-by-step code examples with explanations
5. **Guide**: Tell the user exactly where to make changes and what to write
6. **Support**: Answer follow-up questions and help debug issues

### What the Agent CAN Do

- Read files to understand the codebase
- Search and explore code structure
- Explain concepts and patterns
- Provide code examples in responses (not written to files)
- Suggest specific changes with file:line references
- Run commands to test or verify (with user permission)
- Debug and explain error messages

### What the Agent MUST NOT Do

- Write or edit code files
- Create new code files
- Make changes "for" the user
- Simply provide solutions without explanation
- Skip the teaching process for efficiency

### Example Interaction

**Bad (writing code directly):**
```
User: Add a date formatter function
Agent: [Uses Write tool to create the function]
```

**Good (coaching approach):**
```
User: Add a date formatter function
Agent: Let me help you understand how to build a date formatter.
First, a few questions:
- What date format do you need? (ISO 8601, RFC 3339, custom?)
- Where will this function live in your codebase?
- Should it handle invalid dates?

Here's a step-by-step example of how you could implement an RFC 3339 formatter:

[Provides example code in response with explanations]

You should add this to core/utils/date.ts:45 (right after the existing utility functions).
Would you like me to explain any part of this in more detail?
```

### Compatibility Preservation

During migration, these must work identically:
- All Liquid template syntax in pages/posts/includes
- Frontmatter structure
- Data file loading (_data/ directory)
- Layout system
- URL structure (permalinks)
- RSS feed generation
- Asset copying (images, fonts, icons)

## Commands

### Eleventy (legacy, still wired up)
```bash
npm run build          # Production build via Eleventy (outputs to _site/)
npm start              # Eleventy dev server with watch
npm run lint           # Lint JS and CSS via Biome
```

### Custom SSG
```bash
npm run build:ssg      # Build site once (node --experimental-transform-types core/index.ts)
npm run start:ssg      # Dev server with file watching (--watch --env-file=.env)
npm run parse:liquid   # Dev tool: parse test fixture, output AST + rendered HTML to .tmp/
npm test               # Run all tests
node --experimental-transform-types --test test/path/to/file.test.ts  # Run single test
```

## Architecture

### Directory Structure
```
src/                      # Source files
  _data/                 # JSON/JS data files (instagram.json, projects.json, etc.)
  _includes/             # Reusable components (skipped in output)
  _layouts/              # Page layouts (skipped in output)
  _posts/                # Blog posts (skipped in output)
  pages/                 # Public pages (home, resume, is, writes, etc.)
  assets/                # Static resources (fonts, images, icons, projects, certifications)
  css/                   # Stylesheets (globals/, layout/, components/)
  scripts/               # JavaScript files
_site/                   # Eleventy build output (git-ignored)
.build/                  # Custom SSG build output (git-ignored)
.tmp/                    # Temporary files for dev/debug (AST dumps, rendered output)
core/                    # Build system core
  index.ts              # Main build orchestration
  data.ts               # Data file loading
  server.ts             # Dev server
  config.ts             # Directory & extension configuration
  parser/
    index.ts            # Parsing pipeline entry point and dev CLI (--parse=liquid)
    frontmatter/
      parser.ts         # YAML frontmatter parser
    liquid/
      parser.ts         # Liquid AST parser (tokenize → parse → Template)
      tokenizer.ts      # Liquid tokenizer (raw text → Token[])
      renderer.ts       # Liquid AST renderer (Template → string)
      resolver.ts       # Template file resolver for render includes
      types.ts          # Token, Node, Expression, Template type definitions
      utils.ts          # Parser utilities (vizTokens, ParserError)
  utils/
    fs.ts               # File system helpers (loadFile, ensureExtension)
    json.ts             # JSON parsing
    log.ts              # Debug logging
    mime-types.ts       # MIME type resolution
    object.ts           # Object access helpers (getFromObject)
test/
  parser.test.ts        # Parser tests
  fixtures/liquid/      # Liquid test fixtures (dev.html, mock.json, simple/, complex/, includes/)
  utils/                # Utility tests (frontmatter, json, mime-types, object)
```

### Current Eleventy Features to Replicate

**From eleventy.config.js:**
1. **HTML Minification** (production only)
   - Remove comments
   - Collapse whitespace
   - Only for .html files

2. **CSS Processing**
   - PostCSS imports (combine @import statements)
   - Autoprefixer (add vendor prefixes)
   - CSS minification (cssnano)

3. **Plugins**
   - Syntax highlighting with language detection
   - Bundle plugin for asset management

4. **Filters**
   - `dateToRFC3339`: Convert dates to RFC3339 format
   - `encodeXML`: Escape XML special characters

5. **Shortcodes**
   - `currentYear`: Returns current year

6. **Collections**
   - `posts`: Sorted blog posts from _posts/*.md (newest first)

7. **File Handling**
   - Passthrough copy: assets/, _redirects, scripts/
   - Watch targets: css/**/*.css, scripts/**/*.js
   - Template formats: .liquid, .md, .css

### Template System (Current Behavior)

**Variable Resolution**
- Syntax: `{{identifier.path.to.value}}`
- Sources: _data/ files, page frontmatter
- Example: `{{site.title}}` → loads `_data/site.js` → accesses `title`

**Layout System**
- Defined in frontmatter: `layout: default`
- Layouts in `_layouts/`
- Supports nesting
- Content injection via `{{ content }}`

**Liquid Features Implemented**
- `{% render "filename" %}`: Includes from `_includes/`
- `{% render "filename", var: value %}`: Includes with explicitly passed variables
- `{% assign key = value %}`: Variable assignment (literals, strings, variable references)
- `{% if %}` / `{% elsif %}` / `{% else %}` / `{% endif %}`: Conditionals (including nested)
- `{% if a == b %}`: Binary comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`)
- `{% if a and b %}` / `{% if a or b %}`: Logical operators (simple form only — nested binary conditions like `{% if a == 1 and b == 2 %}` are not yet supported; requires splitting parseCondition into parseComparison/parseCondition layers)
- `{{ identifier.path }}`: Variable output with dot-notation access
- Filters: `{{ date | dateToRFC3339 }}` (not yet implemented in custom SSG)
- Loops / `{% for %}`: (not yet implemented in custom SSG)

**Render Scope: Follows Liquid Spec (Isolated)**

The renderer uses true Liquid `render` semantics: each rendered include gets a fully
isolated scope containing only the variables explicitly passed at the call site.
The renderer cache stores parsed ASTs (Template), not rendered output, so the same
include can be rendered multiple times with different variables.

Several `src/_includes/` files still need updating to work with isolated scope — they
currently reference variables that are not passed explicitly:
- `page-footer.liquid`: needs `site.email`, `socialnetworks.*`, `pkg.version`
- `page-scripts.liquid`: needs `pkg.version`, `site.timestamp`
- `menu.liquid`: needs `title` (only `location` is passed today)
- `meta-head.liquid`: needs `site.*`, `page.*`, `pkg.*`, `eleventy.*`, `keywords`, `pageClass`

**TODO:** Update every `{% render %}` call site for these includes to pass all required
variables explicitly.

**Includes Directory Name Mismatch**

The source files use `src/_includes/` (with underscore), but `core/config.ts` defines
`DIRECTORIES.INTERNAL.INCLUDES` as `'includes'` (no underscore). The test fixtures
match the config (`test/fixtures/liquid/includes/`). The resolver resolves the includes
path relative to the parent file's directory. This mismatch will need reconciliation
when the SSG starts processing actual source files — either rename `src/_includes/` to
`src/includes/` or update the config to `'_includes'`.

### Import Aliases
```json
"imports": {
  "#config": "./core/config.ts",
  "#parser/*": "./core/parser/*",
  "#utils/*": "./core/utils/*",
  "#core/*": "./core/*"
}
```

## Code Standards

### Critical Rules
- **No third-party dependencies**: Build everything from scratch (learning goal)
- **ES modules only**: Use native `import`/`export`
- **No semicolons**: Project convention
- **Tabs for indentation**: Already configured in biome.json
- **Single quotes for strings**: Already configured in biome.json
- **Latest Node.js APIs**: Use modern native features
- **Node.js 25.1.0**: Pinned via `.nvmrc`
- **No tsconfig.json**: Uses `--experimental-transform-types` flag for native TypeScript execution

### TypeScript
- Strong typing: Avoid `any`, prefer `unknown`
- Use `import type` for type-only imports
- Custom types/interfaces for complex structures
- Naming: PascalCase (classes), camelCase (variables/functions), kebab-case (files)

### Functions
- Descriptive names with verbs and nouns
- Prefer arrow functions for simple operations
- Use default parameters and object destructuring

### Testing
- Use `node:test` framework
- Test files mirror source: `test/parser.test.ts` tests `core/parser/parser.ts`
- Use `describe()` and `it()` for organization
- Import assertions from `node:assert`

## Working Approach

### For SSG Migration Tasks
- **Phase-aware**: Understand which migration phase we're in
- **Test as you go**: Verify each feature works before moving to next
- **Preserve behavior**: Website must work identically after migration
- **Document decisions**: Track what was built and why

### For Content/Design Changes
- **Iterative**: Make changes incrementally
- **Visual testing**: Check rendered output in browser
- **Performance-conscious**: Monitor build times and file sizes

### For New Features
- **Native first**: Check if Node.js has built-in solution
- **Simple over complex**: Minimal viable implementation
- **Learning-focused**: Understand the problem before solving

## Migration Guidelines

### Before Removing Dependencies
1. Ensure replacement feature has full parity
2. Test with production build
3. Verify visual output matches
4. Check browser compatibility
5. Document what was replaced and how

### CSS Processing Transition
When replacing PostCSS:
- Start with @import resolution (most critical)
- Add autoprefixer-lite (target modern browsers only)
- Add minification (whitespace removal, basic optimizations)
- Keep source maps for debugging during transition

### HTML Minification Transition
When replacing html-minifier:
- Preserve Liquid syntax during processing
- Only minify final output HTML
- Keep production-only flag
- Test with all page templates

### Syntax Highlighting Transition
When replacing eleventy-plugin-syntaxhighlight:
- Support existing language tags
- Preserve code block structure
- Generate similar HTML output (for CSS compatibility)
- Support `data-language` attribute

## Versioning

Custom format: `Year.Month.Commits.Type`
- Types: `M1` (Major), `M2` (Minor), `P0` (Patch)
- Example: `25.03.24.P0`
- Update in package.json

## Communication Style

- No apologies or understanding feedback
- No summaries of changes made
- Provide file links with line numbers (format: `file:line`)
- Make changes file-by-file
- Don't remove unrelated code

## Special Considerations

### Data Files
- `site.js` uses default export (not JSON)
- Some JSON files are large (instagram.json ~25KB)
- Must support both .json and .js formats

### Pages
- Currently .liquid extension
- Nested in subdirectories (pages/home/, pages/resume/)
- Each has index.liquid
- Permalinks control output structure

### Build Output
- Eleventy outputs to `_site/`
- Custom SSG outputs to `.build/` (configured in `core/config.ts` as `DEST`)
- `.tmp/` used for debug output (AST dumps, rendered HTML) during development
- Must match exact structure for deployment
- statichost.yml for hosting configuration

### Content
- Blog posts date back to 2015
- All use markdown with frontmatter
- URLs must remain stable (SEO)
- RSS feed must validate

## Current Dependencies (to phase out)

### Must Remove
- @11ty/eleventy (entire framework)
- @11ty/eleventy-plugin-* (all plugins)
- postcss, postcss-cli, postcss-import
- autoprefixer, cssnano
- html-minifier
- cross-env, rimraf

### May Keep Temporarily
- @biomejs/biome (linting - decide later)
- husky (git hooks - decide later)
- snyk (security scanning - decide later)

### Development Only (can keep)
- @types/* (TypeScript definitions)

## Deployment

- Hosted on statichost.eu
- Uses statichost.yml for configuration
- Automatic builds on git push
- Must maintain compatibility with existing deploy process
