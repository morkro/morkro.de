# AGENT.md

This file provides guidance to AI coding assistants when working with this repository.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) built with a custom static site generator in `core/`. The site previously used Eleventy; production now runs entirely on the custom SSG. This project adopts a no-dependency build philosophy focused on learning internals and building from scratch using native Node.js APIs.

## Migration Status

**Current state:** Custom SSG in `core/` is the production build. Output goes to `.build/`; statichost.eu deploys that directory (`npm run build` with `NODE_ENV=production`).

**Build dependencies:** Zero third-party packages for the SSG itself (except `@types/node` for editor/IDE typing). Dev tooling (`@biomejs/biome`, `husky`, `snyk`) remains in `devDependencies`.

**Philosophy:** Everything built from scratch for learning and understanding.

**Tracking:** [`TODO.md`](TODO.md) — open work, done checklist, testing matrix.

### Migration Phases

1. **Phase 1 — Core SSG integration** — **done**
   - `core/` build pipeline, `.build/` output, `src/` layout without Eleventy underscore prefixes.

2. **Phase 2 — Template feature parity** — **done**
   - Liquid tags, expressions, filters, layouts, isolated `render`, shortcodes — see [`core/parser/liquid/README.md`](core/parser/liquid/README.md).
   - Markdown tokenizer/parser/renderer; `.md` posts and pages compile through [`core/parser/compile.ts`](core/parser/compile.ts).
   - Collections: load, sort, permalink expressions in [`core/data/collections.ts`](core/data/collections.ts); configured in [`site.config.ts`](site.config.ts).
   - **Out of scope:** syntax highlighting — legacy `{% highlight %}` tags in one or two old posts may warn and render unstyled; accepted.

3. **Phase 3 — Build tool replacements** — **largely done**
   - ~~HTML minification (prod)~~ — [`core/transforms/minify-html.ts`](core/transforms/minify-html.ts), wired via `artifactTransforms` in `site.config.ts`.
   - ~~CSS `@import` bundling~~ — [`core/transforms/css-imports.ts`](core/transforms/css-imports.ts), used by the CSS engine.
   - ~~CSS minification (prod)~~ — [`core/transforms/minify-css.ts`](core/transforms/minify-css.ts), wired via `artifactTransforms` in `site.config.ts`.
   - CSS autoprefixer — open (optional for modern-browser targets).
   - Syntax highlighting — out of scope (see Phase 2).
   - Asset bundling — not needed; client scripts use native ES modules via `passThroughCopy`.

4. **Phase 4 — Developer experience** — **partial**
   - ~~Dev server + live reload~~ — `npm start`: [`core/commands/serve.ts`](core/commands/serve.ts), [`core/server/`](core/server/), [`core/transforms/livereload.ts`](core/transforms/livereload.ts). Watcher debounces rebuilds on `src/` changes.
   - Livereload script injection on `.html` in dev via [`core/emitter/output.ts`](core/emitter/output.ts).
   - Error messages / source spans, build time reporting, integration tests — open.

5. **Phase 5 — Cleanup / cutover** — **done**
   - Eleventy, PostCSS toolchain, `html-minifier`, `cross-env` removed from `package.json`.
   - `eleventy.config.js` removed.
   - `npm run build` / `npm start` point at the custom SSG; [`statichost.yml`](statichost.yml) publishes `.build/` with `node:25.9.0`.

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
User: I want to update core/parser/compile.ts so it uses the new Liquid parser
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

These must remain stable across the Eleventy → custom SSG cutover:
- All Liquid template syntax in pages/posts/includes
- Frontmatter structure
- Data file loading (`src/data/` directory)
- Layout system
- URL structure (permalinks)
- RSS feed generation
- Asset copying (images, fonts, icons)

## Commands

