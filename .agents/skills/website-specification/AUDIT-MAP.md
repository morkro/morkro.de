# Spec topic → discovery signals

Maps each checklist topic to **what to look for** in source or build output. Paths in the "Hint" column are **examples only** — they may be stale after refactors. Always run step 0 discovery in [SKILL.md](SKILL.md) first.

Slugs match `https://specification.website/spec/{category}/{slug}/`.

## How to use this file

1. Load the checklist topic and its `status`.
2. Use **Discovery signals** to search `src/` (and `core/` for generators).
3. Glance at **Hint** if search is ambiguous — verify the file exists before citing it.
4. Prefer **build output** (`.build/`) when verifying what ships (doctype, meta tags, feed XML).

---

## Foundations

| Slug | Discovery signals | Hint (may be stale) |
| --- | --- | --- |
| doctype | `<!DOCTYPE html>` as first line in shell layout | `src/layouts/*.liquid` |
| html-lang | `<html lang="…">` BCP 47 tag on shell | shell layout |
| meta-charset | `<meta charset="utf-8">` in first ~1 KB of head | head partial |
| meta-viewport | `<meta name="viewport"` with `width=device-width` | head partial |
| title | Exactly one non-empty `<title>` per page | head partial + page frontmatter |
| meta-description | `<meta name="description"` unique per page where possible | head partial, site data |
| canonical-url | `<link rel="canonical"` | head partial |
| favicons | `<link rel="icon"`, `/favicon.ico`, apple-touch-icon | head partial, assets |
| theme-color | `<meta name="theme-color"` | head partial |
| color-scheme | `<meta name="color-scheme"` or CSS `color-scheme:` | head partial, global CSS |
| open-graph | `property="og:title"`, `og:description`, `og:image`, `og:url`, `og:type` | head partial |
| feed-discovery | `<link rel="alternate" type="application/rss+xml"` (or Atom) | head partial |
| feed-hygiene | Generated feed: `atom:link rel="self"`, stable `guid`, valid XML | feed template output |
| popover-api | Custom modals/menus — prefer `popover` attribute over JS-only overlays | interactive includes |

---

## SEO

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| robots-txt | `robots.txt` at site root in source, passthrough, or generator | search repo for `robots.txt` |
| xml-sitemaps | `sitemap.xml` or generator listing canonical URLs | `core/`, static files |
| sitemap-index | Only if URL count warrants split sitemaps | — |
| image-sitemaps | Image metadata in sitemap when JS-loaded media | — |
| url-structure | Lowercase, hyphenated paths; stable permalinks in frontmatter | `src/pages/`, post filenames |
| redirects | 301/308 for permanent moves | hosting; internal link targets in nav |
| soft-404 | 404 content must not return 200 | error page source + server status |
| meta-robots | `<meta name="robots"` or implicit public indexing policy | head partial |
| heading-hierarchy | No skipped levels; headings not used for styling only | pages, posts, layouts |
| internal-linking | Nav, footer, in-content links to key pages | nav partial, footer |
| structured-data | JSON-LD `<script type="application/ld+json">` preferred over microdata | head or layouts |
| breadcrumbs | Visible trail + BreadcrumbList JSON-LD | deep pages |
| indexnow | Push protocol for URL updates | build hook or deploy script |

---

## Accessibility

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| color-contrast | CSS custom properties for text/background; no low-contrast pairs | global + component CSS |
| image-alt-text | Every `<img alt="…">`; markdown images in renderer | includes, pages, `core/parser/markdown/` |
| form-labels | `<label for=` or wrapping label on every control | pages with forms |
| keyboard-navigation | Interactive elements focusable in logical order | nav, scripts |
| focus-indicators | Visible `:focus` or `:focus-visible` styles | global CSS |
| skip-links | First focusable link to main landmark id | shell layout |
| semantic-html | `<header>`, `<nav>`, `<main>`, `<footer>`, `<article>` | layouts, includes |
| aria-usage | Native HTML first; ARIA only when no native element fits | custom widgets |
| link-text | Link text describes destination (not "click here") | menu, posts, footer |
| empty-links-buttons | Icon buttons need `.sr-only`, `aria-label`, or visible text | header, chips |
| form-errors | Text errors linked to inputs on validation failure | forms |
| document-language | Page `lang` + `lang` on inline foreign phrases | shell, content |
| reduced-motion | `@media (prefers-reduced-motion: reduce)` | global CSS, animations |
| accessibility-overlays | **Avoid** third-party overlay widgets | scripts |
| captions-and-transcripts | `<track kind="captions">`, transcripts for audio | embedded media |
| data-tables | `<table>`, `<th scope=`, `<caption>` | long-form pages |
| touch-target-size | Min ~24×24 CSS px (44×44 enhanced) on controls | component CSS |
| native-interactive-elements | `<button>`, `<a href>` — not `<div onclick>` | scripts, templates |

