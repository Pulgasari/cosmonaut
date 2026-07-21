# @cosmonaut/lsd

Compiles a **Language Specification Data (LSD)** document - a single
source of truth describing a language's tokenizer, grammar/AST shape,
codegen templates, and syntax-highlighting scopes - into the
corresponding configuration for `@cosmonaut/lexer`, `@cosmonaut/parser`,
and `@cosmonaut/generator`.

**Status: early / work in progress.** The concrete LSD syntax is not
finalized. `sections.js`, `meta.js`, `tokens.js`, and `highlighting.js`
parse their respective areas end-to-end. `grammar.js` and `compile.js`
are scaffolded with the intended shape and explicit open questions
documented inline - see the file headers before extending them.

## Structure of an LSD document

- `META PROP` / `META LIST` / `META TABLE` - reusable vocabulary
  (character classes, word lists, operator tables with precedence/
  associativity, mirroring the shape already used by
  `packages/presets/languages/javascript.js`'s `operators` export)
- `TKN` - ordered tokenizer rules, each either a raw sticky regex or a
  `@name` reference into a META LIST/TABLE
- `RULE` - grammar productions, at two levels:
  - top-level `RULE == Name == Expression` (structural helper rules)
  - `#### Name` blocks: a `META <BlockName>`, a `TYPE == { fields }`
    shape, one or more `RULE == pattern => mapping` alternatives, and a
    `CODE == \`template\`` for codegen
- `HL` - token type -> highlighting scope

## Key design insight

`#### Name` blocks are not a new concept - they combine two things
this toolkit already has:

- the pattern + capture-mapping already expressed by
  `@cosmonaut/parser`'s `parsePattern` (`capture` option)
- the field-interpolated template already expressible with
  `@cosmonaut/generator`'s `concat`/`genList`/`join`

A block like `BinaryExpression`, which has no precedence logic of its
own, is deliberately generic: precedence/associativity comes from
`META TABLE operators`, feeding directly into the *already-existing*
`parseBinaryExpr` / `genBinaryExpr` methods rather than needing any new
machinery.

## Usage (target shape, not fully wired up yet)

```js
import { parseLSD, compileLSD } from '@cosmonaut/lsd';

const lsd = parseLSD(source); // meta / tokens / highlighting work today;
                               // grammar is partially structured only

// once compile.js is filled in:
const { lexer, parserMethods, genMethods, highlighting } = compileLSD(source);
```

