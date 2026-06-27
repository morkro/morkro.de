---
name: website-specification
description: >-
  Audit src/ website source against The Website Specification
  (specification.website). Validates HTML, SEO, accessibility, security
  signals, agent readiness, performance markup, privacy, resilience, and i18n.
  Use when auditing the site, checking spec compliance, listing spec gaps, or
  validating pages against specification.website.
disable-model-invocation: true
---

# Website Specification Audit (`src/`)

Audit this repository's **website source** against [The Website Specification](https://specification.website/). The spec defines ~128 platform-agnostic topics across ten categories, each tagged `required`, `recommended`, `optional`, or `avoid`.

Validate what **templates, content, styles, and client scripts** express. Track server, DNS, and hosting gaps separately when they cannot be fixed in source.

## Scope

**In scope:** everything under the configured input directory (default `src/`) — layouts, includes, pages, posts, CSS, scripts, data, assets, and authored static files.

**Also inspect:** build output (default `.build/`) when verifying generated HTML, feeds, and error-page behaviour. Fixes belong in source or the build pipeline, not hand-edited output.

**Out of scope (Hosting / deploy):** TLS, HSTS, response headers (CSP, Cache-Control, compression), DNS, uptime monitoring — unless injected via templates in source.

When a topic spans both (e.g. `robots.txt`, `sitemap.xml`, `security.txt`, `llms.txt`), search **source and `core/`** for a file or generator. If missing everywhere, report as an open task.

## Load the spec

Prefer the official MCP server (stateless, no auth):

- Endpoint: `https://mcp.specification.website/mcp`
- Tools: `get_checklist`, `list_topics`, `get_topic`, `search`, `get_categories`

**Without MCP**, fetch:

- Index: `https://specification.website/llms.txt`
- Per topic: append `.md` to any spec URL
- Checklist: `https://specification.website/checklist`

Re-fetch spec content for each audit. When uncertain, call `get_topic({ slug })` rather than guessing.

Topic-to-concern hints (may be stale): [AUDIT-MAP.md](AUDIT-MAP.md).

## Audit procedure

### Step 0 — Discover project structure (mandatory)

**Never assume file paths from AUDIT-MAP or past audits.** Locate files by role using search under `src/` (and `core/` for generators/renderers). Record discoveries in the report under **Discovered structure**.

| Role | How to find it |
| --- | --- |
| **Document shell** | File containing `<!DOCTYPE html>` and `<html` with `lang=` |
| **Head partial** | File with `<meta charset` and `<title` (or included from shell) |
| **Main landmark** | `<main` element; note its `id` (skip-link target) |
| **Skip link** | First focusable link in shell pointing to main landmark |
| **Site metadata** | Data module exporting site `url`, `title`, `description`, or author |
| **Primary nav** | `<nav` in header partial or shell |
| **Script bundle partial** | Partial or layout tail that loads `src/scripts/` |
| **Global CSS entry** | Stylesheet linked from head or `@import` root in CSS tree |
| **Error page source** | Frontmatter/title mentioning 404, or permalink `404` |
| **Feed source** | Template or page emitting RSS/Atom (`<rss`, `<feed`, `application/rss+xml`) |
| **Post/article layout** | Layout wrapping blog content; post files in a collection directory |
| **Markdown renderer** | `core/parser/markdown/` if post HTML is generated at build time |

If a listed path in AUDIT-MAP is missing, **do not fail the topic** — search by role. Only report a gap when the concern is genuinely absent after discovery.

Optional override: if `.cursor/skills/website-specification/paths.json` exists, read role → path mappings first, then verify each path exists; fall back to discovery for missing or stale entries.

### Step 1 — Load the checklist

`get_checklist()` or parse `llms.txt`. Keep each topic's `status`.

### Step 2 — Build and sample output (recommended)

Run the site build. From output (default `.build/`):

- Open `index.html` (or root page) — verify doctype, `lang`, charset, viewport, title, robots, OG tags
- Open one inner page and one post HTML
- Confirm custom 404 exists and server returns HTTP 404 (see `core/server/`)
- If a feed is published, validate generated feed XML

Source fixes when output fails; output is the verification layer.

### Step 3 — Walk every checklist topic

