# @cosmonaut/layouter

Wadler-style pretty printing — the same lineage Prettier builds on.

The package has two halves that meet at the **Doc tree**:

| | file | job |
|---|---|---|
| **builders** | `builders.js` | describe layout *intent* — "this group may break", "this is a soft line" |
| **printer** | `print.js` | make layout *decisions* — measure against a width, break or don't |

Building a Doc never fails and never inspects any state. Every width-dependent choice happens once, inside `print()`.

## Installation

```sh
deno install jsr:@cosmonaut/layouter
```

## Usage

```js
import { text, concat, group, indent, softline, line, joinMap, print } from '@cosmonaut/layouter';

const genArgs = args => group(concat(
  text('('),
  indent(concat(softline, joinMap(args, concat(text(','), line), text))),
  softline,
  text(')'),
));

const doc = concat(text('greet'), genArgs(['alice', 'bob', 'charlie']));

print(doc, { width: 80 }); // "greet(alice, bob, charlie)"
print(doc, { width: 10 }); // "greet(\n  alice,\n  bob,\n  charlie\n)"
```

---

## Builders

### Atoms

- `text(value)` — a literal fragment
- `nil` — the empty doc (identity element for `concat`)
- `line` — space when flat, newline when broken
- `softline` — nothing when flat, newline when broken
- `hardline` — always a newline, regardless of the enclosing group

### Layout

- `concat(...docs)` — joins docs one after another
- `group(doc, { shouldBreak })` — a unit the printer renders flat or broken, depending on whether it fits the remaining width
- `indent(doc, amount)` — increases indentation for everything inside
- `ifBreak(brokenDoc, flatDoc)` — picks a doc depending on whether the enclosing group ended up broken (e.g. a trailing comma)
- `lineSuffix(doc)` — defers `doc` until the next real line break, regardless of where in the tree it was inserted. Used for trailing comments that must stick to the end of the current output line even though more content is generated after them.

### Convenience

- `wrap(open, doc, close)` — e.g. `wrap('(', inner, ')')`. Note: `open` and `close` are plain strings, not Docs.
- `join(docs, separator)` — interleaves a separator between docs
- `joinMap(items, separator, fn)` — `join(items.map(fn), separator)`

---

## Printer

### `print(doc, options?)`

- `doc` — a Doc built with the builders above
- `options.width` — target line width in columns (default `80`)
- `options.indentSize` — spaces per indent level, used when an `indent(doc)` call doesn't specify its own `amount` (default `2`)

Returns the rendered string.

### How it works

Each `group` is checked once, via a bounded lookahead (`fits`), against the remaining width on the current line — including whatever still has to be printed afterwards on that same outer stack. If it fits, the group's `line` / `softline` docs render flat (space / nothing); if it doesn't, they render as real line breaks, and any `indent` wrapping them takes effect.

Before that, a pure pre-pass (`propagateBreaks`) marks any `group` containing a `hardline` as forced-to-break. Without it, `fits()` would report such a group as "fits flat" the moment it reached the hardline — correct in isolation, but the group's own `line` / `softline` siblings would then wrongly render as spaces.

`lineSuffix(doc)` content is buffered and flushed immediately before the next real line break, no matter how much other content was generated after it in the tree — the mechanism behind trailing line comments.

---

## Node tags

`DOC_TEXT`, `DOC_CONCAT`, `DOC_LINE`, `DOC_GROUP`, `DOC_INDENT`, `DOC_IF_BREAK`, `DOC_LINE_SUFFIX` are exported from `nodes.js`. You only need them to write your own Doc consumer; the builders and `print()` cover normal use.

## Dependencies

None. This package knows nothing about tokens, ASTs, or the rest of the toolkit — it turns a Doc into a string, and that's it.
