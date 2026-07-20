# LSD

*(Language Specification Data)*
*(Language Syntax Definition)*

---

This document defines the current specification of the ***Language Specification Data*** DSL (`.lsd`) created for the ***Cosmonaut Toolkit***. 

A LSD file could serve as the **Single Source of Truth** for the entire lifecycle of a language: tokenization, parsing, AST generation, code generation, and syntax highlighting.

---

## 1. Core Architecture & Keywords

The DSL deliberately avoids redundant punctuation bloat, uniformly utilizing the equals sign (`=`) for declarations and the directional arrow (`<=`) for **syntactic data flow**. 

It is divided into six functional keywords:

* **[`META`](#meta)**: Global lists, character sets, configurations, and operator precedences.
* **[`TKN`](#tkn)**: Regular expressions for the lexical scanner (tokenizer).
* **[`RULE`](#rule)**: Deterministic parsing rules (PEG-based) with optional AST node or rule routing.
* **[`NODE`](#node)**: Declarative definition of the target structures for the Abstract Syntax Tree (AST).
* **[`CODE`](#code)**: Template definitions for generating target source code from AST nodes.
* **[`HL`](#hl)**: Mappings for semantic and syntactic code highlighting.

```md
META TYPE
---

## META

To provide meta information for your language the `META` keywordis provided. Her you could define whatever you think is necessary.

### `META`

With the blank `META` keyword a simple constant could defined.

String could be escaped with backticks `\`...\`` or backslash `\\` but in most cases is not necessary.

```md
META language = `poo`
META language = poo
```

### META LIST

Defines static list of words or symbols.

To prevent unnecessary bloat, standard character ranges (e.g., `a-z`, `A-Z`, `0-9`) can be specified. 

Since the equals sign `=` and spaces are control characters of the DSL, special symbols can either be escaped with a backslash (`\=`) or entirely wrapped in backticks (``  `=` ``) as a template string literal:

```md
META LIST puncts  = { } ( ) [ ] , ; . : ? \=
META LIST symbols = a-z A-Z 0-9 _ $

```

### META TABLE

Defines operator groups and their priority (precedence) for the integrated Pratt parser:
```md
META LIST operators = (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( \= +\= -\= )
  additive left   300  ( + - )
}
```

## TKN

Defines tokens using JavaScript regular expression literals, which should include the sticky flag `/y` for high-performance, pointer-based text analysis:

```md
TKN STRING     = /"(?:\\.|[^"\\])*"/y
TKN KEYWORD    = @keywords
TKN OPERATOR   = @operators
```

---

## 3. Parser Rules & AST Nodes (RULE & NODE)

String literals and node identifiers inside parsing rules are strictly wrapped in backticks (`` ` ``).

### A. Pure Grammar Rule (No Node output)

When an expression merely groups or validates a syntax structure without leaving its own dedicated node in the memory tree, a simple `=` is used.

```md
RULE Program = Statement*
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

## 4. Code Generation (CODE)

The `CODE` block describes how an AST node is translated back into text (the final target source code, e.g., Odin). The syntax utilizes backticks for the template string and `${property}` for interpolation of node fields.

If a property holds an array of child AST nodes (such as lists or block statements), an optional separator can be supplied after a comma (`${items, ", "}`):

```md
# Example: Translating a variable declaration into Odin syntax (using :=)
CODE VarDecl = `${name} :\= ${value};\n`

# Example: Joining list items with a comma and a space
CODE ExpressionList = `${items, ", "}`
```

---

## 5. Syntax Highlighting (HL)

Direct mapping of tokens to standardized editor scopes (e.g., TextMate scopes used by VS Code):

```md
HL KEYWORD = `keyword.control`
HL LITERAL = `constant.language`
```

---

## 6. Reference Implementation (Example: 'Poo' Language Specification)

Below is the complete unified `.lsd` specification for the current feature set of *Poo*:

```md
# ======================================================================
# POO :: LANGUAGE SPECIFICATION DATA :: poo.lsd
# ======================================================================

# //////////// META ////////////////////////////////////////////////////

META LIST keywords = as break continue catch do fn for if in new pkg pnt prop ref return static switch until use while yield
META LIST literals = false null true undefined
META LIST symbols  = a-z A-Z 0-9 `_` `$`

META LIST operators = (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( \= +\= -\= *\= /\= \?\?\= )
  compare  idk    200  ( ~\= \=\= \=\=\= \!\= \!\=\= < > \=\< \>\= || && \?\? )
  additive left   300  ( + - )
  multi    left   400  ( * / % )
  pipe     left   500  ( |> \?\?> )
}

# //////////// TOKENIZER ///////////////////////////////////////////////

TKN COMMENT     :: /\/\/[^\n]*/y
TKN WHITESPACE  :: /[ \t\n\r]+/y

TKN KEYWORD     = keywords
TKN LITERAL     = literals
TKN OPERATOR    = operators

TKN NUMBER      == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN STRING      == /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y
TKN IDENTIFIER  == /[a-zA-Z_$][a-zA-Z0-9_$]*/y

# //////////// RULES ///////////////////////////////////////////////////

RULE Program   :: Statement*
RULE Statement :: VarDecl | FunctionDecl | ExpressionStatement

# ------------ Variables -----------------------------------------------

RULE decl-const = `val` `#` IDENTIFIER `=` Expression `;`
RULE decl-val   = `val`     IDENTIFIER `=` Expression `;`
RULE decl-var   = Node <= decl-const | decl-var
NODE decl-var   = { name, value }

# ------------ Functions -----------------------------------------------

RULE decl-fn = Node <= decl-fn/classic / decl-fn-arrow
NODE decl-fn = { identifier, args, body }

RULE decl-fn-classic = Rule `decl-fn` <= `fn` identifier:IDENTIFIER `(` args:IdentList? `)` body:Block
RULE decl-fn-arrow   = Rule `decl-fn` <= `fn` identifier:IDENTIFIER ( `=` args:FunctionParams? )? `=>` body:Statement

RULE fn-params == `(` IdentList? `)` / IdentList
RULE IdentList == IDENTIFIER ( `,`? IDENTIFIER )*
RULE block     => `{` Statement* `}`

# ------------ Expressions & Calls -------------------------------------

RULE expr = call-fn / expr-binary / LITERAL / IDENTIFIER / STRING / NUMBER

RULE expr-binary = Node <= left:Expression op:OPERATOR right:Expression
NODE expr-binary = { left, op, right }

RULE call-fn = Node <= callee:IDENTIFIER ( args:ParenCallArgs / args:SingleBareArg )
NODE call-fn = { callee, args }

RULE ParenCallArgs = `(` list-args-call? `)`
RULE SingleBareArg = LITERAL | IDENTIFIER | STRING | NUMBER

RULE CallArgsList = list-args-named / list-expr

RULE list-args-named = Node <= args:NamedArg ( `,`? args:NamedArg )*
NODE list-args-named = { args }

RULE arg-named = Node <= key:IDENTIFIER `:` value:expr
NODE arg-named = { key, value }

RULE list-expr = Node <= items:expr ( `,`? items:expr )*
NODE list-expr = { items }

# ------------ Literals ------------------------------------------------

RULE literal-array == Node <=  `[` { elements: list-expr } `]`
RULE literal-list  == Node <= `#[`   elements: list-expr   `]`
RULE literal-tuple == Node <= `#(`   elements: list-expr?  `)`

# //////////// AST CREATION ////////////////////////////////////////////

NODE literal-array == { elements }
NODE literal-list  == { elements }
NODE literal-tuple == { elements }

# //////////// CODEGEN (Target: Odin) //////////////////////////////////

CODE expr-binary    = `(${left} ${op}${right})`
CODE block          = `{\n${statements, "\n"}\n}`
CODE ExpressionList = `${items, ", "}`
CODE FunctionCall   = `${callee}(${args})`
CODE arg-named      = `${key} \=${value}`
CODE list-arg-named = `{\n${args, ",\n"}\n}`
CODE decl-var       = `${name} :\=${value};\n`


# Mapping Poo arrow and classic functions into native Odin procedures
CODE FunctionDecl      = `${identifier} :\= proc(${args})${body};\n`

# //////////// SYNTAX HIGHLIGHTING /////////////////////////////////////

HL KEYWORD = "keyword.control"
HL LITERAL = "constant.language"
HL NUMBER  = "constant.numeric"
HL STRING  = "string.quoted"
HL COMMENT = "comment.line"
```


```md
# ?  =
# !1 = many1
```

