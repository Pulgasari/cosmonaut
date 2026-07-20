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
```

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
META TABLE operators = (
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

## Zusammenfassung LSD Syntax Rules

- every line must start with `#` or LSD keyword or kept empty
- comments are introduced by `#`
- assignment is marked by `==`
- control flow is marked by `=>` or`<=`
- escaping is done by `\\` or wrapping inside backticks `\``

---

## Example: Reference Implementation

Below is the complete unified `.lsd` specification for the current feature set of *Poo*:

```md
# ======================================================================
# POO :: LANGUAGE SPECIFICATION DATA :: poo.lsd
# ======================================================================

# //////////// META ////////////////////////////////////////////////////

META char  == ( a..z | A..Z )
META digit == 0..9

META LIST keywords == as and break catch continue cpy do fail fn if kill loop in new obj or pkg ref return skip static switch use val yield
META LIST literals == false null true undefined
META LIST symbols  == a-z A-Z 0-9 `_` `$`

META TABLE operators = (
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

TKN COMMENT     :: /\/\/[^\n]*/y
TKN WHITESPACE  :: /[ \t\n\r]+/y

TKN KEYWORD     == @keywords
TKN LITERAL     == @literals
TKN OPERATOR    == @operators

TKN IDENTIFIER  == /[a-zA-Z_$][a-zA-Z0-9_$]*/y
TKN NUMBER      == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN STRING      == /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y

# //////////// RULES ///////////////////////////////////////////////////
# !!!  here order and relation of rules is part of the control flow  !!!

RULE program   == statement*
RULE statement == decl-val | decl-fn | statement-expr

RULE id        == @char { @char | @digit | `_` }
RULE id-ns     == id { `::` id } ;
RULE id-val    == [ `#` | `$` | `&` | `@` ] id ;

# ------------ Variables -----------------------------------------------

RULE decl-val   == NODE <= `val` id-val  ( `#=`| `=` ) expr `;`

# ------------ Functions -----------------------------------------------

RULE decl-fn         == NODE <= decl-fn-classic | decl-fn-arrow
RULE decl-fn-classic ==         `fn` IDENTIFIER `(` args:list-id? `)` body:block
RULE decl-fn-arrow   ==         `fn` IDENTIFIER ( `=` params-fn? )? `=>` body:statement

RULE fn-params == `(` list-id? `)` | list-id
RULE list-id   == IDENTIFIER ( `,`? IDENTIFIER )*
RULE block     => `{` statement* `}`

# ------------ Expressions & Calls -------------------------------------

RULE expr            ==         call-fn / expr-binary / LITERAL / IDENTIFIER / STRING / NUMBER
RULE expr-binary     == NODE <= left:expr op:OPERATOR right:expr
RULE call-fn         == NODE <= callee:IDENTIFIER ( args-call-parent | arg-bare-single )
RULE args-call-paren ==         `(` list-args-call? `)`
RULE arg-bare-single ==         LITERAL | IDENTIFIER | STRING | NUMBER
RULE list-args-call  ==         list-args-named / list-expr
RULE list-args-named == NODE <= args:arg-named ( `,`? arg-named )*
RULE arg-named       == NODE <= key:IDENTIFIER `:` value:expr
RULE list-expr       == NODE <= expr ( `,`? expr )*

RULE expr-new       == `new` IDENTIFIER [ `(` `)` ]
RULE expr-obj-inner ==

RULE expr-pattern-list-inner == expr-pattern-list-inner 
RULE expr-pattern-obj-inner

# ------------ Literals ------------------------------------------------

RULE literal-array  == NODE <=  `[` { list-expr } `]`
RULE literal-list   == NODE <= `#[`   list-expr   `]`
RULE literal-record == NODE <= `#(`   list-expr  `)`
RULE literal-tuple  == NODE <= `#(`   list-expr  `)`

# //////////// AST CREATION ////////////////////////////////////////////

NODE arg-named       == { key, value }
NODE call-fn         == { callee, args }
NODE decl-fn         == { identifier, args, body }
NODE decl-var        == { name, value }
NODE expr-binary     == { left, op, right }
NODE literal-array   == { elements }
NODE literal-list    == { elements }
NODE literal-tuple   == { elements }
NODE list-args-named == { args }
NODE list-expr       == { items }

# //////////// CODEGEN (Target: Odin) //////////////////////////////////

CODE arg-named      == `${key} \=${value}`
CODE block          == `{\n${statements, "\n"}\n}`
CODE call-fb        == `${callee}(${args})`
CODE decl-fn        == `${identifier} :\= proc(${args})${body};\n`
CODE decl-var       == `${name} :\=${value};\n`
CODE expr-binary    == `(${left} ${op}${right})`
CODE list-arg-named == `{\n${args, ",\n"}\n}`
CODE list-expr      == `${items, ", "}`

# //////////// SYNTAX HIGHLIGHTING /////////////////////////////////////

HL COMMENT = "comment.line"
HL KEYWORD = "keyword.control"
HL LITERAL = "constant.language"
HL NUMBER  = "constant.numeric"
HL STRING  = "string.quoted"

```


```md
?  =
!1 = many1


--- syntax goals

- as less char bloat as possible (separators, escapings etc.)
- high or excellent readability
- the synax does not have to be 100% identical on every level (meta, tokenizing, parsing, ast-building, codegen)

```

