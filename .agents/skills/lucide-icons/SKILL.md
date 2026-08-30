---
name: lucide-icons
description: Suggest Lucide icons as a linked list per topic, then vendor the chosen SVG into src/includes/iconset.html or src/assets/icons/. Use when asked to find, suggest, pick, or add an icon for a topic, section, or list item, or when adding a new symbol to the sprite.
disable-model-invocation: true
---

# Adding Lucide icons

Source of truth is [lucide.dev](https://lucide.dev), ISC licensed, 2000+ icons. Browse links are `https://lucide.dev/icons/<name>`; raw SVG comes from `https://unpkg.com/lucide-static@latest/icons/<name>.svg`, because lucide.dev is client-rendered and returns no usable markup.

## Hard rules

1. **Suggest as a linked list, one line per topic.** Every name links to its lucide.dev page so the icon can be viewed before choosing.
2. **Never write icons into the codebase until explicitly instructed.** Suggesting and placing are separate turns. "Suggest an icon for X" ends at the list; wait for a named pick ("use `sprout`", "add `terminal` to the sprite").
3. **Verify names before suggesting.** Guessed names produce dead links. There is no `cactus`, no `manga`, no `translate`.
4. **Set `fill="none"` on every Lucide symbol.** `src/css/globals/reset.css` has no global fill reset, so closed outline paths render as solid blobs without it.

## Step 1 — suggest (default)

Verify candidates, then list them:

```bash
for i in sprout leaf flower-2; do
  echo "$i $(curl -sL -o /dev/null -w '%{http_code}' https://unpkg.com/lucide-static@latest/icons/$i.svg)"
done
```

Format, 3–5 candidates per topic, recommendation first:

```markdown
**Growing** — [`sprout`](https://lucide.dev/icons/sprout), [`leaf`](https://lucide.dev/icons/leaf), [`flower-2`](https://lucide.dev/icons/flower-2)
```

Follow the list with one line per topic saying which one to pick and why. Names alone do not convey shape, so state what the icon actually depicts when it is not obvious from the name.

To search the full name list rather than guess:

```bash
curl -sL "https://unpkg.com/lucide-static@latest/?meta" -o .tmp/lucide-meta.json
```

Icon names sit at `files[].files[].path` as `/icons/<name>.svg`.

## Step 2 — place (only when instructed)

| Target | When | Theming |
|---|---|---|
| `src/includes/iconset.html` | Inline use in templates via `<svg><use xlink:href="#name"></use></svg>` | Inherits `currentcolor`, follows the dark theme toggle |
| `src/assets/icons/<name>.svg` | Referenced from CSS (`content: url()`, `--icon-src`), as in `src/css/components/logo.css:24` | Colour is baked into the file; needs a second file or a filter for dark mode |

Default to the sprite. Only use `src/assets/icons/` when CSS needs a URL.

### Sprite conversion

Lucide's standalone SVG becomes a `<symbol>`: drop `class`, `width`, `height`, `xmlns`, and the license comment; keep `viewBox` and move the presentation attributes onto the symbol. Reindent to tabs.

```html
<symbol
	id="sprout"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentcolor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" />
	<path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" />
	<path d="M5 21h14" />
</symbol>
```

Insert next to the other outline icons (`sun`, `moon`, `arrow-*`), not among the filled ones. Attribution for the vendored artwork belongs in a single comment above the Lucide block, not per symbol.

### Standalone file

Keep Lucide's root `<svg>`, drop `class` and the license comment, and replace `stroke="currentColor"` with a literal colour — CSS `url()` references cannot inherit it.

## Gotchas

- **Two icon families already exist in the sprite.** `github`, `mail`, `new-window`, `arrow-*` are filled Material Design paths; `sun` and `moon` are stroked outlines. Lucide joins the second family. Mixing filled and stroked icons in one row looks inconsistent — check what sits next to the new icon.
- **Sizing.** `--icon-size` is 30px, `--icon-size-small` 22.5px, `--icon-size-tiny` 15px (`src/css/globals/variables.css:55`). Lucide's `stroke-width="2"` at 24 units is tuned for ~24px; below ~16px it reads as heavy, above ~32px as thin.
- **Decorative icons need `aria-hidden="true"`** on the `<svg>` when adjacent text already names the thing.
- **Sprite symbols are cloned into a shadow tree**, so document CSS cannot select their inner paths. Style the path inside the `<symbol>`, or pass custom properties from the instance.
