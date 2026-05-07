# AGENT.md

This file provides guidance to AI coding assistants when working with this repository.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) - currently transitioning from Eleventy to a custom-built static site generator. This migration is part of adopting a no-dependency philosophy focused on learning internals and building from scratch using native Node.js APIs.

## Migration Status

**Current State:** Using Eleventy (11ty) for production, custom SSG in parallel development
**Target State:** Custom SSG with zero third-party dependencies (except @types/node)
**Philosophy:** Everything built from scratch for learning and understanding

**Migration Plan:** See [`TODO.md`](TODO.md) for complete component breakdown and status tracking

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
   - ~~Implement for loops~~ (done)
   - Collections for posts: partial — `collections.posts` is loaded from `src/_posts/` via `core/data/posts.ts`, merged in `loadDataFiles()`, and each post is written to HTML by `core/emitter/posts.ts`. `userConfig.collections.posts.sortBy` / `sortOrder` are defined in `config.user.ts` but not yet applied when building the collection; `createPostUrl()` in `posts.ts` only substitutes a subset of permalink patterns (see TODO there). Eleventy-shaped collection APIs beyond `collections.posts` are still open.
   - ~~Implement filters~~ (done — built-ins in [`core/parser/liquid/filters.ts`](core/parser/liquid/filters.ts); user filters in [`core/config.user.ts`](core/config.user.ts) `filters`, e.g. `encodeXML`. Eleventy `dateToRFC3339` → `| date: 'rfc3339'`.)
   - ~~Implement shortcodes system (currentYear, etc.)~~ (done — `ShortCode` node type, registry in `config.user.ts`, resolved at render time)
   - ~~Implement layout system~~ (done — `layoutResolver` in `resolver.ts`, nested chains via frontmatter `layout` key, content injection via `{{ content }}`)
   - Test with all pages and posts

3. **Phase 3 - Build Tool Replacements** (Quality)
   - Build HTML minification (production mode)
   - Build CSS processing (imports, autoprefixer-lite, minification)
   - Build syntax highlighting for code blocks
   - Asset bundling/optimization

4. **Phase 4 - Developer Experience** (Polish) ← partial
   - ~~Dev server + live reload for SSG~~ — Script **`npm run start:ssg`**: `node --watch --env-file=.env core/index.ts --serve` restarts the process when **`core/`** (loaded module graph) changes; first run **`build()`** then [`core/server/index.ts`](core/server/index.ts) serves **`.build/`**.
   - [`core/server/watcher.ts`](core/server/watcher.ts): **`fs.watch`** on **`src/`** (recursive), 150 ms debounce, coalesced **`schedule()`** so rebuilds do not overlap; on success **`broadcastReload()`** from [`core/server/livereload.ts`](core/server/livereload.ts).
   - Livereload: HTTP **`upgrade`** on **`/__livereload`**, RFC 6455 handshake, text frames to connected tabs; HTML injection when **`userConfig.debugMode`** (`DEBUG=true` in `.env` → [`core/config.user.ts`](core/config.user.ts)) in [`core/emitter/traverse.ts`](core/emitter/traverse.ts) and [`core/emitter/posts.ts`](core/emitter/posts.ts). **`SIGINT`**: close FS watcher via [`core/index.ts`](core/index.ts).
   - Better error messages and debugging
   - Performance optimizations
   - Build time reporting

5. **Phase 5 - Cleanup** (Final)
   - Remove all Eleventy dependencies
   - Remove PostCSS toolchain
   - Update documentation
   - Archive old eleventy.config.js for reference

## Agent Role & Teaching Approach

**Default: the agent acts as a coach and teacher, not an autonomous code writer.**

### Explicit implementation (override)

When the user **clearly asks** the agent to write, implement, or apply changes **in the repository** (e.g. “implement this in the codebase”, “apply the patch”, “add this file for me”), the agent **may** create or edit files to fulfill that request. Scope changes to what was asked; still follow project constraints (no third-party dependencies unless the project already allows an exception, same style and architecture).

Examples that **do** count as opting in: “apply the fix in the repo”, “edit `path/to/file.ts`”, “implement this and commit”, “add this file for me”, “make the changes in the repository”, “update `AGENT.md` to …”, “write/apply this patch”.

### Ambiguous or goal-only language (not opt-in)

