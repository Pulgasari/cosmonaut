# @cosmonaut/parser

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
  - [Parser](#parser-class)
  - [ParserState](#parserstate-class)
  - [Blocks (Combinators)](#blocks-combinators)
  - [Methods](#methods)
- [Usage](#usage)
  - [Basic Setup](#basic-setup)
  - [Registering Custom Methods](#registering-custom-methods)
  - [Method Naming Rules](#method-naming-rules)
- [Public API Reference](#public-api-reference)
  - [Token Access](#token-access)
  - [State-Like Interface](#state-like-interface)
  - [Dispatch](#dispatch)
  - [Higher-Level Methods](#higher-level-methods)
- [Code Examples](#code-examples)
  - [Defining a Statement Dispatcher](#defining-a-statement-dispatcher)
  - [Using p.parse() in Three Equivalent Ways](#using-pparse-in-three-equivalent-ways)
  - [Building a Binary Expression Parser](#building-a-binary-expression-parser)
  - [Building a Comma-Separated List](#building-a-comma-separated-list)
- [Available Blocks](#available-blocks)
- [Coding Style](#coding-style)
- [Known Limitations / Open Items](#known-limitations--open-items)

---

## Overview

`@cosmonaut/parser` is the parsing layer of the Cosmonaut compiler toolkit. It provides a `Parser` class (`CosmonautParser`) that combines:

1. A **token stream state** (`ParserState`), tracking position, lookahead, and backtracking.
2. A set of **low-level parser combinators** ("blocks"), imported from `@cosmonaut/blocks` and re-exported here, used to compose parsing logic (`seq`, `choice`, `many`, `map`, etc.).
3. A set of **higher-level parsing methods** (`parsePattern`, `parseListPattern`, `parseBinaryExpr`, `parseUnaryExpr`), which cover common recurring parsing patterns (grammar rule shorthand, separated lists, operator precedence climbing).
4. A **method registration system**, allowing a language implementor to plug in custom grammar rules (e.g. `parseStatement`, `parseIfStatement`) which then become available as `p.parseX()`, `p.X()`, `p.parse('X')`, and `p.parse['X']`.

The design goal is that a `Parser` instance (`p`) can be passed directly into any `@cosmonaut/blocks` combinator, since it implements the same state-like interface (`save`, `restore`, `peek`, `next`, `eof`, `check`, `match`, `consume`) that the combinators expect.

---

## Installation

```sh
deno install jsr:@cosmonaut/parser
```

or, with npm-compatible tooling:

```sh
npm install @cosmonaut/parser
```

---

## Core Concepts

### Parser class

Located at `classes/Parser.js`. This is the main entry point (`CosmonautParser`). It wraps a `ParserState` instance, exposes the block combinators under `p.$`, and dynamically registers custom parsing methods supplied via configuration.

### ParserState class

Located at `classes/ParserState.js`. Holds the token array and current index. Provides the primitive operations every parser needs:

- `save()` / `restore(position)` — checkpoint and rollback for backtracking
- `peek(offset)` — look at a token without consuming it
- `next()` — consume and return the current token
- `check(typeOrValue)` — test the next token's type or value
- `match(typeOrValue)` — consume the next token only if it matches
- `consume(typeOrValue)` — like `match`, but throws if there is no match
- `isEOF()` — whether the token stream is exhausted

### Blocks (Combinators)

Located at `blocks/`. Pure, standalone functions that build parsers out of other parsers. Grouped into four files:

- `atoms.js` — smallest building blocks (`token`, `check`, `expect`, `any`, `eof`, `succeed`, `fail`)
- `flow.js` — control flow (`seq`, `choice`, `optional`, `between`, `lookAhead`, `not`, `cut`, `lazy`, `then`, `skip`)
- `repeat.js` — repetition (`many`, `many1`, `times`, `sepBy`, `sepEndBy`, `manyTill`, ...)
- `chain.js` — context-sensitive and left/right-associative chaining (`chain`, `chain1`, `chainl1`, `chainr1`)
- `transform.js` — result transformation (`map`, `capture`, `filter`, `tap`, `value`)

These blocks are also published independently as `@cosmonaut/blocks` and can be used without the `Parser` class.

### Methods

Located at `methods/`. Higher-level, reusable parsing routines built on top of the blocks, intended to cover patterns that show up in almost every grammar:

- `parsePattern.js` — compiles a shorthand pattern string (e.g. `"IDENTIFIER = Expr"` with a matching strategy string) into a parser
- `parseListPattern.js` — parses a separated, optionally wrapped list (e.g. `(a, b, c)`)
- `parseBinaryExpr.js` — precedence-climbing parser for binary operator expressions
- `parseUnaryExpr.js` — parser for prefix unary operators with special-case overrides

---

## Usage

### Basic Setup

```js
import Parser from '@cosmonaut/parser';
import * as methods from './myLangParseMethods.js';

const myLangParserConfig = {
  methods,
  entry: 'Program', // name of the root parsing rule, defaults to "Program"
};

const myInputTokens = []; // produced by a lexer, e.g. @cosmonaut/lexer
const myLangParser  = new Parser(myInputTokens, myLangParserConfig);
const myLangAST     = myLangParser.run();
```

### Registering Custom Methods

Custom parsing methods are plain functions with the signature `(p, ...args) => result`, where `p` is the `Parser` instance itself. They are passed in as an object:

```js
// myLangParseMethods.js

export function parseLabeledStatement (p) {
  const label = p.advance().value; // identifier
  p.advance(); // ':'
  const body = p.parse('Statement');
  return ASTNode.LabeledStatement({ label, body });
}

export function parseWhileStatement (p) {
  p.advance(); // 'while'
  const test = p.parse('Wrapped', '()', 'ConditionTest');
  const body = p.parse('Block');
  return ASTNode.WhileStatement({ test, body });
}

export function parseStatement (p) {
  if (p.checkSequence('IDENTIFIER', ':')) return p.parse('LabeledStatement');

  return p.dispatch({
    'alias' : 'AliasDeclaration',
    'async' : 'FunctionDeclaration',
    'break' : 'BreakStatement',
    'class' : 'ClassDeclaration',
  }).or('ExprStatement');
}
```

Once registered, each method becomes available in several equivalent forms (see [Using p.parse() in Three Equivalent Ways](#using-pparse-in-three-equivalent-ways)).

### Method Naming Rules

A registered method key must follow one of two formats:

- `parseMethodName` — `"parse"` prefix followed by a title-case name
- `MethodName` — a bare title-case name, no prefix

Both forms resolve to the same internal name (`MethodName`) and produce the same set of call forms on `p`.

---

## Public API Reference

### Token Access

| Method | Description |
|---|---|
| `p.check(typeOrValue)` | Tests whether the next token matches, without consuming it |
| `p.match(typeOrValue)` | Consumes the next token if it matches, otherwise returns `null` |
| `p.expect(typeOrValue)` | Consumes the next token if it matches, otherwise throws |
| `p.consume(typeOrValue)` | Alias of `expect`, used internally by the block combinators |
| `p.advance()` | Consumes and returns the next token unconditionally |
| `p.checkSequence(...values)` | Tests a sequence of upcoming tokens by type or value |
| `p.matchSequence(...values)` | Consumes a sequence of tokens if all match |
| `p.expectSequence(...values)` | Consumes a sequence of tokens, or throws if any fails to match |

### State-Like Interface

So that `p` can be passed directly as the `state` argument into any `@cosmonaut/blocks` combinator:

| Method | Description |
|---|---|
| `p.save()` | Returns a checkpoint (current index) |
| `p.restore(position)` | Rolls back to a previous checkpoint |
| `p.peek(offset = 0)` | Looks ahead without consuming |
| `p.next()` | Consumes and returns the next token |
| `p.eof()` | Whether the end of the token stream has been reached |

### Dispatch

`p.dispatch(table)` takes an object mapping a token type/value to a method name, tests each key against the current token via `p.check(...)`, and parses using the first match. It returns an object with a single `.or(fallbackName)` method, used to specify a default rule when nothing in the table matches:

```js
p.dispatch({
  'if'    : 'IfStatement',
  'for'   : 'ForStatement',
  'while' : 'WhileStatement',
}).or('ExprStatement');
```

### Higher-Level Methods

| Method | Description |
|---|---|
| `p.parsePattern(pattern, strategies, capture)` | Parses a shorthand grammar pattern string |
| `p.parseListPattern(element, config)` | Parses a separated (and optionally wrapped) list |
| `p.parseBinaryExpr(config, minPrecedence)` | Precedence-climbing binary expression parser |
| `p.parseUnaryExpr(config)` | Prefix unary expression parser |

---

## Code Examples

### Defining a Statement Dispatcher

```js
export function parseStatement (p) {
  return p.dispatch({
    'const' : 'VariableDeclaration',
    'let'   : 'VariableDeclaration',
    'return': 'ReturnStatement',
    '{'     : 'Block',
  }).or('ExprStatement');
}
```

### Using p.parse() in Three Equivalent Ways

Once `IfStatement` has been registered (as `parseIfStatement` or `IfStatement`), all of the following are equivalent:

```js
p.parseIfStatement();
p.IfStatement();
p.parse('IfStatement');
p.parse.IfStatement();
```

### Building a Binary Expression Parser

```js
const config = {
  operators: {
    '+': { precedence: 1 },
    '-': { precedence: 1 },
    '*': { precedence: 2 },
    '/': { precedence: 2 },
  },
  parseOperand: () => p.parse('Primary'),
  buildNode: (operator, left, right) => ({ type: 'BinaryExpression', operator, left, right }),
};

const expr = p.parseBinaryExpr(config);
```

### Building a Comma-Separated List

```js
// parses e.g. "(foo, bar, baz)"
const args = p.parseListPattern('Identifier', ', ()');
```

Here `', ()'` specifies the separator (`,`) and the wrapping punctuation (`(` and `)`).

---

## Available Blocks

The following combinators are re-exported from `@cosmonaut/blocks` and are accessible via `p.$`:

**Atoms:** `any`, `check`, `eof`, `expect`, `fail`, `succeed`, `token`

**Flow:** `between`, `choice`, `cut` (alias: `commit`), `lazy`, `lookAhead`, `not`, `optional`, `seq`, `skip`, `then`

**Chain:** `chain`, `chain1`, `chainl1`, `chainr1`

**Repeat:** `atLeast`, `atMost`, `many`, `many1`, `manyTill`, `many1Till`, `repeat`, `sepBy`, `sepBy1`, `sepEndBy`, `sepEndBy1`, `times`

**Transform:** `capture`, `filter`, `map`, `tap`, `value`

Refer to `packages/parser/blocks/readme.md` for a full description and usage examples of each combinator, plus a glossary of parsing terminology (associativity, backtracking, cut/commit, lookahead, etc.).

---

## Coding Style

- Indentation: 2 spaces
- Function definitions use a space before the parameter list: `function (args) { ... }`
- All comments and error messages are written in English
- Modern JavaScript syntax is preferred, except where it has a significant negative performance impact

---

## Known Limitations / Open Items

- `parseBinaryExpr.js` currently references a `matchOperator(...)` helper that has not yet been implemented.
- Error messages from `cut()` and `expect()` do not yet include line/column information; only token index.
- No dedicated `index.d.ts` exists yet for editor/type support.
  
