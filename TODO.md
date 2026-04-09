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
7. [Component Dependency Tree](#component-dependency-tree)
8. [Build Order Recommendation](#build-order-recommendation)

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
| Additional tags (cycle, tablerow, increment/decrement, echo) | Not started |

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

### 1.5 Shortcodes

From `eleventy.config.js`:

| Feature | Status |
| ------- | ------ |
| `currentYear` shortcode | Not started |
| Shortcode registration system | Not started |
| Shortcode resolver in templates | Not started |

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
| Per-post output pages matching Eleventy permalinks | Not started (see section 6.4, build output parity) |

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
| File discovery and processing | In progress |
| Layout system | In progress |
| Data file loading (`_data/` directory) | In progress |
| Posts collection in global context (`collections.posts`) | Done |
| Permalink handling | Not started |
| Asset copying (passthrough) | Not started |

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
| Passthrough copy for `assets/`, `scripts/`, `_redirects` | Not started |
| Directory structure preservation | Not started |
| Asset bundling | Not started |

---

## 6. Migration Tasks

### 6.1 Template Updates

**Blocked by:** Render scope (Phase 2)

Update `src/_includes/` files to work with isolated render scope:

| File | Status | Required Variables |
| ---- | ------ | ------------------ |
| `page-footer.liquid` | Blocked | `site.email`, `socialnetworks.*`, `pkg.version` |
| `page-scripts.liquid` | Blocked | `pkg.version`, `site.timestamp` |
| `menu.liquid` | Blocked | `title` |
| `meta-head.liquid` | Blocked | `site.*`, `page.*`, `pkg.*`, `eleventy.*`, `keywords`, `pageClass` |

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

Gaps (as of first snapshot):

| Gap | Notes | Status |
| --- | ----- | ------ |
| Individual post HTML | `_site` has one page per post under `writes/:year/:slug/index.html` (e.g. seven posts in 2015–2016). `.build` only emits `writes/index.html` — no permalink pages yet | Not started |
| Script output path | `_site` exposes JS at `assets/scripts/*.js`. `.build` writes `scripts/*.js` at the output root — templates and passthrough must agree so `src` in HTML matches deployment | Not started |

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

---

## Build Order Recommendation

1. **Complete Template Features** (Phase 2)
   - Filters (especially `dateToRFC3339`, `encodeXML`)
   - Collections parity (per-post pages, permalinks, URL helpers — `core/data/posts.ts`)
   - Shortcodes system

2. **CSS Processing** (Phase 3)
   - CSS Parser (shared dependency)
   - CSS @import Resolver (most important)
   - CSS Minifier
   - Autoprefixer (optional, evaluate if needed)

3. **HTML Minification** (Phase 3)
   - HTML Parser
   - HTML Minifier

4. **Markdown Parser** (if not done)
   - Full parser implementation
   - Integration with frontmatter

5. **Syntax Highlighting** (Phase 3)
   - Start with languages used in blog
   - Expand as needed

6. **Developer Experience** (Phase 4)
   - File watcher
   - Dev server with live reload

7. **Final Cleanup** (Phase 5)
   - Remove all dependencies
   - Update documentation

---

## Notes

- **CSS Autoprefixer:** Evaluate if needed. Modern browsers support most CSS features without prefixes.
- **Language Grammars:** Syntax highlighting requires significant work. Start with actively used languages.
- **Shared Parsers:** CSS Parser is a dependency for multiple components - build it first and reuse.
- **Testing:** Test each component with actual site content before moving to next.
- **Compatibility:** Website must work identically after migration (see AGENT.md).