The following describe intent, gaps, or desired outcomes. They **do not** authorize editing the repository unless paired with explicit opt-in language from **Explicit implementation** above:

- Wants and goals: “I want to …”, “I’d like …”, “we should …”, “it would be nice if …”
- Refactors and wiring: “update `X` so it …”, “refactor …”, “wire up …”, “leverage …”
- Missing pieces: “I think I’m missing …”, “there’s no entry point for …”, “we need a function that …”
- Soft asks: “can you add …”, “could you integrate …” **without** “apply in the repo”, “edit this file”, or an equivalent from the opt-in list

**Rule:** If the user states a goal or names a file but does **not** clearly ask to **write**, **implement**, **apply**, or **edit (in / to) the repository or a specific path**, stay in **coach mode**: read-only exploration, explanation, file:line pointers, and code **in the chat only**.

**If unclear:** Default to coach mode **or** ask one short question: whether they want changes **applied in the repo** or **guidance only**. Do not edit files based on a guess.

### What does not count as opting in

The following **do not** override coach mode or authorize repository edits by themselves:

- Pasting a stack trace, build log, or test failure
- Saying the build failed, tests failed, or something errors, without asking to change files in the repo
- Asking *why* something fails or *how* to fix it without explicit language to **apply** or **edit** in this repository

Diagnosis, root cause, and proposed patches stay **in the chat** until the user explicitly opts in to implementation in the repository.

### Core Principles

1. **Do not write or make code changes directly — unless** the user has explicitly requested implementation in the repo (see **Explicit implementation** and **What does not count as opting in** above).
   - In default/coach mode: do not use Edit, Write, or NotebookEdit tools to modify code; do not create new code files; guide the user to write the code themselves.
   - Bug diagnosis and proposed fixes: explain in chat; do not apply changes to the tree unless the user explicitly asked to implement in the repo.

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
- Provide code examples in responses (in default mode, not written to files unless the user explicitly asked for repo edits)
- Suggest specific changes with file:line references
- Create or edit files when the user explicitly requested implementation in the repository
- Run commands to test or verify (with user permission)
- Debug and explain error messages (in chat; file edits only after explicit opt-in to repo implementation)

### What the Agent MUST NOT Do

- Treat stack traces, failing tests, or “this errors” as implicit permission to edit the repository
- Treat **goal-only** or **ambiguous** phrasing (see **Ambiguous or goal-only language**) as permission to edit; inferring “they probably want me to implement it” is not enough
- Write or edit code files **in default/coach mode** (without an explicit request to implement in the repo)
- Create new code files **without** the same explicit request
- Make unsolicited changes "for" the user
- Simply provide solutions without explanation when teaching is the goal
- Skip the teaching process for efficiency when the user is learning step-by-step

### Example Interaction

**Bad (writing code directly when the user did not ask for repo edits):**
```
User: Add a date formatter function
Agent: [Uses Write tool to create the function]
```

**Bad (goal stated, no explicit repo edit):**
```
User: I want to update core/parser/index.ts so it uses the new Liquid parser
Agent: [Uses Write tool — wrong: “I want to update” is goal-only, not opt-in]
```

**Fine (user explicitly asked for implementation in the repo):**
```
User: Implement the date formatter in core/utils/date.ts for me
Agent: [Uses Write or Edit to add the function as requested]
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
npm run clean:build    # Remove `.build/`, `.tmp/`, and `_site/` (see scripts/clean-artifacts.ts)
npm run build:ssg      # Build site once (node core/index.ts)
npm run start:ssg      # Rebuild on change + serve .build/ (node --watch --env-file=.env core/index.ts --serve)
npm run test:liquid    # Dev tool: parse test fixture, output AST + rendered HTML to .tmp/
npm test               # Run all tests (node --test)
node --test test/path/to/file.test.ts  # Run a single test file
```

## Architecture

