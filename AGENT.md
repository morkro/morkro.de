# AGENT.md

This file provides guidance to AI coding assistants when working with this repository.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) built with a custom static site generator in `core/`. No-dependency build philosophy: the SSG is built from scratch using native Node.js APIs, for learning and understanding the internals.

- **Production build:** `core/` outputs to `.build/`; statichost.eu deploys that directory.
- **Tracking:** [`TODO.md`](TODO.md) — open work, done checklist, testing matrix.

## Boundaries

- **No third-party build dependencies.** The SSG under `core/` uses only Node built-ins. Dev tooling (`@biomejs/biome`, `husky`, `snyk`, `@types/node`) is allowed in `devDependencies`.
- **Keep stable** (SEO / feeds depend on it): URL structure (permalinks), RSS feed output, frontmatter structure, and Liquid template syntax.
- **Blog posts date back to 2015** — all markdown with frontmatter; don't break old URLs.

## Agent Role: Coach by Default

**Default to coach mode:** read-only exploration, explanation, `file:line` pointers, and code examples **in the chat only**. Do not use Edit/Write to modify the repo unless the user explicitly opts in.

- **Opt-in (may edit):** clear requests to write, implement, apply, or edit in the repo — e.g. "implement this", "apply the fix", "edit `path/to/file.ts`", "add this file for me", "update `AGENT.md` to…".
- **Not opt-in (stay in coach mode):** goal-only or ambiguous phrasing ("I want to…", "we should…", "refactor…", "can you add…"), and pasting a stack trace / saying the build or tests fail. Diagnosis and proposed patches stay in chat.
- **If unclear:** ask one short question — changes applied in the repo, or guidance only? Don't edit on a guess.

When teaching, walk through the "why": ask clarifying questions, break changes into steps, point out trade-offs and pitfalls, and guide toward the solution rather than just handing it over.

```
Bad:  User: "Add a date formatter."   → Agent writes the file. (No opt-in.)
Good: User: "Add a date formatter."   → Agent asks about format/location/edge
      cases, shows example code in chat, points to core/utils/date.ts.
```

## Commands

```bash
npm run build          # Production build (NODE_ENV=production node core/index.ts → .build/)
npm start              # Dev: rebuild on change + serve .build/ (node --watch --env-file=.env core/index.ts --serve)
npm run clean:build    # Remove `.build/` and `.tmp/` (see scripts/clean-artifacts.ts)
npm run setup          # clean:build + lint
npm run lint           # Lint JS and CSS via Biome
npm run test:liquid    # Dev tool: parse test fixture, output AST + rendered HTML to .tmp/
npm test               # Run all tests (node --test)
node --test test/path/to/file.test.ts  # Run a single test file
```

## Git Workflow

- Always create a branch from `main` for any work — never commit directly to `main`.
- Branch prefixes: `feat/`, `fix/`, `chore/`.

## Architecture

### Directory Structure
```
src/                     # Website source files (input root)
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
      README.md          # Liquid feature matrix + render-scope semantics
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

[`core/data/index.ts`](core/data/index.ts) composes the render-time data map from three sources:

1. **Directory data** — JSON/JS files under `src/data/`, keyed by filename (`site.js` → `site`).
2. **Custom map** — `customDataMapping` in [`site.config.ts`](site.config.ts): a path string, or `{ path, includeFields }` to pick top-level fields.
3. **Collections** — configured in `site.config.ts`, nested under `collections.*` (e.g. `collections.posts`).

`userConfig.baseUrl` overrides `site.url` at load time.

### Template system

- **Variables:** `{{path.to.value}}` from `src/data/`, `customDataMapping`, `collections`, frontmatter (e.g. `{{site.title}}` → `src/data/site.js`).
- **Layouts:** `layout: default` in frontmatter → `src/layouts/`, resolved by `layoutResolver` ([`core/parser/liquid/resolver.ts`](core/parser/liquid/resolver.ts)); nested via each layout's `layout` key, content injected via `{{ content }}`, wrapped in `compile()`.
- **Shortcodes:** `{% name %}` from `shortCodes` in [`site.config.ts`](site.config.ts); unknown ones throw at render time.
- **Markdown:** `.md` → frontmatter stripped → `core/parser/markdown/` → HTML → Liquid. Fenced blocks emit `<pre><code class="language-…">` (no highlight classes).
- **Render scope:** `render` is isolated — an include sees only variables passed at the call site (plus literals); globals like `pkg`/`site` must be passed by the parent. Full tag/filter matrix: [`core/parser/liquid/README.md`](core/parser/liquid/README.md).

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

## Code Standards

- **ES modules only**, native `import`/`export`.
- **TypeScript entrypoints:** no `tsconfig.json`; `node` runs `.ts` files directly (native type stripping). Editors infer types from `@types/node`. Node pinned to `25.9.0` via `.nvmrc` (requires ≥ 22.18).
- **Formatting (Biome):** tabs for indentation, single quotes, `semicolons: asNeeded`.
- **Types:** avoid `any`, prefer `unknown`; `import type` for type-only imports; custom types for complex structures.
- **Naming:** PascalCase (classes), camelCase (variables/functions), kebab-case (files).
- **Functions:** descriptive verb+noun names; arrow functions for simple operations; default params and object destructuring.

```ts
// style at a glance
import type { UserConfig } from '#config.user'

const buildArtifact = async (path: string, { minify = true } = {}) => {
	const html = await render(path)
	return minify ? minifyHtml(html) : html
}
```

### Testing
- `node:test` framework; import assertions from `node:assert`.
- Test files mirror source: e.g. `test/parser/liquid.test.ts`.
- Organize with `describe()` and `it()`.

## Communication Style

- No apologies or "you're right" filler; no summaries of changes made.
- Provide file links with line numbers (`file:line`).
- Make changes file-by-file; don't remove unrelated code.
- Update [`TODO.md`](TODO.md) status when completing components.

## Special Considerations

- **Data files:** `site.js` and `pkg.js` use default export (not JSON). Some JSON files are large (`instagram.json` ~25KB). Loader supports `.json`, `.js`, `.md`.
- **Pages/posts:** pages are `.liquid` under `src/pages/` (route usually `index.liquid`); posts are `.md` under `src/posts/`, compiled via the `posts` collection. Permalinks (frontmatter or collection pattern) control output URLs.
- **Build output:** `.build/` (`directories.output` in [`core/config.core.ts`](core/config.core.ts)); `.tmp/` for debug dumps.

## Versioning

Custom format `Year.Month.Commits.Type` — types `M1` (Major), `M2` (Minor), `P0` (Patch). Example: `26.04.59.M2` (see `version` in [`package.json`](package.json)). Bumped via husky git hook on commit.

## Deployment

- Hosted on [statichost.eu](https://statichost.eu); config in [`statichost.yml`](statichost.yml) (`image: node:25.9.0`, `command: npm install && npm run build`, `public: .build`).
- Automatic builds on git push.
