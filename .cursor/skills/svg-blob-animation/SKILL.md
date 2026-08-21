---
name: svg-blob-animation
description: Animate decorative SVG blob shapes with CSS `d` morphing, using scripts/normalize-svg-path.ts to normalize paths and generate morph targets. Use when adding, tuning, or debugging idle blob motion in src/includes/*-bg*.html, header/footer background shapes, blob-photo clip paths, or when a `d` animation snaps instead of morphing.
disable-model-invocation: true
---

# Animating SVG background blobs

Decorative blobs live in `src/includes/` (`page-top-left-bg.html`, `page-header-bg-blob.html`, `blob-photo.liquid`) and in the `iconset.html` sprite (`#blob`, `#border`). Idle motion is pure CSS: an animated `d` plus a `transform` layer.

## Hard rules

1. **`d` only interpolates between paths with identical command structure** — same count, same order, same types. Mismatch fails silently as a discrete snap. Normalize to absolute `M` + n×`C` + `Z` first.
2. **Never hand-edit coordinates.** Use the CLI below. Hand-tuning burns turns and produces kinks.
3. **Idle motion goes on `d`; never combine an infinite `d` animation with a `d` transition** (e.g. hover) on the same element — a running animation always beats a transition. Put secondary motion on `transform`.
4. **Do not add a local reduced-motion gate.** Site motion is owned by `html[data-anim]` in `src/css/globals/system.css` (user toggle + OS fallback). A per-blob `@media (prefers-reduced-motion: reduce) { animation: none }` ignores `data-anim="on"` and makes the header toggle a lie. Verify with the anim toggle, not only by flipping the OS preference.

## Workflow

```
- [ ] 1. Normalize the path in place, confirm zero visual change
- [ ] 2. Generate morph targets with --deform
- [ ] 3. Paste keyframes, add the transform layer
- [ ] 4. Add negative animation-delay
- [ ] 5. Check clipping. Do not add a local `prefers-reduced-motion` media query.
```

### 1. Normalize

```bash
node scripts/normalize-svg-path.ts --pretty --file src/includes/page-top-left-bg.html
```

`--index <n>` picks the nth `d` in a file with several paths (the header blob file has three). Paste the result back and reload: the silhouette must not move. `path.getTotalLength()` in DevTools is a good check.

Arcs (`A`/`a`) throw — convert them first. Multi-subpath `d` strings (a second `M` after a `Z`, as in `blob-photo.liquid`) must be split into sibling `<path>` elements; a `<clipPath>` clips to the union of its children, so splitting is visually free.

### 2. Generate morph targets

```bash
node scripts/normalize-svg-path.ts \
  --file src/includes/page-header-bg-blob.html \
  --index 1 --deform 10 --seed 7 --stops 3 \
  --css header-blob-mid-idle
```

| Flag | Meaning |
|---|---|
| `--deform <n>` | Max offset in user units. Start at ~7% of the shape's *smaller* dimension. |
| `--seed <n>` | Reproducible jitter. Change it to reroll the character. |
| `--stops <n>` | Morph targets (default 3). More stops means more distance travelled per cycle, so more apparent speed at the same duration. |
| `--lobes <n>` | Bulges travelling around the outline (default 2). |
| `--lock <i,j>` | Vertex indices that must not move. |
| `--axis <radial\|x\|y>` | Direction offsets are spent in. Default `radial` suits round blobs; see below. |
| `--bias <both\|positive\|negative>` | Keep every offset on one side of the base outline. `positive` is down/right. |
| `--taper` | Fade offsets out towards locked vertices, so anchored edges cannot kink. |
| `--bounds <min,max>` | Clamp vertices to a band on the deform axis. Needs `--axis x` or `--axis y`. |
| `--css <name>` | Emit a ready-to-paste `@keyframes` block. |

Vertex 0 is the `M` point; vertex *i* is the end of cubic *i-1*.

Locking matters for edge-anchored shapes. The top-left blob is flush with the viewport, so its corner vertices must stay put:

```bash
node scripts/normalize-svg-path.ts --file src/includes/page-top-left-bg.html \
  --deform 8 --lock 0,7,8 --css page-top-blob-idle
```

If an anchor drifts, a background-coloured gap opens at the edge.

#### Wide flat shapes need an axis

The default radial deform pushes each vertex away from the centroid, which assumes a
roughly round blob. `#border` in the sprite is 1440 × 45: its centroid sits near
`(700, 24)`, so every vertex on the top edge is hundreds of units away horizontally
but only ~20 vertically, and the radial direction is almost pure x. Most of the
amplitude then goes sideways, where an outline with a slope of ~0.07 hides it — a
4-unit offset changes the line's height by about a quarter of a pixel.

Spend the amplitude on one axis instead, taper into the locked edge anchors, and
clamp to the viewBox band:

```bash
node scripts/normalize-svg-path.ts --file src/includes/iconset.html --index 1 \
  --deform 14 --stops 5 --lobes 2 --axis y --taper --bounds 4,42 \
  --lock 4,5,6,7,8 --css section-border-wave-line
```

`--bounds` matters because a shape this shallow has very little room: the border's
crest sits 3.7 units below the viewBox top, so it cannot rise at all without the
renderer clipping it into a flat line. Keep the lower bound at or just above the
shape's own minimum, or the resting silhouette shifts and the crest pins in place
for part of the cycle.

### 3. Two motion layers

`d` supplies organic texture; `transform` supplies the motion you actually perceive. A `d` morph is perceptually weak because vertices move in different directions and the centroid barely shifts, so it partially cancels. `transform` moves every edge together and is composited.

```css
.header-nav-bg-blob-mid {
	--blob-duration: 10s;
	transform-box: fill-box;
	transform-origin: center;
	animation:
		header-blob-mid-idle var(--blob-duration) linear infinite,
		header-blob-mid-drift 19s ease-in-out infinite alternate;
	animation-delay: calc(-0.4 * var(--blob-duration)), -7s;
}

@keyframes header-blob-mid-drift {
	to {
		transform: rotate(4deg) scale(1.06) translate(10px, -8px);
	}
}
```

`transform-box: fill-box` is required or SVG transforms pivot off the viewBox origin.

Use `linear` for the `d` loop. `ease-in-out` across multiple stops dwells at every stop, which reads as mechanical pumping. Keep `ease-in-out` for the transform drift.

Give each blob co-prime-ish durations (8s / 10s / 19s) so nothing visibly re-syncs.

### 4. Negative `animation-delay`

Without it every animation starts at its base state, so the composition sits visibly at rest on load and only looks good later in the cycle. Negative delays start mid-cycle. Declare `animation-delay` **after** the `animation` shorthand or the shorthand resets it.

### 5. Clipping

The outer `<svg>` clips at its viewBox by default. Paths that graze x=0 (the header small blob has control points at `-0.433`) get flattened once a transform pushes them further out. Fix with `overflow: visible` on the SVG rather than resizing the viewBox:

```css
.header-nav-bg {
	overflow: visible;
}
```

Safe here because `overflow-x: hidden` on the page wrapper (`src/css/globals/system.css`) prevents a horizontal scrollbar, and nav content sits above via `z-index: 1`.

## Animating a sprite symbol

`#border` and `#blob` are rendered through `<use xlink:href="#border">`, which clones
the symbol's `<path>` into a shadow tree. Document CSS cannot select into that tree,
so a rule like `.section-border path` never matches. Style the original path inside
the `<symbol>` instead; measured in Chrome, all of this reaches every instance even
though the sprite carries `style="display: none"`:

- a static CSS `d` or `transform`
- an animated `d`
- an animated `transform`

Per-instance tuning rides on custom properties, the same way `--background-base`
already reaches the fill:

```css
.section-border-wave-line {
	animation: section-border-wave-line 10s linear infinite;
	animation-delay: var(--border-wave-delay, -4s);
}

#page-footer .section-border {
	--border-wave-delay: -7s;
}
```

Two gotchas when verifying this from the console: `getComputedStyle` on the sprite
path reports the *base* value because animations do not run inside a `display: none`
subtree, and `getBoundingClientRect` on the `use` element does not reflect a
transform applied inside the shadow tree. Both make a working animation look broken.
Judge it from a screenshot or from `getPointAtLength` on an equivalent inline path.

## Tuning order

Symptom → fix:

- **Can't see it** → shorten duration first, then raise `--stops`, then raise `--deform`. At 1px/second of edge travel motion is below the noticing threshold; ~48px shapes need 6–10px of movement. On a wide flat shape check `--axis` before touching anything else.
- **Jelly / melting** → lower `--deform`, lower the transform `scale`.
- **Snaps instead of morphs** → command structure mismatch; re-normalize.
- **Lumpy or kinked** → offsets too large relative to segment length; lower `--deform`, or add `--taper` when vertices sit next to locked ones.
- **Bad start, good mid-cycle** → missing negative `animation-delay`, or uneven keyframe spacing. `--css` output makes stop 1 double as `0%, 100%` so the loop never returns to the undeformed shape and every leg is equal.
- **Flat edge appears** → viewBox clipping, or a locked anchor drifted. On a shallow shape add `--bounds`.
- **Amplitude has nowhere to go** → the shape already fills its viewBox. Measure the headroom per vertex before blaming the settings; a 45-unit-tall band holding a 28-unit wave caps the whole effect, and the honest fix is a taller viewBox.

Trust measurement over impression when judging "too subtle": sample
`getPointAtLength` on the animated path over a full cycle and compare the distance
travelled per second against the 1px/second threshold.

## Deliberately deferred

`.header-nav-bg-blob-main` is ~80 cubics, most of them converted `L` segments along a staircase. Deforming it uniformly looks noisy. If attempted, lock the closing edge vertices and keep offsets tiny.

## Verify

```bash
node --test test/scripts/normalize-svg-path.test.ts
npm run lint:css
```
