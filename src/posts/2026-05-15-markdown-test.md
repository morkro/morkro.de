---
layout: post
title: "Testing all Markdown features for my parser"
pageClass: article
tags:
  - foo
---

## Headings

# Heading level 1
## Heading level 2
### Heading level 3
#### Heading level 4
##### Heading level 5
###### Heading level 6

## Lines

---
***
___

## Lists

### Ordered list

1. Foo
2. Bar
3. Check

### Unorderd list

- Foo
+ Bar
* Baz
* With checkbox now
- waitfor it
- [ ] unchecked
- [x] checked

#### Nested lists

- One
- Two
  - One.One
  - One.Two
    - Two.Three

1. One
2. Two
  1. One.One
    1. Two.One

#### Mixed list

- Foo
2. Bar
- Baz
4. Shazam

## Tables

### Table

| Column A | Column B | Column C |
| --- | :---: | ---: |
| Foo | **Bar** | Baz |
| One | _Two_ | Three |

## Code

```ts
export type RenderServices = {
  page: Record<string, unknown>
  content: Record<string, unknown>
  collections: Record<string, unknown>
  __shortCodes__: Record<string, ShortCodeFn>
  __filters__: Record<string, FilterFn>
  __counters__: Map<string, number>
  __cycles__: Map<string, number>
}
```

## Blockquotes

> Single-line blockquote.

> Multi-line blockquote
> that spans across
> several lines.

> First quote.

> Second quote separated by a blank line.

## Links

This is an [inline link](https://example.com) within a paragraph.

[Link with title](https://example.com "Example title")

## Images

![Alt text](https://example.com/image.png)

![Alt with title](https://example.com/image.png "Image title")

## Hard breaks

This line ends with two trailing spaces  
so the next line starts after a hard break.

## Inline inside other blocks

> A blockquote with **bold**, *italic*, ~~strike~~, `code`, and a [link](https://example.com).

- List item with **bold** and *italic* and a [link](https://example.com)
- [ ] Unchecked task with `inline code`
- [x] Done task with ~~strike~~

| Plain | **Bold cell** | *Italic cell* |
| --- | --- | --- |
| `code` | [link](https://example.com) | ~~strike~~ |

## HTML

### Inline HTML

This a comment with <div class="very-inline">HTML</div>

### Block HTML

<section id="section-block">
  <h1>HTML headline</h1>

  Super text without paragraph.
</section>

## Edge cases

1 < 2 should be `1 < 2`

For `<div>` backtick wins.

The following is a <a href="x">link</a>, is it?

## Backslash escapes

\*not italic\* and \_not italic\_ and \`not code\`.

\\ shows a literal backslash; \! prevents \[the brackets\] from forming a link.

Mixed: \*one\* and *two* — first literal, second italic.

Inside a code span: `\*still backslash-star\*` — escapes are inert here.

A bare backslash at end-of-text \ should remain as text.

## Autolinks

URL: <https://example.com> works.

URL with query: <https://example.com/path?a=1&b=2>.

Email: <foo@bar.com> works.

Tel: <tel:+4915112345678>.

Inside a list:
- <https://example.org>
- <a@b.com>

Should NOT autolink:

- empty: <>
- whitespace inside: <not a url>
- unclosed: <https://example.com no close
- escaped: \<https://example.com\>

### Tricky links

Parens in URL: [Wikipedia](https://en.wikipedia.org/wiki/Foo_(bar)).

Angle-bracket URL with spaces: [docs](<https://example.com/with spaces>).

Nested brackets in text: [see [section 2]](https://example.com).

Single-quoted title: [link](https://example.com 'single quotes work').

Paren-delimited title: [link](https://example.com (paren title)).

Escaped parens in URL: [link](https://example.com/a\(b\)c).

Escaped bracket in text: [text \[with bracket\]](https://example.com).

Title in link finally renders: [hover me](https://example.com "tooltip").

### Tricky images

![alt with [brackets]](https://example.com/img.png "title")

![paren URL](https://example.com/img_(v2).png)

## HTML entities

Named: &copy; &reg; &trade; &hellip; &mdash; &ndash; &laquo; &raquo; &euro;.

Decimal: &#169; &#174; &#8482; &#8230; &#8212;.

Hex: &#x00A9; &#x00AE; &#x2122; &#x2026; &#x2014;.

Edge cases:

- Missing semicolon (literal): &copy and &#169 and &#x2122 — all plain text.
- Just an ampersand: Salt & Pepper renders &amp; in source.
- Escaped (literal): \&copy; should render the four characters `&copy;`.
- Numeric digits only: &123; is not an entity, stays literal.
- Inside code (literal): `&copy;` and ```&copy;``` show the source.
- Inside a link: [&copy; notice](https://example.com).