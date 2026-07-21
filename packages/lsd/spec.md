# LSD

*(Language Specification Data)*
*(Language Syntax Definition)*

---

Table of Contents:
[Introduction](#introduction) ·
[Semantics](#) ·
[Example](#example) ·

---

## Introduction

This document defines the current specification of the ***Language Specification Data*** DSL (`.lsd`) created for the **[Cosmonaut Toolkit](/)**. 

A LSD file could serve as the **Single Source of Truth** for the entire lifecycle of a language: tokenization, parsing, AST generation, code generation, and syntax highlighting, LSP stuff etc.

The Goals:

- Having a centralized place when creating a custom language
- Reduce the need for punctuation bloat when defining grammar rules

---

## Core Architecture / Keywords & Semantics

The DSL deliberately avoids redundant punctuation bloat, uniformly utilizing the equals sign (`==`) for declarations and the directional arrow (`=>` / `<=`) for **syntactic data flow**. 

[`CODE`](#) ·
[`HL`](#) ·
[`META`](#) ·
[`META LIST`](#) ·
[`META PROP`](#) ·
[`META TABLE`](#) ·
[`RULE`](#) ·
[`TYPE`](#) ·
[`##`](#) ·
[`==`](#) ·
[`=>`](#) ·
[`@`](#) ·
[`#`](#) ·
[`####`](#)

- every line must start with `#` or [LSD keyword](#) or kept empty
- comments are introduced by `#`
- meta-superblocks could be introduced by `####`
- there is no special marker for end of statement but the EOF (end of line)
- assignment is marked by `==`
- control flow is marked by `=>` or`<=`
- escaping is done by `\` or wrapping inside backticks `` ` ``

It is divided into six functional keywords:

... | ...
----|----
[`META`](#meta)             | Global lists, character sets, configurations, and operator precedences.
[`META PROP`](#meta-prop)   |
[`META LIST`](#meta-list)   |
[`META-TABLE`](#meta-table) |
[`TKN`](#tkn)               | Regular expressions for the lexical scanner (tokenizer).
[`RULE`](#rule)             | Deterministic parsing rules (PEG-based) with optional AST node or rule routing.
[`TYPE`](#type)             | Declarative definition of the target structures for the Abstract Syntax Tree (AST).
[`CODE`](#code)             | Template definitions for generating target source code from AST nodes.
[`HL`](#hl)                 | Mappings for semantic and syntactic code highlighting
`::` | is an **optional** for enhanced readability placed between keyword and name

---

## META

To provide meta information for your language the `META` keyword is provided. Here you could define whatever you think is necessary.

### `META PROP`

By `META PROP` a simple constant could defined which then could be referenced by a `@`-prefix.

String could be escaped with backticks `` ` `` or backslash `\` but in most cases is not necessary.

```md
META :: language == `poo`
META :: language == poo
```

### `META LIST`

Defines static list of words or symbols.

To prevent unnecessary bloat, standard character ranges (e.g., `a-z`, `A-Z`, `0-9`) can be specified. 

Since the equals sign `=` and spaces are control characters of the DSL, special symbols can either be escaped with a backslash (`\=`) or entirely wrapped in backticks (``  `=` ``) as a template string literal:

```md
META LIST :: puncts  == { } ( ) [ ] , ; . : ? =
META LIST :: symbols == a-z A-Z 0-9 _ $

```

### `META TABLE`

Defines operator groups and their priority (precedence) for the integrated Pratt parser:

```md
META TABLE :: operators == (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( = += -= )
  additive left   300  ( + - )
}
```

## `TKN` – Tokenizer (Lexer) Token Rules

Defines tokens using JavaScript regular expression literals, which should include the sticky flag `/y` for high-performance, pointer-based text analysis:

```md
TKN :: STRING   == /"(?:\\.|[^"\\])*"/y
TKN :: KEYWORD  == @keywords
TKN :: OPERATOR == @operators
```

---

## 3. Parser Rules & AST Nodes (RULE & NODE)

String literals and node identifiers inside parsing rules are strictly wrapped in backticks (`` ` ``).

### A. Pure Grammar Rule (No Node output)

When an expression merely groups or validates a syntax structure without leaving its own dedicated node in the memory tree, a simple `==` is used.

```md
RULE Program == Statement*
RULE DeclStatement == VarDeclStatement | FnDeclStatemenr
```

### B. Implicit Node Routing (`= Node <=`)

The `<=` arrow indicates data flow: The PEG pattern on the right is parsed, and values assigned via `:labels` flow leftward into the node. With `Node <=`, the toolkit automatically instantiates an AST node whose type exactly matches the name of the `RULE`.

```md
RULE VarDecl = Node <= `val` name:IDENTIFIER `=` value:Expression `;`
```

The corresponding `NODE` block declares the object's memory structure using a standard `=`:

```md
NODE VarDecl = { name, value }
```

### C. Explicit Node Routing (`= Node \`Name\` <=`)

If the result of a rule should be mapped to a node that is named differently than the rule itself, the target node name is explicitly provided in backticks.

```md
RULE FunctionDecl = Node `FunctionDecl` <= ClassicFunctionDecl / ArrowFunctionDecl
```

### D. Rule Aliasing / Polymorphism (`= Rule \`Name\` <=`)

Allows parsing two syntactically distinct patterns separately while instructing the toolkit that both ultimately resolve into the same parent rule logic or AST reducer.

```md
RULE ClassicFunctionDecl = Rule `FunctionDecl` <= `fn` identifier:IDENTIFIER `(` args:IdentList? `)` body:Block
RULE ArrowFunctionDecl   = Rule `FunctionDecl` <= `fn` identifier:IDENTIFIER `=>` body:Statement
```

---

## `CODE` – Code Generation (AST to Code)

The `CODE` block describes how an AST node is translated back into code. The syntax utilizes backticks for the template string and `${property}` for interpolation of node fields.

If a property holds an array of child AST nodes (such as lists or block statements), an optional separator can be supplied after a comma (`${items, ", "}`):

```md
# Example: Translating a variable declaration into Odin syntax (using :=)
CODE VarDecl = `${name} :\= ${value};\n`

# Example: Joining list items with a comma and a space
CODE ExpressionList = `${items, ", "}`
```

---

## `HL` – Syntax Highlighting

Direct mapping of tokens to standardized editor scopes (e.g., TextMate scopes used by VS Code):

```md
HL KEYWORD = `keyword.control`
HL LITERAL = `constant.language`
```

---

## Example: Reference Implementation

Below is the complete unified `.lsd` specification for the current feature set of *Poo*:

```md
# ======================================================================
# POO :: LANGUAGE SPECIFICATION DATA :: poo.lsd :: Variant 2
# ======================================================================

# //////////// META ////////////////////////////////////////////////////

META PROP :: char  == ( a..z | A..Z )
META PROP :: digit == 0..9
META PROP :: id    == IDENTIFIER

META LIST :: builtins == Array Blob Bool Char Color Date Enum Generator List Map Number Queue Pattern Record RegExp Set Stack String Store Symbol Tree Tuple Union
META LIST :: keywords == as and break catch continue cpy do fail fn if kill loop in new obj or pkg ref return skip static switch use val yield
META LIST :: literals == false null true undefined
META LIST :: symbols  == a-z A-Z 0-9 _ @ $ & \#

META TABLE :: operators == (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( = += -= *= /= ??= #= )
  compare  idk    200  ( ~= ~== == === != !== < > =< >= <=> || && ?? )
  additive left   300  ( + - )
  multi    left   400  ( * / % )
  pipe     left   500  ( >> >>> )
  idk      idk    idk  ( |? |> |. )
  idk      idk    idk  ( >=< )
}

# //////////// TOKENIZER ///////////////////////////////////////////////
# !!!  here order and relation of rules is part of the control flow  !!!

TKN :: COMMENT     == /\/\/[^\n]*/y
TKN :: WHITESPACE  == /[ \t\n\r]+/y

TKN :: KEYWORD     == @keywords
TKN :: LITERAL     == @literals
TKN :: OPERATOR    == @operators

TKN :: NUMBER      == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN :: STRING      == /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y
TKN :: IDENTIFIER  == /[a-zA-Z_$][a-zA-Z0-9_$]*/y

# //////////// RULES ///////////////////////////////////////////////////

RULE :: Program       == Statement*
RULE :: Statement     == VarDecl | FnDecl | ExprStatement
RULE :: FnParams      == `(` IdentList? `)` | IdentList
RULE :: IdentList     == IDENTIFIER ( `,`? IDENTIFIER )*
RULE :: Block         == `{` Statement* `}`
RULE :: ParenCallArgs == `(` CallArgsList? `)`
RULE :: SingleBareArg == LITERAL | IDENTiFIER | STRING | NUMBER
RULE :: CallArgsList  == NamedArgsList | ExprArgsList

# ------------ Declarations --------------------------------------------

#### ValDeclarationOperator
META :: ValDeclOp
TYPE == { isConst: Bool }
RULE == `#=` => false
RULE ==  `=` => true

#### ValDeclaration
META :: ValDecl
TYPE == { name, value }
RULE == `val` IDENTIFIER ValDeclOp Expr `;` => 2 4
CODE == `${name} :\=${value};\n`

#### FunctionCall
META :: FnCall
TYPE == { callee, args }
RULE == IDENTIFIER ( ParenCallArgs | SingleBareArg ) => 1 2
CODE == `${callee}(${args})`

#### FunctionDeclaration
META :: FnDecl
TYPE == { identifier, args, body }
RULE == `fn` IDENTIFIER     FnParams      Block     => 2 3 4
RULE == `fn` IDENTIFIER `=` FnParams `=>` Statement => 2 4 6
CODE == `${identifier} :\= proc(${args})${body};\n`

#### BinaryExpression
META :: BinaryExpr
TYPE == { left, op, right }
RULE == Expr OPERATOR Expr => 1 2 3
CODE == `(${left} ${op}${right})`

#### NamedArgumentsList
META :: NamedArgsList
TYPE == { args }
RULE == NamedPropDecl ( `,`? NamedPropDecl )* => 1
CODE == `{\n${args, ",\n"}\n}`

#### NamedPropDeclaration
META :: NamedPropDecl
TYPE == { key, value }
RULE == IDENTIFIER `:` Expr => 1 3
CODE == `${key} \=${value}`

#### ExpressionArgumentsList
META :: ExprArgsList
TYPE == { items }
RULE == Expr ( `,`? Expr )* => 1
CODE == `${items, ", "}`

#### ArrayLikeLiteral
META :: ArrayLikeLiteral
TYPE == { elements, type }
RULE == `#{` ArgsListExpr? `}` => 2 Record
RULE == `#(` ArgsListExpr? `)` => 2 Tuple
RULE == `#[` ArgsListExpr? `]` => 2 List
RULE ==  `[` ArgsListExpr? `]` => 2 Array
CODE == `${elements}`

# //////////// SYNTAX HIGHLIGHTING /////////////////////////////////////

HL :: COMMENT == `comment.line`
HL :: KEYWORD == `keyword.control`
HL :: LITERAL == `constant.language`
HL :: NUMBER  == `constant.numeric`
HL :: STRING  == `string.quoted`

# //////////// AST CREATION ////////////////////////////////////////////
# //////////// CODEGEN (Target: Odin) //////////////////////////////////
# //////////// META BLOCKS /////////////////////////////////////////////
# //////////// RULES ///////////////////////////////////////////////////
# ------------ Declarations --------------------------------------------
# ------------ Expressions & Calls -------------------------------------
# ------------ Functions -----------------------------------------------
# ------------ Literals ------------------------------------------------
# ------------ Variables -----------------------------------------------
```


```md
--- syntax goals

- as less char bloat as possible (separators, escapings etc.)
- high or excellent readability
- the synax does not have to be 100% identical on every level (meta, tokenizing, parsing, ast-building, codegen)

```

