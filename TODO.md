# SSG migration

Custom SSG is the production build — statichost.eu deploys `.build/` via `npm run build`. Target: zero third-party **build** dependencies (except `@types/node`). Dev tooling (Biome, Husky, Snyk) stays in `devDependencies`.

**Current phase:** Post-cutover polish and optional build quality.

**Status key:** open · partial · done · blocked (blocked = depends on open work above it)

---

## Open

### Build quality (optional)

| Item | Status | Notes |
| ---- | ------ | ----- |
| CSS autoprefixer | open | Optional if targeting modern browsers only. |

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

---

## Testing matrix

Use after parser or pipeline edits:

- **Regression:** Spot-check representative pages + posts in `.build/`.
- **Parser:** `for` + assign, `break` / `continue`, nested `if` / `for`, unknown filter / shortcode errors (`npm test`).
- **Runtime:** Dev server serves `.build/`, path traversal blocked, livereload upgrade + reload.
- **Data:** Missing `src/data`, bad JSON, empty collection.
