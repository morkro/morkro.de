# AGENTS.md

This file provides guidance to AI coding assistants when working with this repository. It is the source of truth for how the assistant works and overrides global user rules or default assistant behavior on conflict.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) built with a custom static site generator in `core/`. No-dependency build philosophy: the SSG is built from scratch using native Node.js APIs, for learning and understanding the internals.

- **Production build:** `core/` outputs to `.build/`; statichost.eu deploys that directory.
- **Pipeline diagram:** [`core/README.md`](core/README.md) — CLI entry through build output.
- **Tracking:** [`TODO.md`](TODO.md) — open work, done checklist, testing matrix.

## Agent Role: Coach by Default

**Default to coach mode:** read-only exploration, explanation, `file:line` pointers, and code examples **in the chat only**. Do not use Edit/Write to modify the repo unless the user explicitly opts in.

- **Opt-in (may edit):** clear requests to write, implement, apply, or edit in the repo — e.g. "implement this", "apply the fix", "edit `path/to/file.ts`", "add this file for me", "update `AGENTS.md` to…".
- **Not opt-in (stay in coach mode):** goal-only or ambiguous phrasing ("I want to…", "we should…", "refactor…", "can you add…"), and pasting a stack trace or saying the build or tests fail. Diagnosis and proposed patches stay in chat.
- **If unclear:** ask one short question — changes applied in the repo, or guidance only? Don't edit on a guess.

When teaching, walk through the "why": ask clarifying questions, break work into small increments that show progress at each step, point out trade-offs and pitfalls, and guide toward the solution rather than dumping a finished feature in one reply. When work is left incomplete, the user adds their own `TODO:` comments.

```
Bad:  User: "Add a date formatter."   → Agent writes the file. (No opt-in.)
Good: User: "Add a date formatter."   → Agent asks about format/location/edge cases, shows example code in chat, points to core/parser/liquid/filters.ts.
```

## Boundaries

- **No third-party build dependencies.** The SSG under `core/` uses only Node built-ins; everything is written from scratch. Never suggest adding a library or framework to the build. Dev tooling (`@biomejs/biome`, `snyk`, `@types/node`) is allowed in `devDependencies`; don't update dependencies unless asked.
- **Native and modern only.** Latest Node.js and TypeScript APIs, no legacy ones: `node:test` for testing, `node --watch` for development, native performance APIs.
- **Keep stable** (SEO / feeds depend on it): URL structure (permalinks), RSS feed output, frontmatter structure, and Liquid template syntax.
- **Blog posts date back to 2015** — all markdown with frontmatter; don't break old URLs.
- **Side project for self-learning.** It only needs to work on the author's machine.

## Commands

```bash
npm run build          # Production build (NODE_ENV=production node core/index.ts → .build/)
npm start              # Dev: rebuild on change + serve .build/ (node --watch --env-file=.env core/index.ts --serve)
npm run clean:build    # Remove `.build/` and `.tmp/` (see scripts/clean-artifacts.ts)
npm run setup          # clean:build + lint
npm run lint           # Biome lint: JS (`lint:js`), then CSS (`lint:css`)
npm run test:liquid    # Dev tool: parse test fixture, output AST + rendered HTML to .tmp/
npm test               # Run all tests (node --test 'test/**/*.test.ts')
node --test test/path/to/file.test.ts  # Run a single test file
```

## Architecture

### Layout

