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

**Documentation:** [`core/parser/README.md`](core/parser/README.md)

### 1.1 Liquid Parser

| Feature | Status |
| ------- | ------ |
| Tokenizer (raw text → tokens) | Done |
| Parser (tokens → AST) | Done |
| Renderer (AST → HTML) | Done |
| Template file resolver for includes | Done |
| Control flow (if/elsif/else, unless, case/when) | Done |
| Iteration (for/endfor with forloop, limit, offset, reversed) | Done |
| Variables (assign, capture, dot-notation access) | Done |
| Partials (render tag with variable passing) | Done |
| Comments (inline #, comment/endcomment) | Done |
| Raw blocks (raw/endraw) | Done |
| Filters (pipe chains in output and assign) | Not started |
| Whitespace control (`{{-`, `-}}`, `{%-`, `-%}`) | Not started |
| Variable tags (increment/decrement, echo) | Done |
| Iteration tags (cycle, tablerow/endtablerow with cols/limit/offset, tablerowloop) | Done |

### 1.2 Frontmatter Parser

| Feature | Status |
| ------- | ------ |
| Delimited frontmatter (`---` … `---`), flat keys, YAML-style comments (`#`) | Done |
| Indented blocks: nested maps (e.g. `external:` with child keys), list-style arrays (`- item`) | In progress |
| Full YAML 1.x spec compliance | Not started |
| Parity with Eleventy / gray-matter for every edge case in `_posts/*.md` | In progress |

**Remaining gaps:** `parseFrontmatter` in `core/parser/frontmatter/parser.ts` is a custom YAML-like subset (indent walks, list vs map blocks), not a full YAML implementation. Validate remaining posts against the Eleventy build; extend the parser or document unsupported syntax as needed.

### 1.3 Markdown Parser

| Feature | Status |
| ------- | ------ |
| Tokenizer (markdown → tokens) | Not started |
| Parser (tokens → AST) | Not started |
| HTML renderer (AST → HTML) | Not started |
| Integration with frontmatter | Not started |

### 1.4 Filters

Required filters from `eleventy.config.js`:

| Filter | Status | Purpose |
| ------ | ------ | ------- |
| `dateToRFC3339` | Not started | Date to RFC3339 string |
| `encodeXML` | Not started | XML entity escaping |
| `join` | Not started | Array joining |
| `replace` | Not started | String replacement |
| `prepend` | Not started | String prefixing |
| `date` | Not started | strftime-style formatting |

### 1.5 Shortcodes — Done

### 1.6 Collections

From `eleventy.config.js`:

| Feature | Status |
| ------- | ------ |
| Discover files under `_posts/` (via data loader) | Done |
| Metadata extraction from frontmatter | Done |
| Sorting by date (newest first, when configured) | Done |
| Registration in global data (`collections.posts` from `loadDataFiles()`) | Done |
| Access via `collections.posts` in Liquid | Done |
| Permalink URL from pattern (full Liquid/date filter semantics) | In progress — see TODOs in `core/data/posts.ts` |
| Per-post output pages matching Eleventy permalinks | Done (non-external posts, see section 6.4) |

---

## 2. HTML Processing

### 2.1 HTML Parser

**Dependency for:** HTML Minifier

| Feature | Status |
| ------- | ------ |
| Tokenizer (raw HTML → tokens) | Not started |
| Parser (tokens → AST) | Not started |
| AST traversal utilities | Not started |

### 2.2 HTML Minifier

From `eleventy.config.js` (production only). **Requires:** HTML Parser

| Feature | Status |
| ------- | ------ |
| Comment removal | Not started |
| Whitespace collapsing | Not started |
| Production-mode only flag check | Not started |
| Only process `.html` files | Not started |

---

## 3. CSS Processing

### 3.1 CSS Parser

**Shared dependency for:** @import resolver, minifier, autoprefixer

| Feature | Status |
| ------- | ------ |
| Tokenizer (CSS text → tokens) | Not started |
| Parser (tokens → AST) | Not started |
| AST traversal utilities | Not started |

### 3.2 CSS @import Resolver

From `eleventy.config.js` (via `postcss-import`). **Requires:** CSS Parser

| Feature | Status |
| ------- | ------ |
| File path resolution (relative/absolute) | Not started |
| Import inlining (recursive) | Not started |
| Circular dependency detection | Not started |
| Integration with build pipeline | Not started |

### 3.3 CSS Minifier

From `eleventy.config.js` (via `cssnano`). **Requires:** CSS Parser

| Feature | Status |
| ------- | ------ |
| Whitespace removal | Not started |
| Comment removal | Not started |
| Property optimization (shorthand conversion) | Not started |
| Production-mode only | Not started |

### 3.4 CSS Autoprefixer

From `eleventy.config.js` (via `autoprefixer`). **Requires:** CSS Parser. **Note:** May not be needed if targeting modern browsers only.

| Feature | Status |
| ------- | ------ |
| Browser compatibility rules | Not started |
| Property detection (flexbox, grid, transforms, etc.) | Not started |
| Vendor prefix injection (-webkit-, -moz-, -ms-) | Not started |

---

## 4. Syntax Highlighting

**Replaces:** `@11ty/eleventy-plugin-syntaxhighlight`

### 4.1 Code Block Detector

| Feature | Status |
| ------- | ------ |
| Markdown fence detection (```language) | Not started |
| Language attribute extraction | Not started |
| Integration with markdown parser | Not started |

### 4.2 Syntax Highlighter

| Feature | Status |
| ------- | ------ |
| Token classification (keyword, string, comment, etc.) | Not started |
| HTML generator with class names | Not started |
| Language detection/fallback | Not started |
| Pre-attributes support (tabindex, data-language) | Not started |

### 4.3 Language Grammars

Tokenizer per language:

| Language | Status |
| -------- | ------ |
| JavaScript/TypeScript | Not started |
| CSS | Not started |
| HTML | Not started |
| Markdown | Not started |
| Shell/Bash | Not started |
| JSON | Not started |
| Others | Not started |

---

## 5. Build System

### 5.1 Core Build Pipeline

**Documentation:** [`core/index.ts`](core/index.ts)

| Feature | Status |
| ------- | ------ |
| File discovery and processing | Done |
| Layout system | Done |
| Data file loading (`_data/` directory) | Done |
| Custom data mapping (`customDataMapping` in `config.user.ts`: path string, or `{ path, values }` to expose only listed top-level keys from a JSON file) | Done |
| Posts collection in global context (`collections.posts`) | Done |
| Permalink handling | Not started |
| Asset copying (passthrough) | Done |

### 5.2 File Watcher

Phase 4 - Developer Experience

| Feature | Status |
| ------- | ------ |
| File system monitoring | Not started |
| Change detection | Not started |
| Rebuild triggering | Not started |
| Watch targets (css/, scripts/) | Not started |

### 5.3 Dev Server

Phase 4 - Developer Experience

| Feature | Status |
| ------- | ------ |
| HTTP server (static files from build output) | Done — `core/server.ts` |
| File serving | Done |
| Error page handling | In progress — serves `404.html` when present, else plain 404 |
| Live reload/WebSocket | Not started |

### 5.4 Asset Management

From `eleventy.config.js`:

| Feature | Status |
| ------- | ------ |
| Passthrough copy for `assets/`, `scripts/`, `_redirects` | Done |
| Directory structure preservation | Done |
| Asset bundling | Not started |

---

## 6. Migration Tasks

### 6.1 Template Updates — Done

### 6.2 Directory Name Resolution

**Issue:** `src/_includes/` vs `config.DIRECTORIES.INTERNAL.INCLUDES = 'includes'`

| Task | Status |
| ---- | ------ |
| Decide: rename `src/_includes/` → `src/includes/` OR update config to `'_includes'` | Not started |
| Update resolver if needed | Not started |
| Verify test fixtures match | Not started |

### 6.3 Dependency Removal

**Phase 5 - Cleanup** (only after full feature parity)

| Task | Status |
| ---- | ------ |
| Remove `@11ty/eleventy` and plugins | Blocked |
| Remove `postcss`, `postcss-cli`, `postcss-import` | Blocked |
| Remove `autoprefixer`, `cssnano` | Blocked |
| Remove `html-minifier` | Blocked |
| Remove `cross-env` | Blocked |
| Update package.json scripts | Blocked |
| Archive `eleventy.config.js` for reference | Blocked |

### 6.4 Build output parity (`_site` vs `.build`)

Append a row when you re-run the comparison (`find _site -type f | wc -l` and `find .build -type f | wc -l`).

| Date | `_site` files | `.build` files | Notes |
| ---- | ------------- | -------------- | ----- |
| 2026-03-30 | ~95 | ~88 | Same passthrough assets (fonts, images, certifications, favicon, CSS tree, top-level pages, `feed.xml`, `humans.txt`) |
| 2026-04-13 | 95 | 90 | `_site` built from `343c380` (last Eleventy-compatible commit). Gap is 5 external post pages. Script path resolved. Eleventy build broken on current HEAD (render syntax incompatible). |

Gaps:

| Gap | Notes | Status |
| --- | ----- | ------ |
| External post pages (5 files) | SSG skips posts with `external:` frontmatter (`core/emitter/posts.ts:27`). Eleventy generates a local page for each. All five are 2016 guest articles on SitePoint. Decide: emit a redirect/stub page, or skip intentionally. | Not started |
| HTML minification | `.build` output is unminified (e.g. `index.html`: 785 lines / 35 KB vs Eleventy's single-line / 32 KB). Phase 3 task. | Not started |
| Eleventy build broken on current source | Render syntax change in `759bfd3` (`{% render world.html %}` → `{% render "world.html" %}`) is incompatible with Eleventy's LiquidJS. Expected during migration — future comparisons require building Eleventy from a prior commit or the comparison becomes obsolete once migration completes. | Expected |
| Script output path | `_site` exposes JS at `assets/scripts/*.js`. `.build` writes `scripts/*.js` at the output root — templates and passthrough must agree so `src` in HTML matches deployment | Done |
| Individual post HTML (non-external) | `_site` has one page per post under `writes/:year/:slug/index.html`. `.build` now emits the two 2015 posts correctly. Only the five external posts differ (see row above). | Done |

---

## 7. Code Quality & Architecture

### 7.1 Architecture: Split `compile()` into a pipeline

`core/parser/index.ts` — `compile()` handles frontmatter extraction, output path resolution, context creation, Liquid parsing, rendering, and layout resolution in one function. Before adding filters, markdown, or HTML minification (Phase 3), decompose into composable pipeline steps so new processing stages can be inserted without growing the function further.

| Task | Status | File |
| ---- | ------ | ---- |
| Extract frontmatter step | Done | `core/parser/index.ts:86` — `extractFrontmatter()` |
| Extract output path resolution step | Done | `core/utils/path.ts` — `resolveOutput()` |
| Extract context creation step | Done | `core/parser/index.ts:37` — `createPageContext()` |
| Extract layout resolution into its own step | Done | `core/parser/index.ts:65` — `applyLayouts()` |
| Define shared pipeline state type | Not started | `core/parser/index.ts` |

### 7.2 Architecture: Separate file discovery from processing in `traverseDir` — Done

### 7.3 Type Safety: Remove `as` casts where narrowing suffices

The parser uses `as TokenIdent` / `as TokenKeyword` casts *before* the runtime type check on the next line. If the value is `undefined`, the cast silently lies. Check first, then the type is narrowed automatically.

| Task | Status | File |
| ---- | ------ | ---- |
| `variable` cast in `parseIterationHeader` | Done | `core/parser/liquid/parser.ts:542` — narrowed via type check |
| `inKeyword` cast in `parseIterationHeader` | Done | `core/parser/liquid/parser.ts:553` — narrowed via type check |
| `nameToken` cast in `capture` branch | Not started | `core/parser/liquid/parser.ts` |
| `params` cast in for-loop param parsing | Not started | `core/parser/liquid/parser.ts` |
| `param` cast in tablerow param parsing | Not started | `core/parser/liquid/parser.ts` |

### 7.4 Type Safety: Narrow catch-block errors — Done

### 7.5 Type Safety: Replace `as Record<string, unknown>` casts in data loader

`loadFromDir` and `loadFromFile` cast `readOrImport` results with `as Record<string, unknown>`. Add a type guard (`isRecord`) so malformed data (arrays, primitives) is caught instead of silently accepted.

| Task | Status | File |
| ---- | ------ | ---- |
| Add `isRecord` type guard | Not started | `core/data/loader.ts` |
| Apply in `loadFromDir` | Not started | `core/data/loader.ts:54` |
| Apply in `loadFromFile` | Not started | `core/data/loader.ts:67` |

### 7.6 Robustness: Validate `parseFilename` date parts

`core/data/posts.ts:30` — `parseFilename` splits the filename and maps to `Number`. If a filename doesn't follow `YYYY-MM-DD-slug`, the date parts are `NaN` and `new Date(NaN, NaN, NaN)` silently propagates an Invalid Date.

| Task | Status | File |
| ---- | ------ | ---- |
| Add `NaN` guard after parsing year/month/day | Not started | `core/data/posts.ts:31` |

### 7.7 Performance: Optimise for-loop param application order

`core/parser/liquid/renderer.ts:227` — `toReversed()`, `slice(offset)`, `slice(0, limit)` each create a new array. Applying offset/limit first (smaller array) then reversing reduces allocations for large collections.

| Task | Status | File |
| ---- | ------ | ---- |
| Reorder param application: offset → limit → reversed | Not started | `core/parser/liquid/renderer.ts:226` |

### 7.8 Test Coverage: Add tests for untested modules

The parser and utility modules are well covered. The integration layer (build, traverse, data, posts) has no dedicated tests.

| Module | Risk | Status |
| ------ | ---- | ------ |
| `core/data/posts.ts` (date parsing, URL generation) | Medium | Not started |
| `core/data/loader.ts` (file loading, error paths) | Medium | Not started |
| `core/data/index.ts` (data merging, `pickValues`) | Medium | Not started |
| `core/emitter/traverse.ts` (file processing) | High | Not started |
| `core/emitter/posts.ts` (post compilation) | Medium | Not started |
| `core/server.ts` (request handling, 404 paths) | Medium | Not started |

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
├── Filters (6 functions)
├── Shortcodes (registration + resolver)
└── Collections (globbing + sorting; global `collections.posts` wired — permalink pages still open)

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
```
