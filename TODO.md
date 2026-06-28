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

### Build quality (Phase 3)

| Item | Status | Notes |
| ---- | ------ | ----- |
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

**blocked** until the prod parity check passes.

Remove Eleventy, PostCSS toolchain, `html-minifier`, `cross-env`; archive `eleventy.config.js`; point `npm run build` / `npm start` at the custom SSG.

---

## Testing matrix

Use after parser or pipeline edits:

- **Regression:** Spot-check representative pages + posts in `.build/` (no legacy baseline required).
- **Parser:** `for` + assign, `break` / `continue`, nested `if` / `for`, unknown filter / shortcode errors (`npm test`).
- **Runtime:** Dev server serves `.build/`, path traversal blocked, livereload upgrade + reload.
- **Data:** Missing `src/data`, bad JSON, empty collection.
