# @cosmonaut/parser/blocks

Low-level parser combinators used to build higher-level parsing rules.

---

# Overview

## Atoms

[`any`](#any) ·
[`check`](#check) ·
[`eof`](#eof) ·
[`expect`](#expect) ·
[`token`](#token)

## Flow

[`choice`](#choice) ·
[`lazy`](#lazy) ·
[`lookAhead`](#lookahead) ·
[`not`](#not) ·
[`optional`](#optional) ·
[`seq`](#seq)

## Repeat

[`many`](#many) ·
[`many1`](#many1) ·
[`many1Till`](#many1till) ·
[`manyTill`](#manytill) ·
[`repeat`](#repeat) ·
[`sepBy`](#sepby) ·
[`sepBy1`](#sepby1) ·
[`sepEndBy`](#sependby) ·
[`sepEndBy1`](#sependby1)

## Transform

[`capture`](#capture) ·
[`filter`](#filter) ·
[`map`](#map) ·
[`tap`](#tap) ·
[`value`](#value)

---

# Docs

## any

Consumes and returns the next token, regardless of its type. Fails only at end of input.

---

## capture

Wraps a successful parser result in an object under the given property name.

```js
capture(identifier, "name")
```

↓

```js
{ name: result }
```

---

## check

Checks whether the next token matches the expected value or type without consuming it.

---

## choice

Tries multiple parsers in order and returns the first successful result. Automatically backtracks between attempts.

---

## eof

Succeeds only if the parser has reached the end of the token stream.

---

## expect

Consumes the next matching token or throws a syntax error.

---

## filter

Accepts a parser result only if the given predicate returns `true`.

---

## lazy

Defers parser creation until parse time. Useful for recursive grammars.

---

## lookAhead

Runs a parser without consuming any input.

---

## many

Parses zero or more occurrences of a parser.

Always succeeds.

---

## many1

Parses one or more occurrences of a parser.

Fails if the first occurrence cannot be parsed.

---

## many1Till

Parses one or more occurrences until the terminating parser succeeds.

---

## manyTill

Parses zero or more occurrences until the terminating parser succeeds.

The terminator is consumed but not included in the returned results.

---

## map

Transforms a parser result using the supplied function.

---

## not

Succeeds only if the given parser fails. Consumes no input.

---

## optional

Attempts a parser and returns `null` instead of failing.

Consumes no input on failure.

---

## repeat

Parses a parser exactly *n* times.

---

## sepBy

Parses zero or more elements separated by another parser.

Always succeeds.

---

## sepBy1

Parses one or more elements separated by another parser.

---

## sepEndBy

Parses zero or more elements separated and optionally terminated by a separator.

---

## sepEndBy1

Parses one or more elements separated and optionally terminated by a separator.

---

## seq

Runs multiple parsers sequentially.

Succeeds only if every parser succeeds.

---

## tap

Executes a callback with the parser result without modifying it.

Useful for debugging or collecting statistics.

---

## token

Consumes and returns a token matching the given type or value.

---

## value

Replaces a successful parser result with a constant value.
