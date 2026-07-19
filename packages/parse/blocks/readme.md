# @cosmonaut/blocks

Low-level parser blocks (*"combinators"*) for building recursive-descent parsers with higher-level parsing rules.

---

[Blocks](#blocks) · 
[Docs](#docs) ·
[Examples](#examples) ·
[Terminology](#terminology)

---

# Blocks

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
[`sepBy1`](#sepby1) ·
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

```js
any()
```

### atLeast

Parses at least *n* occurrences of a parser. 

Fails if fewer than *n* are found.

```js
atLeast(token("IDENTIFIER"), 2)
```

### atMost

Parses at most *n* occurrences of a parser.

Always succeeds, even with zero matches.

```js
atMost(token("IDENTIFIER"), 3)
```

### between

Parses an opening parser, an inner parser, and a closing parser in sequence. 

Returns only the inner result.

```js
between(
  token("("),
  expression,
  token(")")
)
```

### capture

Wraps a successful parser result in an object under the given property name.

```js
capture(identifier, "name")
```

↓

```js
{ name: result }
```

### chain

Runs a parser, then uses its result to build the *next* parser to run. Unlike [`map`](#map), which only transforms the result, `chain` lets the result decide what gets parsed next — the basis for context-sensitive grammars.

```js
chain(
  token("LENGTH"),
  length => repeat(any(), Number(length.value))
)
```

### chain1

Like [`chain`](#chain), but repeats the bind step: each result is fed back into the same function to produce the next parser, until one fails.

Requires at least one successful step.

```js
chain1(
  identifier,
  prev => memberAccessFollowing(prev)
)
```

### chainl1

Parses a left-associative chain of operands separated by an operator, folding the result from left to right. 

A common way to build binary-expression parsing without a full precedence-climbing (Pratt) parser.

```js
chainl1(
  multiplicative,
  choice(token("+"), token("-")),
  (left, op, right) => ({ type: "BinaryExpression", operator: op.value, left, right })
)
```

Parses:

```
a + b - c
```

as `((a + b) - c)`.

### chainr1

Like [`chainl1`](#chainl), but folds right-associatively — the rightmost application binds first. 

Used for operators like exponentiation (`^`) or assignment (`=`).

```js
chainr1(
  unary,
  token("^"),
  (left, op, right) => ({ type: "BinaryExpression", operator: "^", left, right })
)
```

Parses:

```js
a ^ b ^ c
```

as `(a ^ (b ^ c))`.

### check

Checks whether the next token matches a type or value without consuming it.

```js
check("IDENTIFIER")
check("+")
```

### choice

Tries multiple parsers in order and returns the first successful result. Automatically backtracks between attempts.

```js
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

```js
seq(
  token("if"),
  cut(expression, "expected condition after 'if'"),
  cut(block, "expected block after if-condition")
)
```

### eof

Succeeds only if the parser has reached the end of the [token stream](#token-stream).

Consumes no input.

```js
seq(expression, eof())
```

### expect

Consumes a token matching the given type or value, or throws a syntax error if it doesn't match.

```js
expect(token("SEMICOLON"))
```

### fail

A parser that always fails and consumes no input.

Useful as a neutral "zero" element when composing other parsers.

```js
fail()
```

### filter

Accepts a parser result only if it satisfies a predicate.

```js
filter(number, n => n.value > 0)
```

### lazy

Defers evaluation of a parser until it actually runs.

Needed to reference a rule before it's defined, e.g. for recursive grammars.

```js
const expression = lazy(() => choice(binary, unary, primary));
```

### lookAhead

Runs a parser and returns its result, but restores the position afterwards, so no input is consumed.

```js
lookAhead(token("function"))
```

### many

Parses zero or more occurrences.

Always succeeds.

```js
many(token("IDENTIFIER"))
```

### manyTill

Parses zero or more occurrences until a [terminator](#terminator) succeeds.

The [terminator](#terminator) is consumed but not included in the returned results.

```js
manyTill(
  any(),
  token(")")
)
```

### many1

Parses one or more occurrences of a parser.

Fails if the first occurrence cannot be parsed.

```js
many1(token("DIGIT"))
```

### many1Till

Parses one or more occurrences of a parser until a [terminator](#terminator) succeeds. 

Requires at least one match before the [terminator](#terminator) succeeds. Fails otherwise.

```js
many1Till(statement, token("}"))
```

### map

Transforms a parser result using the supplied function.

```js
map(
  token("NUMBER"),
  t => Number(t.value)
)
```

### not

Succeeds only if the given parser fails. 

Consumes no input.

```js
not(token("EOF"))
```

### optional

Attempts a parser and returns `null` instead of failing.

Consumes no input on failure.

```js
optional(token(","))
```

### repeat

Parses a parser exactly *n* times.

```js
repeat(token("DIGIT"), 4)
```

### sepBy

Parses zero or more elements separated by another parser.

Always succeeds.

```js
sepBy(expression, token(","))
```

### sepBy1

Parses one or more elements separated by another parser.

```js
sepBy1(expression, token(","))
```

### sepEndBy

Parses zero or more elements separated and optionally terminated by a [separator](#separator).

```js
sepEndBy(property, token(","))
```

### sepEndBy1

Parses one or more elements separated and optionally terminated by a [separator](#separator).

```js
sepEndBy1(property, token(","))
```

### seq

Runs multiple parsers sequentially.

Succeeds only if every parser succeeds.

```js
seq(
  token("("),
  expression,
  token(")")
)
```

### skip

Runs a parser, then a second parser whose result is discarded. 

Returns only the first parser's result.

```js
skip(expression, token(";"))
```

### succeed

A parser that always succeeds with the given value and consumes no input. 

Useful as a neutral "identity" element, e.g. as a default in `choice`.

```js
choice(identifier, succeed(null))
```

### tap

Executes a callback with the parser result without modifying it.

Useful for debugging or collecting statistics.

```js
tap(expression, (result, state) => console.log("parsed:", result))
```

### then

Runs a parser whose result is discarded, then a second parser.

Returns only the second parser's result.

```js
then(token("return"), expression)
```

### times

Parses between `min` and `max` occurrences of a parser (inclusive). 

[`atLeast`](#atleast) and [`atMost`](#atmost) are convenience wrappers around this.

```js
times(token("DIGIT"), 2, 5)
```

### token

Consumes and returns a token matching the given type or value.

```js
token("IDENTIFIER")
```

### value

Replaces a successful parser result with a constant value.

```js
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

```js
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

```js
[ foo, bar, baz ]
```

## Parse a Parenthesized Argument List

```js
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

```js
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

```js
function greet(name, age)
```

## Parse a Block

```js
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

```js
const expression =
  choice(
    rule.BinaryExpression,
    rule.CallExpression,
    rule.Identifier,
    rule.Literal
  );
```

## Recursive Grammar

```js
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

```js
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

# Terminology

## Associativity

Determines how a chain of operators of equal precedence is grouped. Left-associative operators group from the left (`a - b - c` → `(a - b) - c`), right-associative from the right (`a ^ b ^ c` → `a ^ (b ^ c)`).

## AST (Abstract Syntax Tree)

A tree representation of the parsed source code.

AST construction is intentionally outside the scope of the low-level parser blocks.

## Backtracking

Restoring the parser state after a parser fails, allowing another parser to be tried from the same position.

## Combinator

A function that takes one or more parsers and returns a new parser.

Examples include `choice`, `seq`, `many` and `map`.

## Commit / Cut

A point in a grammar rule after which failure is no longer treated as a backtrackable alternative, but as a genuine syntax error. Improves error messages and avoids pathological backtracking in deeply nested `choice`/`seq` combinations.

## Consumer

A parser that consumes input when it succeeds.

Example:

```js
token("if")
```

## Grammar

The complete set of parsing rules describing a language.

## Lookahead

Inspecting upcoming input without consuming it.

## Parser

A function that attempts to consume input and produce a result.

A parser either succeeds or fails.

## Parser State

The mutable state shared by all parsers, including the token stream and current position.

## Predicate

A parser or function that only checks a condition without producing a meaningful value.

Examples include `check`, `lookAhead` and `not`.

## Recursive Parser

A parser that directly or indirectly invokes itself.

Used to parse nested language constructs.

## Rule

A named parser representing a language construct.

Examples:

- Expression
- Statement
- Pattern
- FunctionDeclaration

## Separator

A token or parser that separates consecutive elements.

Examples:

```txt
a, b, c
```

`,` is the separator.

## Sequence

Multiple parsers executed one after another.

All parsers must succeed.

## Stream

The ordered input processed by the parser.

Usually a token stream, but may also be characters or bytes.

## Terminator

A parser that marks the end of another parser.

Example:

```txt
hello)
```

`)` is the terminator.

## Token

A lexical unit produced by the lexer.

Examples:

```txt
IDENTIFIER

NUMBER

KEYWORD

+
```

## Token Stream

An ordered collection of tokens consumed by the parser.

## Transformation

A parser that changes another parser's result without changing how input is consumed.

Examples include [`map`](#map), [`capture`](#map) and [`value`](#map).


