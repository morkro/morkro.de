# Liquid Parser

Custom Liquid template parser. Language reference: [Liquid template language](https://shopify.github.io/liquid/).

This file tracks what the parser/renderer under `liquid/` supports relative to common Liquid syntax (tags, output, filters, conditions). Hosts may add their own tags or filters; those are out of scope here unless listed as implemented.

Shared helpers used by the frontmatter parser and Liquid (indent width, quote stripping, etc.) live in [`utils.ts`](utils.ts) in this directory.

## Scope (language features)

| Area | Notes |
| ---- | ----- |
| **Template context** | Variables and values come from the host (e.g. `assign`, `render` bindings), not from anything defined inside this README. |
| **Whitespace control** | `{{-` / `-}}` / `{%-` / `-%}` — not implemented. |
| **Filters** | Pipe chains in `{{ … }}`, `assign`, and `echo`. Built-in filters in `liquid/filters.ts`; user filters via `__filters__` in the render context. |
| **`liquid` tag** | Multiple statements in one `{% liquid %}` block — not implemented. |

## Expressions

| Feature | Status |
| ------- | ------ |
| String / number literals | Done |
| Variables and dot paths (`a.b.c`) | Done |
| Range literals `(expr..expr)` (e.g. for `for`) | Done |
| Bracket access (`x[0]`, `x["key"]`, `x[var]`) | Done |
| Arithmetic (`+`, `-`, `*`, `/`), unary `not` | Done |
| Filter chains (`expr \| filter: arg1, arg2`) | Done |

## Tags

### Control flow

| Tag | Status |
| --- | ------ |
| `if` / `elsif` / `else` / `endif` | Done |
| `unless` / `else` / `endunless` | Done |
| `case` / `when` / `else` / `endcase` | Done |

### Iteration

| Tag / feature | Status |
| ------------- | ------ |
| `for` / `endfor` | Done |
| `else` (empty collection) | Done |
| `break` / `continue` | Done |
| `forloop` | Done |
| `limit` / `offset` | Done |
| Range `(1..5)` as collection | Done |
| `reversed` | Done |
| `cycle` | Done |
| `tablerow` / `endtablerow` | Done |

### Variable

| Tag | Status |
| --- | ------ |
| `assign` | Done (supports filters on the right-hand side) |
| `capture` / `endcapture` | Done |
| `increment` / `decrement` | Done |
| `echo` | Done |

### Partials / includes

| Tag | Status |
| --- | ------ |
| `render` | Done |
| `include` | Deprecated |
| `layout` | Done |

### Shortcodes

| Tag | Status |
| --- | ------ |
| `{% name %}` (single-ident custom tags) | Done — parsed as `ShortCode` node; resolved at render time from `shortCodes` in user config (`config.user.ts`). Unknown shortcodes throw at render time. |

### Language

| Tag | Status |
| --- | ------ |
| `#` (inline comment in `{% %}`) | Done |
| `comment` / `endcomment` | Done |
| `raw` / `endraw` | Done |
| `liquid` | Not implemented |

## Operators (conditions)

| Operator | Status |
| -------- | ------ |
| `==`, `!=`, `>`, `<`, `>=`, `<=` | Done |
| `contains` | Done |
| `and`, `or` | Done |
| `not` | Done |

## Filters

Filters are parsed as pipe chains (`| filterName: arg1, arg2`) on expressions in `{{ … }}` output tags, `{% assign %}`, and `{% echo %}`. The AST represents them as `ExpressionFilter` nodes wrapping the input expression and a list of `Filter` entries.

At render time, user-defined filters (from `__filters__` in the context) are checked first. If no user filter matches, the built-in set in `liquid/filters.ts` is used. Unknown filter names throw at render time.

### Built-in filters

| Filter | Purpose | Notes |
| ------ | ------- | ----- |
| `date` | Date formatting via named presets | Presets: `year`, `full`, `rfc3339`, `datetime`. Uses `Intl.DateTimeFormat` (locale `de-DE`) for `year`/`full`; manual formatting for `datetime`; `Date.toISOString()` for `rfc3339`. Accepts `Date`, numeric (epoch ms), or string input. |
| `join` | Join array elements | `{{ arr \| join: "," }}` — passes through `String()` for non-array input |
| `replace` | Replace all occurrences | `{{ str \| replace: "old", "new" }}` — uses `String.replaceAll()` |
| `prepend` | Prefix a string | `{{ path \| prepend: "/base" }}` — no-op if already prefixed |

### User-defined filters

Registered in `config.user.ts` under `filters`. Each entry is a function `(input, ...args) => value`. Currently registered:

| Filter | Purpose |
| ------ | ------- |
| `encodeXML` | XML entity escaping (`&`, `<`, `>`, `"`, `'`) |
