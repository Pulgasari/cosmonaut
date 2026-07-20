# @cosmonaut/doc-printer

Renders a [`@cosmonaut/doc`](../doc) tree into a string, deciding for
each `group` whether it fits flat within the configured width or must
break onto multiple lines.

## Installation

```sh
deno install jsr:@cosmonaut/doc-printer
```

## Usage

```js
import { text, concat, group, indent, softline, line, joinMap } from '@cosmonaut/doc';
import { print } from '@cosmonaut/doc-printer';

const genArgs = args => group(concat(
  text('('),
  indent(concat(softline, joinMap(args, concat(text(','), line), text))),
  softline,
  text(')'),
));

print(concat(text('greet'), genArgs(['alice', 'bob'])), { width: 80 });
// "greet(alice, bob)"

print(concat(text('greet'), genArgs(['alice', 'bob'])), { width: 5 });
// "greet(\n  alice,\n  bob\n)"
```

## API

### `print(doc, options?)`

- `doc` - a Doc built with `@cosmonaut/doc`
- `options.width` - target line width in columns (default `80`)
- `options.indentSize` - spaces per indent level, used when an
  `indent(doc)` call doesn't specify its own `amount` (default `2`)

Returns the rendered string.

## How it works

Each `group` is checked once, via a bounded lookahead (`fits`), against
the remaining width on the current line, including whatever still
needs to be printed afterwards on that same outer stack. If it fits,
the group's `line`/`softline` docs render flat (space / nothing); if
it doesn't, they render as real line breaks, and any `indent` wrapping
them takes effect.

Before that, a pure pre-pass (`propagateBreaks`) marks any `group`
that contains a `hardline` as forced-to-break, so that its own
line/softline siblings render as real breaks consistently, rather than
being flattened to spaces just because a lookahead happened to hit the
hardline first.

`lineSuffix(doc)` content is buffered and only flushed immediately
before the next real line break (hard, or a broken group's line),
regardless of how much other content was generated after it in the
tree - the mechanism used for trailing line comments.