```bash
npm run build          # Production build (NODE_ENV=production node core/index.ts → .build/)
npm start              # Dev: rebuild on change + serve .build/ (node --watch --env-file=.env core/index.ts --serve)
npm run clean:build    # Remove `.build/`, `.tmp/`, and `_site/` (see scripts/clean-artifacts.ts)
npm run setup          # clean:build + lint
npm run lint           # Lint JS and CSS via Biome
npm run test:liquid    # Dev tool: parse test fixture, output AST + rendered HTML to .tmp/
npm test               # Run all tests (node --test)
node --test test/path/to/file.test.ts  # Run a single test file
```

## Architecture

### Directory Structure
```
src/                      # Source files (input root)
  data/                  # JSON/JS data (site.js, pkg.js, projects.json, …)
  includes/              # Partials (`.liquid`, `.html`; not emitted)
  layouts/               # Layout templates (not emitted)
  posts/                 # Blog posts as `.md` (collection input; not emitted as source paths)
  pages/                 # Public pages (home, resume, writes, rss, …)
  assets/                # Static resources (images, icons, fonts, …)
  css/                   # Stylesheets (globals/, layout/, components/)
  scripts/               # Client JavaScript
.build/                  # SSG output (git-ignored; deployed to statichost.eu)
.tmp/                    # Debug dumps (AST, data.json when DEBUG=true)
_site/                   # Legacy Eleventy output path (still cleaned by clean:build; git-ignored)
site.config.ts           # User config: collections, filters, shortcodes, transforms, passthrough
core/
  index.ts               # CLI entry: build; --serve delegates to commands/serve
  commands/
    build.ts             # load data → walk src → engines → atomic swap to .build/
    serve.ts             # HTTP server + watcher + livereload lifecycle
  config.core.ts         # System dirs, concurrency, reserved render keys (#config)
  config.user.ts         # UserConfig types + getUserConfig() loader (#config.user)
  data/
    index.ts             # loadDataFiles, writeDataFilesDump
    collections.ts       # loadCollection, getCollections, indexCollections, permalink URLs
    loader.ts            # loadFromDir, loadFromFile (.json, .js, .md)
  emitter/
    traverse.ts          # processFiles (engine dispatch, concurrency)
    output.ts            # writeBuildArtifact, emitStaticFile, artifactTransforms profiles
    passthrough.ts       # passThroughCopy routing
  engines/
    registry.ts          # site-template + css engines
    site-template.ts     # .liquid / .html / .xml / .md → compile()
    css.ts               # .css → bundleCssImports
  parser/
    compile.ts           # frontmatter → markdown? → liquid → layouts
    utils.ts             # Shared parser helpers
    frontmatter/         # YAML-like frontmatter subset
    liquid/              # Tokenizer, parser/, renderer, filters, resolver
      README.md          # Liquid feature matrix
    markdown/            # Tokenizer, parser, renderer (CommonMark-ish subset)
  server/
    index.ts             # Static server for .build/
    watcher.ts           # fs.watch on src/, debounced rebuild
  transforms/
    minify-html.ts       # Prod HTML minify (comment strip, whitespace collapse)
    minify-css.ts        # Prod CSS minify (whitespace collapse, comment strip)
    css-imports.ts       # Inline @import with layer/supports/media
    livereload.ts        # WebSocket reload + script injection helper
  utils/                 # fs, json, log, mime-types, object, path, url, html
test/
  parser/                # liquid, frontmatter, filters, utils
  fixtures/liquid/       # Manual liquid fixture runner (test:liquid)
  utils/
```

### Global data (`loadDataFiles`)

[`core/data/index.ts`](core/data/index.ts) builds the global data map used at render time:

1. **Directory data** — JSON/JS files under `src/data/` (via `loadFromDir`; keys are filenames without extension).
2. **Custom file map** — Optional `customDataMapping` in [`site.config.ts`](site.config.ts) (types in [`core/config.user.ts`](core/config.user.ts)). Each key names a data entry; the value is either a path string to a JSON file or `{ path, includeFields }` for top-level field picks.
3. **Collections** — When configured in `site.config.ts` `collections`, entries are loaded by [`core/data/collections.ts`](core/data/collections.ts) and stored under the `collections` key (e.g. `collections.posts`).

`src/data/pkg.js` imports `package.json` and exposes `version` / `author` as global `pkg` without `customDataMapping`.

