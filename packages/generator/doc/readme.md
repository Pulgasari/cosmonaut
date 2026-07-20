# @cosmonaut/doc

Pure Doc-building blocks for pretty-printing, in the tradition of
Wadler's "A Prettier Printer" (the same lineage Prettier itself builds on).

Building a Doc never fails and never touches any layout decision -
it only describes structure and intent ("this can be a group that may
break", "this is a soft line", ...). Turning a Doc into an actual string,
with real line-breaking decisions based on width, is the job of
[`@cosmonaut/doc-printer`](../doc-printer).

## Installation

```sh
deno install jsr:@cosmonaut/doc
```

## Atoms

- `text(value)` - a literal fragment
- `nil` - the empty doc (identity element for `concat`)
- `line` - space when flat, newline when broken
- `softline` - nothing when flat, newline when broken
- `hardline` - always a newline, regardless of the enclosing group

## Layout

- `concat(...docs)` - joins docs one after another
- `group(doc, { shouldBreak })` - a unit that the printer decides to
  render flat or broken, based on whether it fits the remaining width
- `indent(doc, amount)` - increases indentation for everything inside
- `ifBreak(brokenDoc, flatDoc)` - pick a doc depending on whether the
  enclosing group ended up broken (e.g. a trailing comma)
- `lineSuffix(doc)` - defers `doc` until the next real line break,
  regardless of where in the tree it was inserted. Used for trailing
  comments that must stick to the end of the current output line even
  though more content is generated after them in the tree.

## Convenience helpers

- `wrap(open, doc, close)` - e.g. `wrap('(', inner, ')')`. Note: `open`
  and `close` are plain strings, not Docs.
- `join(docs, separator)` - interleaves a separator between docs
- `joinMap(items, separator, fn)` - `join(items.map(fn), separator)`

## Example

```js
import { text, concat, group, indent, softline, line, joinMap } from '@cosmonaut/doc';
import { print } from '@cosmonaut/doc-printer';

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
