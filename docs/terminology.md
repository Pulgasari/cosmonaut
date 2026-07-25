# Terminology

[Associativity](#associativity) ·
[AST (Abstract Syntax Tree)](#ast-abstract-syntax-tree) ·
[Backtracking](#backtracking) ·
[Combinator](#combinator) ·
[Commit / Cut](#commit-cut) ·
[Consumer](#consumer) ·
[Grammar](#grammar) ·
[Lookahead](#lookahead) ·
[Parser](#parser) ·
[Parser State](#parser-state) ·
[](#) ·
[](#) ·
[](#) ·
[](#) ·



## Associativity

Determines how a chain of operators of equal precedence is grouped. Left-associative operators group from the left (`a - b - c` → `(a - b) - c`), right-associative from the right (`a ^ b ^ c` → `a ^ (b ^ c)`).

## AST (Abstract Syntax Tree)

A tree representation of the parsed source code.

AST construction is intentionally outside the scope of these low-level parser blocks.

## Backtracking

Restoring the parser state after a parser fails, allowing another parser to be tried from the same position.

## Combinator

A function that takes one or more parsers and returns a new parser.

Examples include [`choice`](#choice), [`seq`](#seq), [`many`](#many) and [`map`](#map).

## Commit / Cut

A point in a grammar rule after which failure is no longer treated as a backtrackable alternative, but as a genuine syntax error.

Improves error messages and avoids pathological backtracking in deeply nested [`choice`](#choice)/[`seq`](#seq) combinations.

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

The mutable state shared by all parsers, including the [token stream](#token-stream) and current position.

## Predicate

A parser or function that only checks a condition without producing a meaningful value.

Examples include [`check`](#check), [`lookAhead`](#lookahead) and [`not`](#not).

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

