# Liquid Parser

Custom Liquid template parser. Reference: [LiquidJS Tags](https://liquidjs.com/tags/overview.html)

## Tags

### Control Flow


| Tag             | Status          |
| --------------- | --------------- |
| `if`            | Done            |
| `elsif`         | Done            |
| `else`          | Done            |
| `unless`        | Not implemented |
| `case` / `when` | Not implemented |


### Iteration


| Tag                     | Status                         |
| ----------------------- | ------------------------------ |
| `for`                   | Partial (basic `for..in` only) |
| `else` (empty fallback) | Done                           |
| `break`                 | Done                           |
| `continue`              | Done                           |
| `forloop` object        | Done                           |
| `limit` / `offset`      | Not implemented                |
| Range `(1..5)`          | Not implemented                |
| `reversed`              | Not implemented                |
| `cycle`                 | Not implemented                |
| `tablerow`              | Not implemented                |


### Variable


| Tag                       | Status          |
| ------------------------- | --------------- |
| `assign`                  | Done            |
| `capture`                 | Not implemented |
| `increment` / `decrement` | Not implemented |
| `echo`                    | Not implemented |


### File


| Tag       | Status          |
| --------- | --------------- |
| `render`  | Done            |
| `include` | Not implemented |
| `layout`  | Not implemented |


### Language


| Tag                  | Status          |
| -------------------- | --------------- |
| `#` (inline comment) | Done            |
| `raw`                | Not implemented |
| `comment` (block)    | Not implemented |
| `liquid`             | Not implemented |


## Operators


| Operator                         | Status                     |
| -------------------------------- | -------------------------- |
| `==`, `!=`, `>`, `<`, `>=`, `<=` | Done                       |
| `contains`                       | Done                       |
| `and`, `or`                      | Partial (simple form only) |


## Filters

Filters used in `src/` templates that need to be implemented.


| Filter          | Example                                      | Status          |
| --------------- | -------------------------------------------- | --------------- |
| `date`          | `{{ post.date | date: "%Y-%m-%d" }}`         | Not implemented |
| `dateToRFC3339` | `{{ site.timestamp | dateToRFC3339 }}`       | Not implemented |
| `encodeXML`     | `{{ site.description | encodeXML }}`         | Not implemented |
| `join`          | `{{ keywords | join: ',' }}`                 | Not implemented |
| `replace`       | `{{ page.url | replace: 'index.html', '' }}` | Not implemented |
| `prepend`       | `{{ page.url | prepend: site.baseurl }}`     | Not implemented |


