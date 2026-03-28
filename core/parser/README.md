# Liquid Parser

Custom Liquid template parser. Language reference: [Liquid template language](https://shopify.github.io/liquid/).

This file tracks what the parser/renderer under `liquid/` supports relative to common Liquid syntax (tags, output, filters, conditions). Hosts may add their own tags or filters; those are out of scope here unless listed as implemented.

## Scope (language features)

| Area | Notes |
| ---- | ----- |
| **Template context** | Variables and values come from the host (e.g. `assign`, `render` bindings), not from anything defined inside this README. |
| **Whitespace control** | `{{-` / `-}}` / `{%-` / `-%}` — not implemented. |
| **Filters** | Pipe chains in `{{ … }}` and filters on the right-hand side of `assign` / `capture` — not implemented. |
| **`liquid` tag** | Multiple statements in one `{% liquid %}` block — not implemented. |

## Expressions

| Feature | Status |
| ------- | ------ |
| String / number literals | Done |
| Variables and dot paths (`a.b.c`) | Done |
| Range literals `(expr..expr)` (e.g. for `for`) | Done |
| Bracket access (`x[0]`), arithmetic (`+`, `-`, `*`, `/`), unary `not` | Not implemented |

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
| `cycle` | Not implemented |
| `tablerow` / `endtablerow` | Not implemented |

### Variable

| Tag | Status |
| --- | ------ |
| `assign` | Done (expression only; no filters on the right-hand side) |
| `capture` / `endcapture` | Done |
| `increment` / `decrement` | Not implemented |
| `echo` | Not implemented |

### Partials / includes

| Tag | Status |
| --- | ------ |
| `render` | Done |
| `include` | Deprecated |
| `layout` | Not implemented |

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

## Filters

Built-in Liquid filters from the language (e.g. `upcase`, `split`, `default`, `truncate`) are **not** implemented unless added explicitly.

Filters needed for templates under `src/` (this site):

| Filter | Purpose | Status |
| ------ | ------- | ------ |
| `date` | `strftime`-style formatting | Not implemented |
| `dateToRFC3339` | Site timestamps | Not implemented |
| `encodeXML` | Escaping for feeds/meta | Not implemented |
| `join` | Join arrays (e.g. keywords) | Not implemented |
| `replace` | String replace | Not implemented |
| `prepend` | Prefix URLs with base URL | Not implemented |