---

## Security (source-expressible)

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| https-tls | All asset URLs use `https:` | templates, data |
| content-security-policy | Inline scripts/styles count against strict CSP | head, scripts |
| security-txt | `/.well-known/security.txt` source or static copy | passthrough, generator |
| subresource-integrity | `integrity=` on external script/link tags | templates |
| cookie-attributes | `Secure`, `HttpOnly`, `SameSite` if cookies set in JS | scripts |

Most headers → **Hosting**.

---

## Well-Known URIs

| Slug | Discovery signals |
| --- | --- |
| well-known-overview | Any file under `**/.well-known/**` in source or passthrough |
| change-password | Only if site has accounts |
| openid-configuration | Only if OIDC provider |
| api-catalog | Machine-readable API index |
| webfinger, apple-app-site-association, assetlinks, nodeinfo | Only if product requires them |

Skip N/A topics with one-line justification.

---

## Agent Readiness

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| llms-txt | `/llms.txt` at site root | static or generator |
| llms-full-txt | `/llms-full.txt` concatenated export | optional |
| markdown-source-endpoints | `.md` suffix or `Accept: text/markdown` | build feature |
| robots-for-ai-crawlers | Named AI user-agents in robots.txt | robots source |
| structured-data-for-agents | JSON-LD with schema.org types | templates |
| stable-urls | Permalinks unchanged; no breaking slug changes | frontmatter, post names |
| machine-readable-formats | RSS, JSON data endpoints | feed, `src/data/` |
| link-headers | `Link:` response header for discovery | hosting |
| mcp-and-tool-discovery, a2a-agent-cards, agent-skills-discovery | `/.well-known/` discovery files | only if exposing agent APIs |

---

## Performance

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| core-web-vitals | LCP image not lazy-loaded; dimensions on images; minimal CLS | templates, assets |
| image-optimization | WebP/AVIF, width/height attributes | assets, `<img>` |
| lazy-loading | `loading="lazy"` on below-fold images, not LCP | templates |
| preload-prefetch-preconnect | `<link rel="preload|prefetch|preconnect"` | head partial |
| font-loading | WOFF2, `font-display: swap`, subset fonts | CSS `@font-face` |
| critical-css | Minimal render-blocking CSS in head | CSS import tree |
| script-loading | `defer`, `async`, or `type="module"` on scripts | script partial |
| cache-control, compression, http3 | Response headers | **Hosting** |
| scrollbar-gutter | `scrollbar-gutter: stable` | global CSS |

---

## Privacy

| Slug | Discovery signals |
| --- | --- |
| privacy-policy | Dedicated policy page in pages |
| cookie-consent | Consent UI before non-essential cookies |
| global-privacy-control | Honour `Sec-GPC` / GPC signal |
| third-party-scripts | External `<script src=` domains audited |
| analytics-privacy | Cookieless / aggregate analytics preferred |
| data-minimization | Forms and logs collect minimum PII |

---

## Resilience

| Slug | Discovery signals | Hint |
| --- | --- | --- |
| error-pages | Custom 404/500 content; correct HTTP status | error page + `core/server/` |
| maintenance-pages | 503 + `Retry-After` | hosting |
| offline-support | Service worker fallback | rarely in static SSG |
| pwa-manifest | `manifest.json` linked from head | static source |
| monitoring-uptime | External uptime checks | **Hosting** |

---

## Internationalisation

| Slug | Discovery signals |
| --- | --- |
| international-url-structure | Locale in URL pattern (tld/subdomain/subdir) |
| hreflang | `<link rel="alternate" hreflang=` reciprocal across locales |
| localised-metadata | Translated title, description, OG, JSON-LD per locale |
| language-switcher | Locales listed in native language with `lang` |
| rtl-support | `dir="rtl"`, logical CSS properties |
| locale-content | `Intl` for dates/numbers in scripts |

**Default for this site:** single locale (`lang="en"`). Mark most i18n topics **N/A** until multilingual content exists.

---

## Cross-cutting search patterns

Run under `src/` regardless of structure:

```
<!DOCTYPE|<html lang=|<meta charset|<meta name="viewport"
<meta name="description"|<link rel="canonical"
property="og:|<link rel="alternate"
<img(?![^>]*alt=)|alt=""
outline:\s*none|:focus-visible
prefers-reduced-motion
itemscope|application/ld\+json
<script(?![^>]*(defer|async|type="module"))
http://
```

Adjust regex to your search tool. Follow matches into the owning file for line citations.
