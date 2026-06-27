# SSG migration

Custom SSG runs in parallel with Eleventy. Target: zero third-party build dependencies (except `@types/node`).

**Current phase:** Template and pipeline parity is largely there; Eleventy is still the production path until a full prod build comparison is done.

**Status key:** open · partial · done · blocked (blocked = depends on open work above it)

---

## Open

### Cutover blockers

| Item | Status | Notes |
| ---- | ------ | ----- |
| Prod parity check | open | Compare `.build/` vs `_site/` (HTML, CSS, URLs, RSS) before switching deploy. |

### Accepted gaps (not planned)

| Item | Notes |
| ---- | ----- |
| Syntax highlighting | Out of scope. One or two legacy posts use `{% highlight %}` / `{% endhighlight %}`; parser warns and code renders unstyled — acceptable for now. Fenced markdown blocks also emit plain `<code>` without token classes. |

### Build quality (Phase 3)

| Item | Status | Notes |
| ---- | ------ | ----- |
| CSS minification | open | `@import` bundling works; no minifier yet. |
| CSS autoprefixer | open | Optional if targeting modern browsers only. |
| Asset bundling | open | Replace `@11ty/eleventy-plugin-bundle` behaviour if still needed. |

### Polish (Phase 4)

| Item | Status | Notes |
| ---- | ------ | ----- |
| Error messages / diagnostics | partial | Parser errors exist; source spans on AST nodes still open. |
| Build time reporting | open | Per-stage timing exists in debug; no user-facing summary. |
| Integration tests | open | Parser/utils covered; build, data, server paths untested (see testing matrix below). |

### Frontmatter

| Item | Status | Notes |
| ---- | ------ | ----- |
| Cover all post shapes | partial | Custom subset in `core/parser/frontmatter/parser.ts` — not full YAML 1.x. Run against every `src/posts/*.md` and extend or document limits. |

### Refactor backlog (non-blocking)

Pick when touching the area; gate parser changes with the testing matrix.

- **Parser:** return-based loop control (replace throw signals); scope semantics docs; extract tag handlers from `parseNodes`; source spans on high-value nodes.
- **Data:** discriminated loader results (`{ ok, value }`); narrow `DataFileMap` / remove `getCollections` cast.
- **DevEx:** `operationId` per build in `core/utils/log.ts`.
- **Paths:** unify site-path / slash normalisation in one helper.

### Phase 5 — dependency removal

**blocked** until the prod parity check passes and CSS processing is replaced on the custom path (minify at minimum, if dropping PostCSS).

Remove Eleventy, PostCSS toolchain, `html-minifier`, `cross-env`; archive `eleventy.config.js`; point `npm run build` / `npm start` at the custom SSG.

---

## Done

### Template and content

- **Liquid** — tags, expressions, filters, layouts, isolated `render`, shortcodes. Matrix: [`core/parser/liquid/README.md`](core/parser/liquid/README.md)
- **Markdown** — tokenizer, parser, renderer; `.md` bodies compiled in [`core/parser/compile.ts`](core/parser/compile.ts)
- **Frontmatter** — YAML-like subset (nested maps, list arrays, `#` comments, quoted scalars)
- **Collections** — load from `src/posts/`, `sortBy` / `sortOrder`, permalink expressions via Liquid filters ([`core/data/collections.ts`](core/data/collections.ts))
- **User filters / shortcodes** — `encodeXML`, `currentYear` in [`site.config.ts`](site.config.ts)

### Build pipeline

- **Orchestration** — [`core/commands/build.ts`](core/commands/build.ts), thin [`core/index.ts`](core/index.ts)
- **Engines** — site-template (`.liquid`, `.html`, `.xml`, `.md`), CSS (`.css`) via [`core/engines/registry.ts`](core/engines/registry.ts)
- **Single walk** — discover + collection index + passthrough in one pass ([`core/emitter/traverse.ts`](core/emitter/traverse.ts))
- **CSS @import** — inline bundling with layer/supports/media ([`core/transforms/css-imports.ts`](core/transforms/css-imports.ts))
- **HTML minify** — prod-only via `artifactTransforms` ([`core/transforms/minify-html.ts`](core/transforms/minify-html.ts))
- **Passthrough** — assets and scripts ([`core/emitter/passthrough.ts`](core/emitter/passthrough.ts))
- **Dev server** — watch `src/`, debounced rebuild, livereload ([`core/commands/serve.ts`](core/commands/serve.ts), [`core/server/`](core/server/), [`core/transforms/livereload.ts`](core/transforms/livereload.ts))

### Source layout

Renamed from Eleventy conventions: `src/data/`, `src/includes/`, `src/layouts/`, `src/posts/` (no leading underscore). Config internal dirs match ([`core/config.core.ts`](core/config.core.ts)).

---

## Testing matrix

Use after parser or pipeline edits:

- **Regression:** Spot-check representative pages + posts in `.build/` (no legacy baseline required).
- **Parser:** `for` + assign, `break` / `continue`, nested `if` / `for`, unknown filter / shortcode errors (`npm test`).
- **Runtime:** Dev server serves `.build/`, path traversal blocked, livereload upgrade + reload.
- **Data:** Missing `src/data`, bad JSON, empty collection.
