# Zero-Dependency SSG Migration TODO

Project plan for migrating to a custom SSG with zero third-party dependencies (except @types/node).

**Status:** Done | In progress | Not started | Blocked

## Table of Contents

1. [Template System](#1-template-system)
2. [HTML Processing](#2-html-processing)
3. [CSS Processing](#3-css-processing)
4. [Syntax Highlighting](#4-syntax-highlighting)
5. [Build System](#5-build-system)
6. [Migration Tasks](#6-migration-tasks)
7. [Code Quality & Architecture](#7-code-quality--architecture)
8. [Component Dependency Tree](#component-dependency-tree)
9. [Build Order Recommendation](#build-order-recommendation)

---

## 1. Template System

**Documentation:** `[core/parser/README.md](core/parser/README.md)`

### 1.1 Liquid Parser — Done

### 1.2 Frontmatter Parser


| Feature                                                                                       | Status      |
| --------------------------------------------------------------------------------------------- | ----------- |
| Delimited frontmatter (`---` … `---`), flat keys, YAML-style comments (`#`)                   | Done        |
| Indented blocks: nested maps (e.g. `external:` with child keys), list-style arrays (`- item`) | In progress |
| Full YAML 1.x spec compliance                                                                 | Not started |
| Parity with Eleventy / gray-matter for every edge case in `_posts/*.md`                       | In progress |


**Remaining gaps:** `parseFrontmatter` in `core/parser/frontmatter/parser.ts` is a custom YAML-like subset (indent walks, list vs map blocks), not a full YAML implementation. Validate remaining posts against the Eleventy build; extend the parser or document unsupported syntax as needed.

### 1.3 Markdown Parser


| Feature                       | Status      |
| ----------------------------- | ----------- |
| Tokenizer (markdown → tokens) | Not started |
| Parser (tokens → AST)         | Not started |
| HTML renderer (AST → HTML)    | Not started |
| Integration with frontmatter  | Not started |


### 1.4 Filters — Done

### 1.5 Shortcodes — Done

### 1.6 Collections — Done

---

## 2. HTML Processing

### 2.1 HTML Parser

**Dependency for:** HTML Minifier


| Feature                       | Status      |
| ----------------------------- | ----------- |
| Tokenizer (raw HTML → tokens) | Not started |
| Parser (tokens → AST)         | Not started |
| AST traversal utilities       | Not started |


### 2.2 HTML Minifier

From `eleventy.config.js` (production only). **Requires:** HTML Parser


| Feature                         | Status      |
| ------------------------------- | ----------- |
| Comment removal                 | Not started |
| Whitespace collapsing           | Not started |
| Production-mode only flag check | Not started |
| Only process `.html` files      | Not started |


---

## 3. CSS Processing

### 3.1 CSS Parser

**Shared dependency for:** @import resolver, minifier, autoprefixer


| Feature                       | Status      |
| ----------------------------- | ----------- |
| Tokenizer (CSS text → tokens) | Not started |
| Parser (tokens → AST)         | Not started |
| AST traversal utilities       | Not started |


### 3.2 CSS @import Resolver

From `eleventy.config.js` (via `postcss-import`). **Requires:** CSS Parser


| Feature                                  | Status      |
| ---------------------------------------- | ----------- |
| File path resolution (relative/absolute) | Not started |
| Import inlining (recursive)              | Not started |
| Circular dependency detection            | Not started |
| Integration with build pipeline          | Not started |


### 3.3 CSS Minifier

From `eleventy.config.js` (via `cssnano`). **Requires:** CSS Parser


| Feature                                      | Status      |
| -------------------------------------------- | ----------- |
| Whitespace removal                           | Not started |
| Comment removal                              | Not started |
| Property optimization (shorthand conversion) | Not started |
| Production-mode only                         | Not started |


### 3.4 CSS Autoprefixer

From `eleventy.config.js` (via `autoprefixer`). **Requires:** CSS Parser. **Note:** May not be needed if targeting modern browsers only.


| Feature                                              | Status      |
| ---------------------------------------------------- | ----------- |
| Browser compatibility rules                          | Not started |
| Property detection (flexbox, grid, transforms, etc.) | Not started |
| Vendor prefix injection (-webkit-, -moz-, -ms-)      | Not started |


---

## 4. Syntax Highlighting

**Replaces:** `@11ty/eleventy-plugin-syntaxhighlight`

### 4.1 Code Block Detector


| Feature                                | Status      |
| -------------------------------------- | ----------- |
| Markdown fence detection (```language) | Not started |
| Language attribute extraction          | Not started |
| Integration with markdown parser       | Not started |


### 4.2 Syntax Highlighter


| Feature                                               | Status      |
| ----------------------------------------------------- | ----------- |
| Token classification (keyword, string, comment, etc.) | Not started |
| HTML generator with class names                       | Not started |
| Language detection/fallback                           | Not started |
| Pre-attributes support (tabindex, data-language)      | Not started |


### 4.3 Language Grammars

Tokenizer per language:


| Language              | Status      |
| --------------------- | ----------- |
| JavaScript/TypeScript | Not started |
| CSS                   | Not started |
| HTML                  | Not started |
| Markdown              | Not started |
| Shell/Bash            | Not started |
| JSON                  | Not started |
| Others                | Not started |


---

## 5. Build System

### 5.1 Core Build Pipeline — Done

### 5.2 File Watcher — Done (SSG `src/`)

Phase 4 - Developer Experience. **`npm run start:ssg`** uses **`node --watch`** on the entry file so edits under **`core/`** (the loaded module graph) restart the whole process; **`src/`** changes are handled in-process (see below).


| Feature                                       | Status                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| File system monitoring (`src/`, recursive)   | Done — [`core/server/watcher.ts`](core/server/watcher.ts)              |
| Debounced change detection                    | Done — 150 ms debounce before scheduling a rebuild                       |
| Serialized / coalesced rebuilds             | Done — `schedule()` runs at most one build at a time; `shouldRunAgain` |
| Rebuild + livereload broadcast                | Done — wired from [`core/index.ts`](core/index.ts)                     |
| Watch targets outside `src/` (e.g. PostCSS) | Not started — site CSS still uses separate `watch:css` / Eleventy flow |


### 5.3 Dev Server — Done (static + livereload)

Phase 4 - Developer Experience


| Feature                                      | Status                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP server (static files from build output) | Done — [`core/server/index.ts`](core/server/index.ts)                                                                                       |
| File serving                                 | Done — `Content-Length` + `res.end(body)`                                                                                                     |
| Error page handling                          | In progress — serves `404.html` when present, else plain 404                                                                                  |
| WebSocket upgrade (`/__livereload`)          | Done — [`core/server/livereload.ts`](core/server/livereload.ts) (`handleWSUpgrade`, RFC 6455 accept, `broadcastReload` text frames)            |
| HTML injection (dev pages + posts)           | Done when `userConfig.debugMode` — [`core/emitter/traverse.ts`](core/emitter/traverse.ts), [`core/emitter/posts.ts`](core/emitter/posts.ts); set `DEBUG=true` in `.env` |
| FS watcher shutdown on SIGINT                | Done — [`core/index.ts`](core/index.ts) calls `watcher?.stop()`                                                                               |


### 5.4 Asset Management

From `eleventy.config.js`:


| Feature                                                  | Status      |
| -------------------------------------------------------- | ----------- |
| Passthrough copy for `assets/`, `scripts/`, `_redirects` | Done        |
| Directory structure preservation                         | Done        |
| Asset bundling                                           | Not started |


---

## 6. Migration Tasks

### 6.1 Template Updates — Done

### 6.2 Directory Name Resolution

**Issue:** `src/_includes/` vs `directories.internal.includes` (`'includes'`) in `[core/config.core.ts](core/config.core.ts)`


| Task                                                                                | Status      |
| ----------------------------------------------------------------------------------- | ----------- |
| Decide: rename `src/_includes/` → `src/includes/` OR update config to `'_includes'` | Not started |
| Update resolver if needed                                                           | Not started |
| Verify test fixtures match                                                          | Not started |


### 6.3 Dependency Removal

**Phase 5 - Cleanup** (only after full feature parity)


| Task                                              | Status  |
| ------------------------------------------------- | ------- |
| Remove `@11ty/eleventy` and plugins               | Blocked |
| Remove `postcss`, `postcss-cli`, `postcss-import` | Blocked |
| Remove `autoprefixer`, `cssnano`                  | Blocked |
| Remove `html-minifier`                            | Blocked |
| Remove `cross-env`                                | Blocked |
| Update package.json scripts                       | Blocked |
| Archive `eleventy.config.js` for reference        | Blocked |


### 6.4 Build output parity (`_site` vs `.build`)

Append a row when you re-run the comparison (`find _site -type f | wc -l` and `find .build -type f | wc -l`).


| Date       | `_site` files | `.build` files | Notes                                                                                                                                                                                   |
| ---------- | ------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-30 | ~95           | ~88            | Same passthrough assets (fonts, images, certifications, favicon, CSS tree, top-level pages, `feed.xml`, `humans.txt`)                                                                   |
| 2026-04-13 | 95            | 90             | `_site` built from `343c380` (last Eleventy-compatible commit). Gap is 5 external post pages. Script path resolved. Eleventy build broken on current HEAD (render syntax incompatible). |


Gaps:


| Gap                                     | Notes                                                                                                                                                                                                                                                                                           | Status      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| External post pages (5 files)           | SSG skips posts with `external:` frontmatter (`core/emitter/posts.ts:27`). Eleventy generates a local page for each. All five are 2016 guest articles on SitePoint. Decide: emit a redirect/stub page, or skip intentionally.                                                                   | Not started |
| HTML minification                       | `.build` output is unminified (e.g. `index.html`: 785 lines / 35 KB vs Eleventy's single-line / 32 KB). Phase 3 task.                                                                                                                                                                           | Not started |
| Eleventy build broken on current source | Render syntax change in `759bfd3` (`{% render world.html %}` → `{% render "world.html" %}`) is incompatible with Eleventy's LiquidJS. Expected during migration — future comparisons require building Eleventy from a prior commit or the comparison becomes obsolete once migration completes. | Expected    |
| Script output path                      | `_site` exposes JS at `assets/scripts/*.js`. `.build` writes `scripts/*.js` at the output root — templates and passthrough must agree so `src` in HTML matches deployment                                                                                                                       | Done        |
| Individual post HTML (non-external)     | `_site` has one page per post under `writes/:year/:slug/index.html`. `.build` now emits the two 2015 posts correctly. Only the five external posts differ (see row above).                                                                                                                      | Done        |


---

## 7. Code Quality & Architecture

### 7.1 Architecture: Split `compile()` into a pipeline

`core/parser/index.ts` — `compile()` handles frontmatter extraction, output path resolution, context creation, Liquid parsing, rendering, and layout resolution in one function. Before adding markdown or HTML minification (Phase 3), decompose into composable pipeline steps so new processing stages can be inserted without growing the function further.


| Task                                        | Status      | File                                               |
| ------------------------------------------- | ----------- | -------------------------------------------------- |
| Extract frontmatter step                    | Done        | `core/parser/index.ts:86` — `extractFrontmatter()` |
| Extract output path resolution step         | Done        | `core/utils/path.ts` — `resolveOutput()`           |
| Extract context creation step               | Done        | `core/parser/index.ts:37` — `createPageContext()`  |
| Extract layout resolution into its own step | Done        | `core/parser/index.ts:65` — `applyLayouts()`       |
| Define shared pipeline state type           | Not started | `core/parser/index.ts`                             |


### 7.2 Architecture: Separate file discovery from processing in `traverseDir` — Done

### 7.3 Type Safety: Remove `as` casts where narrowing suffices

The parser uses `as TokenIdent` / `as TokenKeyword` casts *before* the runtime type check on the next line. If the value is `undefined`, the cast silently lies. Check first, then the type is narrowed automatically.


| Task                                       | Status      | File                                                         |
| ------------------------------------------ | ----------- | ------------------------------------------------------------ |
| `variable` cast in `parseIterationHeader`  | Done        | `core/parser/liquid/parser.ts:542` — narrowed via type check |
| `inKeyword` cast in `parseIterationHeader` | Done        | `core/parser/liquid/parser.ts:553` — narrowed via type check |
| `nameToken` cast in `capture` branch       | Not started | `core/parser/liquid/parser.ts`                               |
| `params` cast in for-loop param parsing    | Not started | `core/parser/liquid/parser.ts`                               |
| `param` cast in tablerow param parsing     | Not started | `core/parser/liquid/parser.ts`                               |


### 7.4 Type Safety: Narrow catch-block errors — Done

### 7.5 Type Safety: Replace `as Record<string, unknown>` casts in data loader

`loadFromDir` and `loadFromFile` cast `readOrImport` results with `as Record<string, unknown>`. Add a type guard (`isRecord`) so malformed data (arrays, primitives) is caught instead of silently accepted.


| Task                      | Status      | File                     |
| ------------------------- | ----------- | ------------------------ |
| Add `isRecord` type guard | Not started | `core/data/loader.ts`    |
| Apply in `loadFromDir`    | Not started | `core/data/loader.ts:54` |
| Apply in `loadFromFile`   | Not started | `core/data/loader.ts:67` |


### 7.6 Robustness: Validate `parseFilename` date parts

`core/data/posts.ts:30` — `parseFilename` splits the filename and maps to `Number`. If a filename doesn't follow `YYYY-MM-DD-slug`, the date parts are `NaN` and `new Date(NaN, NaN, NaN)` silently propagates an Invalid Date.


| Task                                         | Status      | File                    |
| -------------------------------------------- | ----------- | ----------------------- |
| Add `NaN` guard after parsing year/month/day | Not started | `core/data/posts.ts:31` |


### 7.7 Performance: Optimise for-loop param application order — Done


### 7.8 Test Coverage: Add tests for untested modules

The parser and utility modules are well covered. The integration layer (build, traverse, data, posts) has no dedicated tests.


| Module                                              | Risk   | Status      |
| --------------------------------------------------- | ------ | ----------- |
| `core/data/posts.ts` (date parsing, URL generation) | Medium | Not started |
| `core/data/loader.ts` (file loading, error paths)   | Medium | Not started |
| `core/data/index.ts` (data merging, `pickValues`)   | Medium | Not started |
| `core/emitter/traverse.ts` (file processing)        | High   | Not started |
| `core/emitter/posts.ts` (post compilation)          | Medium | Not started |
| `core/server/index.ts` (request handling, 404, upgrade) | Medium | Not started |
| `core/server/livereload.ts` (WS handshake, broadcast) | Medium | Not started |
| `core/server/watcher.ts` (debounce, coalesced queue)  | Low    | Not started |


---

## Component Dependency Tree

```
HTML Minifier
└── HTML Parser
    ├── Tokenizer
    └── Parser

CSS Processing
├── CSS @import Resolver (most critical)
│   └── CSS Parser
├── CSS Minifier
│   └── CSS Parser
└── CSS Autoprefixer (optional)
    └── CSS Parser

CSS Parser (shared - build first)
├── Tokenizer
└── Parser

Template Features
├── Filters (4 built-in + user registry) — Done
├── Shortcodes (registration + resolver) — Done
└── Collections (`collections.posts` wired; per-post HTML via `core/emitter/posts.ts` — collection sort not in loader yet; permalink pattern parsing partial — see `core/data/posts.ts`)

Syntax Highlighting
├── Code Block Detector
└── Syntax Highlighter
    ├── Language Grammars
    └── HTML Generator

Markdown Processing
└── Markdown Parser
    ├── Tokenizer
    ├── Parser
    └── HTML Renderer

Dev (SSG — `start:ssg`)
├── `core/index.ts` (`--serve`: server + watcher + broadcast)
├── `core/server/index.ts` (static HTTP, `upgrade` → livereload)
├── `core/server/watcher.ts` (`src/` fs.watch, debounce, coalesced rebuild queue)
└── `core/server/livereload.ts` (inject script when `debugMode`, WS clients, `broadcastReload`)
```

