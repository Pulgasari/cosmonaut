# @cosmonaut/parsers

Low-level parsers (*"combinators"*) for building recursive-descent parsers with higher-level parsing rules.

## Contract

Two rules govern every block in this package.

**1. `undefined` is the only failure value.** Every other result - including
`null` - is a successful match. `optional()` returns `null` when it matched
nothing, and that has to survive `seq()` / `choice()` untouched.

**2. Blocks take a *stream*, not a parser.** Any object implementing
`save()`, `restore(position)`, `peek(offset)`, `next()`, `eof()`, `check(t)`,
`match(t)` and `consume(t)` will do. `@cosmonaut/cosmonaut` hands its own
`TokenStream` to these blocks; a standalone user can pass anything with the
same shape.

## Installation

```sh
deno install jsr:@cosmonaut/blocks
```

---

[Parsers](#parsers) · 
[Docs](#docs) ·
[Examples](#examples)

---

# Parsers

### atoms

[`any`](#any) ·
[`check`](#check) ·
[`eof`](#eof) ·
[`expect`](#expect) ·
[`fail`](#fail) ·
[`succeed`](#succeed) ·
[`token`](#token)

### chains

[`chain`](#chain) ·
[`chainl1`](#chainl1) ·
[`chainr1`](#chainr1)

### flow

[`between`](#between) ·
[`choice`](#choice) ·
[`cut`](#cut) ·
[`lazy`](#lazy) ·
[`lookAhead`](#lookahead) ·
[`not`](#not) ·
[`optional`](#optional) ·
[`seq`](#seq) ·
[`skip`](#skip) ·
[`then`](#then)

### repeat

[`atLeast`](#atLeast) ·
[`atMost`](#atMost) ·
[`many`](#many) ·
[`many1`](#many1) ·
[`many1Till`](#many1till) ·
[`manyTill`](#manytill) ·
[`repeat`](#repeat) ·
[`sepBy`](#sepby) ·
[`sepByLoose`](#sepbyloose) ·
[`sepBy1`](#sepby1) ·
[`sepBy1Loose`](#sepby1loose) ·
[`sepEndBy`](#sependby) ·
[`sepEndBy1`](#sependby1) ·
[`times`](#times) ·

### transform

[`capture`](#capture) ·
[`filter`](#filter) ·
[`map`](#map) ·
[`tap`](#tap) ·
[`value`](#value)

---

# Docs

### any

Consumes and returns the next token, regardless of its type. Fails only at end of input.

```javascript
any()
```

### atLeast

Parses at least *n* occurrences of a parser. 

Fails if fewer than *n* are found.

```javascript
atLeast(token("IDENTIFIER"), 2)
```

### atMost

Parses at most *n* occurrences of a parser.

Always succeeds, even with zero matches.

```javascript
atMost(token("IDENTIFIER"), 3)
```

### between

Parses an opening parser, an inner parser, and a closing parser in sequence. 

Returns only the inner result.

```javascript
between(
  token("("),
  expression,
  token(")")
)
```

### capture

Wraps a successful parser result in an object under the given property name.

```javascript
capture(identifier, "name")
```

↓

```javascript
{ name: result }
```

### chain

Runs a parser, then uses its result to build the *next* parser to run. Unlike [`map`](#map), which only transforms the result, `chain` lets the result decide what gets parsed next — the basis for context-sensitive grammars.

```javascript
chain(
  token("LENGTH"),
  length => repeat(any(), Number(length.value))
)
```

### chain1

Like [`chain`](#chain), but repeats the bind step: each result is fed back into the same function to produce the next parser, until one fails.

Requires at least one successful step.

```javascript
chain1(
  identifier,
  prev => memberAccessFollowing(prev)
)
```

### chainl1

Parses a left-associative chain of operands separated by an operator, folding the result from left to right. 

A common way to build binary-expression parsing without a full precedence-climbing (Pratt) parser.

```javascript
chainl1(
  multiplicative,
  choice(token("+"), token("-")),
  (left, op, right) => ({ type: "BinaryExpression", operator: op.value, left, right })
)
```

Parses:

```javascript
a + b - c
```

as `((a + b) - c)`.

### chainr1

Like [`chainl1`](#chainl), but folds right-associatively — the rightmost application binds first. 

Used for operators like exponentiation (`^`) or assignment (`=`).

```javascript
chainr1(
  unary,
  token("^"),
  (left, op, right) => ({ type: "BinaryExpression", operator: "^", left, right })
)
```

Parses:

```javascript
a ^ b ^ c
```

as `(a ^ (b ^ c))`.

### check

Checks whether the next token matches a type or value without consuming it.

```javascript
check("IDENTIFIER")
check("+")
```

### choice

Tries multiple parsers in order and returns the first successful result. Automatically backtracks between attempts.

```javascript
choice(
  token("let"),
  token("const"),
  token("var")
)
```

### commit

Alias for [`cut`](#cut).

### cut

Marks a parser as non-backtrackable: if it fails past this point, the failure becomes a hard error instead of a silent `null`, so `choice` won't try another alternative. Used once a grammar rule is unambiguously committed (e.g. after matching a keyword).

```javascript
seq(
  token("if"),
  cut(expression, "expected condition after 'if'"),
  cut(block, "expected block after if-condition")
)
```

### eof

Succeeds only if the parser has reached the end of the [token stream](#token-stream).

Consumes no input.

```javascript
seq(expression, eof())
```

### expect

Consumes a token matching the given type or value, or throws a syntax error if it doesn't match.

```javascript
expect(token("SEMICOLON"))
```

### fail

A parser that always fails and consumes no input.

Useful as a neutral "zero" element when composing other parsers.

```javascript
fail()
```

### filter

Accepts a parser result only if it satisfies a predicate.

```javascript
filter(number, n => n.value > 0)
```

### lazy

Defers evaluation of a parser until it actually runs.

Needed to reference a rule before it's defined, e.g. for recursive grammars.

```javascript
const expression = lazy(() => choice(binary, unary, primary));
```

### lookAhead

Runs a parser and returns its result, but restores the position afterwards, so no input is consumed.

```javascript
lookAhead(token("function"))
```

### many

Parses zero or more occurrences.

Always succeeds.

```javascript
many(token("IDENTIFIER"))
```

### manyTill

Parses zero or more occurrences until a [terminator](#terminator) succeeds.

The [terminator](#terminator) is consumed but not included in the returned results.

```javascript
manyTill(
  any(),
  token(")")
)
```

### many1

Parses one or more occurrences of a parser.

Fails if the first occurrence cannot be parsed.

```javascript
many1(token("DIGIT"))
```

### many1Till

Parses one or more occurrences of a parser until a [terminator](#terminator) succeeds. 

Requires at least one match before the [terminator](#terminator) succeeds. Fails otherwise.

```javascript
many1Till(statement, token("}"))
```

### map

Transforms a parser result using the supplied function.

```javascript
map(
  token("NUMBER"),
  t => Number(t.value)
)
```

### not

Succeeds only if the given parser fails. 

Consumes no input.

```javascript
not(token("EOF"))
```

### optional

Attempts a parser and returns `null` instead of failing.

Consumes no input on failure.

```javascript
optional(token(","))
```

### repeat

Parses a parser exactly *n* times.

```javascript
repeat(token("DIGIT"), 4)
```

### sepBy

Parses zero or more elements separated by another parser.

Always succeeds.

```javascript
sepBy(expression, token(","))
```

### sepByLoose

Parses zero or more elements, with an **optional** separator between
each pair (not required, unlike [`sepBy`](#sepby)).

Always succeeds.

```javascript
sepByLoose(identifier, token(","))
```

Parses `a b c,` and `a, b, c,` and even mixed `a, b c` identically.

### sepBy1

Parses one or more elements separated by another parser.

```javascript
sepBy1(expression, token(","))
```

###sepBy1Loose

Like [`sepByLoose`](#sepbyloose), but requires at least one element.

```javascript
sepBy1Loose(identifier, token(","))
```

### sepEndBy

Parses zero or more elements separated and optionally terminated by a [separator](#separator).

```javascript
sepEndBy(property, token(","))
```

### sepEndBy1

Parses one or more elements separated and optionally terminated by a [separator](#separator).

```javascript
sepEndBy1(property, token(","))
```

### seq

Runs multiple parsers sequentially.

Succeeds only if every parser succeeds.

```javascript
seq(
  token("("),
  expression,
  token(")")
)
```

### skip

Runs a parser, then a second parser whose result is discarded. 

Returns only the first parser's result.

```javascript
skip(expression, token(";"))
```

### succeed

A parser that always succeeds with the given value and consumes no input. 

Useful as a neutral "identity" element, e.g. as a default in `choice`.

```javascript
choice(identifier, succeed(null))
```

### tap

Executes a callback with the parser result without modifying it.

Useful for debugging or collecting statistics.

```javascript
tap(expression, (result, state) => console.log("parsed:", result))
```

### then

Runs a parser whose result is discarded, then a second parser.

Returns only the second parser's result.

```javascript
then(token("return"), expression)
```

### times

Parses between `min` and `max` occurrences of a parser (inclusive). 

[`atLeast`](#atleast) and [`atMost`](#atmost) are convenience wrappers around this.

```javascript
times(token("DIGIT"), 2, 5)
```

### token

Consumes and returns a token matching the given type or value.

```javascript
token("IDENTIFIER")
```

### value

Replaces a successful parser result with a constant value.

```javascript
value(token("true"), true)
```

---

# Examples

- [Parse a Comma-Separated List](#parse-a-comma-separated-list)
- [Parse a Parenthesized Argument List](#parse-a-paranthesized-argument-list)
- [Parse a Function Declaration](#parse-a-function-declaration-statement)
- [Parse a Block](#parse-a-block)
- [Parse an Expression](#parse-an-expression)
- [Recursive Grammar](#recursive-grammar)
- [Build an Object](#build-an-object)

## Parse a Comma-Separated List

```javascript
const identifiers = sepBy(
  token("IDENTIFIER"),
  token(",")
);
```

Parses:

```txt
foo, bar, baz
```

↓

```javascript
[ foo, bar, baz ]
```

## Parse a Parenthesized Argument List

```javascript
const arguments =
  seq(
    token("("),
    sepBy(
      token("IDENTIFIER"),
      token(",")
    ),
    token(")")
  );
```

Parses:

```txt
(foo, bar, baz)
```

## Parse a Function Declaration

```javascript
const declaration =
  seq(
    token("function"),
    token("IDENTIFIER"),
    token("("),
    sepBy(
      token("IDENTIFIER"),
      token(",")
    ),
    token(")")
  );
```

Parses:

```javascript
function greet(name, age)
```

## Parse a Block

```javascript
const block =
  seq(
    token("{"),
    many(
      rule.Statement
    ),
    token("}")
  );
```

## Parse an Expression

```javascript
const expression =
  choice(
    rule.BinaryExpression,
    rule.CallExpression,
    rule.Identifier,
    rule.Literal
  );
```

## Recursive Grammar

```javascript
const expression = lazy(() =>
  choice(
    rule.BinaryExpression,
    rule.Literal,
    seq(
      token("("),
      expression,
      token(")")
    )
  )
);
```

## Build an Object

```javascript
const property =
  map(
    seq(
      token("IDENTIFIER"),
      token(":"),
      rule.Expression
    ),
    ([key, , value]) => ({ key, value })
  );
```

---