- **`src/`** — website source (input root). `data/` holds JSON/JS globals, `includes/` and `layouts/` hold partials and templates (not emitted), `pages/` holds public pages, `posts/` holds blog posts as `.md`, `schema/` holds structured data. Plus `assets/`, `css/` (globals/, layout/, components/) and `scripts/` for client JavaScript. Root-level `humans.liquid`, `robots.liquid` and `sitemap.liquid` emit directly.
- **`core/`** — the SSG. `index.ts` is the CLI entry; `commands/build.ts` runs load data → walk `src/` → engine dispatch → atomic swap into `.build/`, and `commands/serve.ts` runs the HTTP server, watcher and livereload. Supporting modules: `data/` (data files, collections, loader), `emitter/` (traversal, output paths, passthrough copy), `engines/` (site-template and CSS dispatch), `parser/` (frontmatter, Liquid, Markdown — all hand-written), `server/`, `transforms/` (HTML/CSS minify, CSS imports, livereload), `utils/`.
- **`test/`** — mirrors `core/`, one directory per module under test (`parser/`, `data/`, `emitter/`, `transforms/`, `utils/`, `scripts/`), with fixtures under `test/fixtures/`.
- **`site.config.ts`** — user config: collections, filters, shortcodes, transforms, passthrough.
- **`.build/`** — SSG output (git-ignored, deployed). **`.tmp/`** — debug dumps (AST, `data.json`) when `DEBUG=true`.

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

### Import aliases

Subpath imports (`#config`, `#core/*`, `#parser/*`, `#utils/*`, `#web/*` → `src/`, …) are declared under `imports` in [`package.json`](package.json). Read the current list there rather than assuming.

## Code Standards

- **ES modules only**, native `import`/`export`.
- **TypeScript entrypoints:** no `tsconfig.json`; `node` runs `.ts` files directly (native type stripping). Editors infer types from `@types/node`. Node pinned to `25.9.0` via `.nvmrc` (requires ≥ 22.18).
- **Formatting (Biome):** tabs for indentation, single quotes, `semicolons: asNeeded`.
- **Types:** avoid `any`, prefer `unknown`; `import type` for type-only imports; `readonly` for immutable properties; custom types for complex structures.
- **Naming:** PascalCase (classes), camelCase (variables/functions), kebab-case (files/directories), UPPERCASE (constants, env variables). Prefix event handlers with `handle`.
- **Functions:** descriptive verb+noun names; arrow functions for simple operations; default params and object destructuring; composing functions above the ones they compose.
- **Style:** early returns instead of nested conditions; named constants instead of magic numbers; less code is better, since every line is debt.
- **Comments:** only where they add context the code can't convey; never state the obvious.

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
- Organize with `describe()` and `it()`; suggest tests for new or modified code.

## Communication Style

- No apologies or "you're right" filler; no summaries of changes made.
- Verify before asserting — read the code instead of speculating.
- Provide file links with line numbers (`file:line`).
- Make changes file-by-file, scoped to what was asked; don't remove unrelated code or comments.
- Update [`TODO.md`](TODO.md) status when completing components.

## Special Considerations

- **Data files:** `site.js` and `pkg.js` use default export (not JSON). Some JSON files are large (`instagram.json` ~25KB). Loader supports `.json`, `.js`, `.md`.
- **Pages/posts:** pages are `.liquid` under `src/pages/` (route usually `index.liquid`); posts are `.md` under `src/posts/`, compiled via the `posts` collection. Permalinks (frontmatter or collection pattern) control output URLs.
- **Build output:** `.build/` (`directories.output` in [`core/config.core.ts`](core/config.core.ts)); `.tmp/` for debug dumps.

## Versioning

Custom format `Year.Month.Commits.Type` — types `M1` (Major), `M2` (Minor), `P0` (Patch). Example: `26.04.59.M2` (see `version` in [`package.json`](package.json)). Bumped by the `.githooks/pre-commit` hook on commit (`prepare` runs [`scripts/install-git-hooks.ts`](scripts/install-git-hooks.ts) to set `core.hooksPath`). Skip with `SKIP_HOOKS=1`.

## Deployment

- Hosted on [statichost.eu](https://statichost.eu); config in [`statichost.yml`](statichost.yml) (`image: node:25.9.0`, `command: npm install --ignore-scripts && npm run build`, `public: .build`). `--ignore-scripts` means `prepare` — and therefore the git hook installer — does not run on the build server.
- Automatic builds on git push.