### Directory Structure
```
src/                      # Source files
  _data/                 # JSON/JS data files (instagram.json, projects.json, etc.)
  _includes/             # Reusable partials (`.liquid` and `.html`; skipped in output)
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
  index.ts              # Main build orchestration (discover → process → writePosts → swap dest)
  data/
    index.ts            # loadDataFiles: _data/, customDataMapping (+ optional field pick), collections.posts
    loader.ts           # loadFromDir, loadFromFile
    posts.ts            # loadPosts from _posts/, URL helpers (permalink pattern partial); no sort yet
    types.ts            # DataFileMap and related types
  emitter/
    traverse.ts         # discoverFiles, processFiles (orchestrates compile + emit)
    copy.ts             # pass-through copy helper
    posts.ts            # write compiled post HTML into dest
  server.ts             # Static HTTP server for .build/
  config.core.ts        # Directory & extension configuration (import #config)
  config.user.ts        # User overrides: customDataMapping, passThroughCopy, collections, baseUrl, shortCodes, filters (import #config.user)
  parser/
    index.ts            # Parsing pipeline entry point (compile, createPageContext)
    README.md           # Liquid/frontmatter feature matrix vs Shopify Liquid
    utils.ts            # Shared parser helpers (indent, quotes; used by frontmatter + liquid)
    frontmatter/
      index.ts          # Frontmatter module barrel
      parser.ts         # Frontmatter parser (YAML-like subset)
    liquid/
      parser.ts         # Liquid AST parser (tokenize → parse → Template)
      tokenizer.ts      # Liquid tokenizer (raw text → Token[])
      renderer.ts       # Liquid AST renderer (Template → string)
      resolver.ts       # Template file resolver for render includes and layout resolution
      filters.ts        # Built-in Liquid filters (date presets, join, replace, prepend)
      types.ts          # Token, Node, Expression, Template type definitions
      utils.ts          # Liquid-specific helpers
  utils/
    fs.ts               # File system helpers (loadFile, ensureExtension)
    json.ts             # JSON parsing
    log.ts              # Debug logging
    mime-types.ts       # MIME type resolution
    object.ts           # Object access helpers (getFromObject)
    path.ts             # Output path helpers
    url.ts              # URL helpers for page context
    html.ts             # e.g. escapeXML
test/
  parser/
    liquid.test.ts      # Liquid parser/renderer tests
    frontmatter.test.ts # Frontmatter parser tests
    filters.test.ts     # Built-in and user filter behavior
    utils.test.ts       # Parser utils tests
  fixtures/liquid/      # Liquid test fixtures (dev.html, mock.json, run.ts, simple/, complex/, includes/)
  utils/                # Utility tests (json, mime-types, object, path, url, fs)
```

### Global data (`loadDataFiles`)

[`core/data/index.ts`](core/data/index.ts) builds the global data map used at render time:

1. **Directory data** — JSON files under `src/_data/` (via `loadFromDir`).
2. **Custom file map** — Optional `customDataMapping` in [`core/config.user.ts`](core/config.user.ts). Each key names a data entry; the value is either a path string to a JSON file (the whole parsed object is stored under that key) or `{ path, includeFields }`, where `includeFields` is a list of **top-level** keys to keep from that file (e.g. `version` and `author` from `package.json`). Omitted keys are not copied into the map.
3. **Collections** — When posts exist, `collections` is set with `{ posts }` from [`core/data/posts.ts`](core/data/posts.ts).

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
   - `dateToRFC3339`: Convert dates to RFC3339 format (custom SSG: built-in `| date: 'rfc3339'`)
   - `encodeXML`: Escape XML special characters (custom SSG: user filter in `config.user.ts`)

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
- Sources: `src/_data/` files, entries from `customDataMapping` in `config.user.ts`, `collections` (when posts are loaded), page frontmatter
- Example: `{{site.title}}` → data from `_data/site.*` → accesses `title`

**Layout System**
- Defined in frontmatter: `layout: default`
- Layouts in `_layouts/`, resolved by `layoutResolver` in `core/parser/liquid/resolver.ts`
- Supports nested chains (e.g. `page → default → meta`); walks `layout` key in each layout's frontmatter until none remains
- Content injection via `{{ content }}` — the child's rendered output is set as `content` on the layout's context
- Layout wrapping happens in `compile()` (`core/parser/index.ts`) after the page body is rendered

**Shortcodes**
- Registry: `shortCodes` map in `config.user.ts` (e.g. `currentYear: () => new Date().getFullYear()`)
- Syntax: `{% name %}` — a single identifier tag not matching any built-in keyword
- Parser emits `ShortCode` AST node; renderer resolves the function from context and outputs its return value
- Unknown shortcodes throw at render time