For each item, using [AUDIT-MAP.md](AUDIT-MAP.md) for **concern → discovery signals** (not fixed paths):

- **Pass** — evidence in discovered files or build output (cite path:line)
- **Fail** — gap or violation
- **N/A** — not applicable (one-line justification)
- **Hosting** — requirement exists but not fixable in source

### Step 4 — Sample pages by role (not by folder name)

Audit at least one file per role, **discovered in step 0**:

| Role | What to check |
| --- | --- |
| Home / root | Title, h1, hero images, internal links |
| Index / listing | Heading hierarchy, list semantics, structured data |
| Article / post | Post layout, author/date markup, in-content images and links |
| Error | Plain-language message, link home, correct status at runtime |
| Long-form content | Tables, many headings, repeated components (resume, about, etc.) |

Pick candidates via frontmatter (`layout`, `permalink`, `pageClass`), collection membership, or output URL — not hardcoded directory names.

### Step 5 — Cross-cut search over `src/`

Grep entire source tree for patterns that span many files:

- `<img` without `alt`, or meaningful images with empty `alt=""`
- Icon-only controls without accessible name (`aria-label`, `.sr-only`, visible text)
- Heading level skips in templates and markdown
- `outline: none` / `:focus { outline` removed without `:focus-visible` replacement
- Hard-coded `http://` URLs
- Bare `<script>` without `defer`, `async`, or `type="module"`
- Third-party scripts or iframes
- Microdata (`itemscope`) without JSON-LD where spec recommends JSON-LD

### Step 6 — Report open tasks by importance

Include **Discovered structure** at the top so the author can see what was audited.

## Importance tiers

Sort open tasks (Fail + applicable Hosting) by tier, then by category order. Never upgrade `recommended` to `required`.

| Tier | Spec status | Meaning |
| --- | --- | --- |
| **P0 — Critical** | `avoid` | Harmful pattern — fix or remove |
| **P1 — Required** | `required` | Platform contract breaks without it |
| **P2 — Recommended** | `recommended` | Modern site should have it |
| **P3 — Optional** | `optional` | Context-dependent |

Category order within a tier: Foundations → Accessibility → SEO → Security → Resilience → Performance → Privacy → Internationalisation → Well-Known URIs → Agent Readiness.

## Output format

Include **only open tasks** unless the user asks for the full checklist.

```markdown
# Website Specification Audit

Spec: https://specification.website/ · Scope: src/ · Date: YYYY-MM-DD

## Discovered structure

| Role | Path (verified at audit time) |
| --- | --- |
| Document shell | … |
| Head partial | … |
| Main landmark | … |
| Site metadata | … |
| Error page | … |
| Feed | … or *not found* |

## Summary

| Tier | Open tasks |
| --- | --- |
| P0 Critical (avoid) | N |
| P1 Required | N |
| P2 Recommended | N |
| P3 Optional | N |
| Hosting / deploy | N |

## Open tasks (by importance)

### P0 — Critical (avoid)

- [ ] **[Topic title](spec-url)** — What's wrong · `path:line` or hosting · Fix hint

### P1 — Required

- [ ] …

### P2 — Recommended

- [ ] …

### P3 — Optional

- [ ] …

### Hosting / deploy

- [ ] **[Topic title](spec-url)** — `[P1]` What's missing · Where to configure

## Suggested next steps

Numbered, highest-impact fixes. Prefer source changes, then build pipeline, then hosting.
```

Each open task: linked spec topic, status for hosting items, evidence path (or "missing after discovery"), one actionable fix direction.

## Rules

- **Discovery before paths** — AUDIT-MAP and optional `paths.json` are hints only.
- Validate against spec **status**, not preference.
- Cite paths with line numbers from files **found during this audit**.
- No third-party libraries — this project builds from scratch.
- Mark i18n topics **N/A** when the site is single-locale unless multilingual content is planned.
- Distinguish source-fixable gaps from hosting gaps.

## Additional reference

- Concern → discovery signals: [AUDIT-MAP.md](AUDIT-MAP.md)
- Optional path overrides: [paths.json](paths.json) (create only when you want stable aliases during refactors)
- Official spec agent skill: https://specification.website/.well-known/agent-skills/specification-website/SKILL.md
- Project layout (may lag refactors): `AGENT.md`