### Eleventy features vs custom SSG

| Feature | Custom SSG status |
| ------- | ----------------- |
| Liquid templates, layouts, `render` | Done — [`core/parser/liquid/README.md`](core/parser/liquid/README.md) |
| Markdown posts | Done — markdown → HTML, then Liquid + layouts |
| Collections (`posts`, sort, permalinks) | Done — `site.config.ts` + `collections.ts` |
| Filters (`encodeXML`, date presets) | Done — user + built-in filters |
| Shortcodes (`currentYear`) | Done |
| Passthrough (assets, scripts) | Done — `passThroughCopy` |
| HTML minification (prod) | Done — `minifyHtml` via `artifactTransforms` |
| CSS `@import` | Done — `bundleCssImports` |
| CSS minification (prod) | Done — `minifyCss` via `artifactTransforms` |
| CSS autoprefixer | Open (optional) |
| Syntax highlighting | Out of scope — legacy `{% highlight %}` in ~2 posts; plain code is acceptable |
| Asset bundling | Not needed — native ES modules via passthrough copy |

### Template System (Current Behavior)

**Variable Resolution**
- Syntax: `{{identifier.path.to.value}}`
- Sources: `src/data/` files, optional `customDataMapping`, `collections`, page frontmatter
- Example: `{{site.title}}` → `src/data/site.js` → `title`

**Layout System**
- Defined in frontmatter: `layout: default`
- Layouts in `src/layouts/`, resolved by `layoutResolver` in `core/parser/liquid/resolver.ts`
- Nested chains via each layout's frontmatter `layout` key; content injection via `{{ content }}`
- Layout wrapping in `compile()` ([`core/parser/compile.ts`](core/parser/compile.ts)) after the page body is rendered

**Shortcodes**
- Registry: `shortCodes` in [`site.config.ts`](site.config.ts)
- Syntax: `{% name %}` — single identifier not matching a built-in keyword
- Unknown shortcodes throw at render time

**Markdown**
- `.md` files: frontmatter stripped, body parsed by `core/parser/markdown/`, rendered to HTML, then processed as Liquid
- Fenced code blocks emit `<pre><code class="language-…">` without syntax highlighting classes beyond the language name

**Liquid Features**

Full tag/filter/operator matrix: [`core/parser/liquid/README.md`](core/parser/liquid/README.md).

**Render Scope: Follows Liquid Spec (Isolated)**

The renderer uses true Liquid `render` semantics: each rendered include gets a fully
isolated scope containing only the variables explicitly passed at the call site.
The renderer cache stores parsed ASTs (Template), not rendered output, so the same
include can be rendered multiple times with different variables.

Layouts pass explicit variables into partials that need them: [`src/layouts/default.liquid`](src/layouts/default.liquid) passes flattened names into `page-footer`; [`src/layouts/meta.liquid`](src/layouts/meta.liquid) passes objects into `meta-head` and version/timestamp into `page-scripts`. `menu` receives `title` (and `location`) from callers.

Partials such as `logo`, `page-top-left-bg`, `iconset`, `world`, and `article-outdated-warning` use only static markup or variables supplied at the `{% render %}` call site. Any new include must follow the same rule: under isolated `render`, only passed bindings and literals are in scope.

Global data keys such as `pkg` and `site` come from `src/data/`; they are not visible inside a `render` partial unless the parent template passes them (or passes derived flat fields).

### Import Aliases
```json
"imports": {
  "#commands/*": "./core/commands/*",
  "#config": "./core/config.core.ts",
  "#config.user": "./core/config.user.ts",
  "#core/*": "./core/*",
  "#data/*": "./core/data/*",
  "#emitter/*": "./core/emitter/*",
  "#engines/*": "./core/engines/*",
  "#parser/*": "./core/parser/*",
  "#server/*": "./core/server/*",
  "#transforms/*": "./core/transforms/*",
  "#utils/*": "./core/utils/*"
}
```
(From [`package.json`](package.json); keep in sync when adding aliases.)