**Liquid Features**

For a full list of implemented and missing Liquid tags, operators, and filters, see [`core/parser/README.md`](core/parser/README.md).

**Render Scope: Follows Liquid Spec (Isolated)**

The renderer uses true Liquid `render` semantics: each rendered include gets a fully
isolated scope containing only the variables explicitly passed at the call site.
The renderer cache stores parsed ASTs (Template), not rendered output, so the same
include can be rendered multiple times with different variables.

Layouts pass explicit variables into partials that need them: [`src/_layouts/default.liquid`](src/_layouts/default.liquid) passes flattened names into `page-footer` (e.g. `site_email`, `socialnetworks_*`, `pkg_version`); [`src/_layouts/meta.liquid`](src/_layouts/meta.liquid) passes objects into `meta-head` and `pkg_version` / `site_timestamp` into `page-scripts`. `menu` receives `title` (and `location`) from callers.

Partials such as `logo`, `page-top-left-bg`, `iconset`, `world`, and `article-outdated-warning` use only static markup or variables supplied at the `{% render %}` call site (e.g. `asLink` for `logo`). Any new include must follow the same rule: under isolated `render`, only passed bindings and literals are in scope.

Global data keys such as `pkg` still come from `customDataMapping`; they are not visible inside a `render` partial unless the parent template passes them (or passes derived flat fields).

**Includes Directory Name Mismatch**

The source files use `src/_includes/` (with underscore), but [`core/config.core.ts`](core/config.core.ts) defines
`DIRECTORIES.INTERNAL.INCLUDES` as `'includes'` (no underscore). The test fixtures
match the config (`test/fixtures/liquid/includes/`). The resolver resolves the includes
path relative to the parent file's directory. This mismatch will need reconciliation
when the SSG starts processing actual source files — either rename `src/_includes/` to
`src/includes/` or update the config to `'_includes'`.

### Import Aliases
```json
"imports": {
  "#config": "./core/config.core.ts",
  "#config.user": "./core/config.user.ts",
  "#emitter/*": "./core/emitter/*",
  "#parser/*": "./core/parser/*",
  "#utils/*": "./core/utils/*",
  "#core/*": "./core/*"
}
```
(From [`package.json`](package.json); keep in sync when adding aliases.)

## Code Standards

### Critical Rules
- **No third-party dependencies** (SSG goal): The custom build under `core/` uses only Node built-ins; the repo still ships Eleventy, PostCSS, etc. for the legacy production path until migration completes.
- **ES modules only**: Use native `import`/`export`
- **Semicolons**: Biome uses `"semicolons": "asNeeded"` (omit where ASI is safe; project style leans minimal)
- **Tabs for indentation**: Configured in biome.json
- **Single quotes for strings**: Configured in biome.json
- **Latest Node.js APIs**: Use modern native features
- **Node.js 25.1.0**: Pinned via `.nvmrc`
- **TypeScript entrypoints**: There is no `tsconfig.json` in the repo; scripts invoke `node` on `.ts` files directly (Node’s native TypeScript execution / type stripping). Editors infer types from imports and `@types/node`.

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
- Test files mirror source: e.g. `test/parser/liquid.test.ts`, `test/parser/frontmatter.test.ts`
- Use `describe()` and `it()` for organization
- Import assertions from `node:assert`

## Working Approach

### For SSG Migration Tasks
- **Phase-aware**: Understand which migration phase we're in (see [`TODO.md`](TODO.md))
- **Test as you go**: Verify each feature works before moving to next
- **Preserve behavior**: Website must work identically after migration
- **Document decisions**: Track what was built and why
- **Update TODO.md**: When completing components or making progress, update the status markers in [`TODO.md`](TODO.md)

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
- Example: `26.04.59.M2` (see `version` in [`package.json`](package.json))
- Update in package.json

## Communication Style

- No apologies or understanding feedback
- No summaries of changes made
- Provide file links with line numbers (format: `file:line`)
- Make changes file-by-file
- Don't remove unrelated code
- Update [`TODO.md`](TODO.md) status when completing migration components

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
- Custom SSG outputs to `.build/` (`directories.output` in [`core/config.core.ts`](core/config.core.ts))
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
- cross-env

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