User-facing config lives in [`site.config.ts`](site.config.ts) at the repo root; [`getUserConfig()`](core/config.user.ts) loads it at build time.

## Code Standards

### Critical Rules
- **No third-party build dependencies:** The SSG under `core/` uses only Node built-ins. Dev tooling (`@biomejs/biome`, `husky`, `snyk`) is allowed in `devDependencies`.
- **ES modules only**: Use native `import`/`export`
- **Semicolons**: Biome uses `"semicolons": "asNeeded"` (omit where ASI is safe; project style leans minimal)
- **Tabs for indentation**: Configured in biome.json
- **Single quotes for strings**: Configured in biome.json
- **Latest Node.js APIs**: Use modern native features
- **Node.js 25.9.0**: Pinned via `.nvmrc`
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
- **Phase-aware**: Migration cutover is done; remaining work is polish and optional build quality (see [`TODO.md`](TODO.md))
- **Test as you go**: Verify each feature works before moving to next
- **Preserve behavior**: URL structure, RSS, and rendered output must stay stable
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

Historical checklist used during the Eleventy cutover; apply the same rigour before removing or replacing any future build dependency:

### Before Removing Dependencies
1. Ensure replacement feature has full parity
2. Test with production build
3. Verify visual output matches
4. Check browser compatibility
5. Document what was replaced and how

### CSS processing (custom SSG)
- `@import` inlining — [`core/transforms/css-imports.ts`](core/transforms/css-imports.ts)
- Minification (prod) — [`core/transforms/minify-css.ts`](core/transforms/minify-css.ts) via `artifactTransforms` in [`site.config.ts`](site.config.ts)
- Autoprefixer — not implemented; optional for modern-browser targets

### HTML minification (custom SSG)
- Implemented in [`core/transforms/minify-html.ts`](core/transforms/minify-html.ts) — protects `<script>`, `<style>`, `<pre>`, `<textarea>` blocks; strips comments and collapses whitespace
- Applied only when `prodMode` / `artifactTransforms` prod profile runs ([`core/emitter/output.ts`](core/emitter/output.ts))

### Syntax highlighting
- **Not planned.** One or two legacy posts use `{% highlight lang %}` … `{% endhighlight %}` (Jekyll/Eleventy style); the custom SSG warns `Unknown tag: highlight` and those blocks render without styling — accepted.
- Markdown fenced blocks emit `<pre><code class="language-…">` with escaped content only (no token classes).

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
- `site.js` and `pkg.js` use default export (not JSON)
- Some JSON files are large (instagram.json ~25KB)
- Loader supports `.json`, `.js`, and `.md` in data directories

### Pages and posts
- Pages: `.liquid` under `src/pages/` (each route typically `index.liquid`)
- Posts: `.md` under `src/posts/`; compiled via the `posts` collection in `site.config.ts`
- Permalinks from frontmatter or collection `permalink` pattern control output URLs

### Build Output
- SSG outputs to `.build/` (`directories.output` in [`core/config.core.ts`](core/config.core.ts))
- statichost.eu deploys `.build/` (see [`statichost.yml`](statichost.yml))
- `.tmp/` used for debug output (AST dumps, rendered HTML) during development
- `_site/` is a legacy path still removed by `clean:build`; no longer produced

### Content
- Blog posts date back to 2015
- All use markdown with frontmatter
- URLs must remain stable (SEO)
- RSS feed must validate

## Dependencies

### Build (SSG)
- None — `core/` uses only Node built-ins

### Development tooling (`devDependencies`)
- `@biomejs/biome` — linting
- `@types/node` — TypeScript definitions for editors
- `husky` — git hooks (version bump on commit)
- `snyk` — security scanning

## Deployment

- Hosted on [statichost.eu](https://statichost.eu)
- [`statichost.yml`](statichost.yml): `image: node:25.9.0`, `command: npm install && npm run build`, `public: .build`
- Automatic builds on git push
- Requires Node ≥ 22.18 (native TypeScript execution); pinned to `25.9.0` to match [`.nvmrc`](.nvmrc)
