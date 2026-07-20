```md
# ======================================================================
# POO :: LANGUAGE SPECIFICATION DATA :: poo.lsd :: Variant 2
# ======================================================================

# //////////// META ////////////////////////////////////////////////////

META PROP char  == ( a..z | A..Z )
META PROP digit == 0..9
META PROP id    == IDENTIFIER

META LIST builtins == Array Blob Bool Char Color Date Enum Generator List Map Number Queue Pattern Record RegExp Set Stack String Store Symbol Tree Tuple Union
META LIST keywords == as and break catch continue cpy do fail fn if kill loop in new obj or pkg ref return skip static switch use val yield
META LIST literals == false null true undefined
META LIST symbols  == a-z A-Z 0-9 _ @ $ & \#

META TABLE operators == (
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

TKN COMMENT     == /\/\/[^\n]*/y
TKN WHITESPACE  == /[ \t\n\r]+/y

TKN KEYWORD     == @keywords
TKN LITERAL     == @literals
TKN OPERATOR    == @operators

TKN NUMBER      == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN STRING      == /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y
TKN IDENTIFIER  == /[a-zA-Z_$][a-zA-Z0-9_$]*/y

# //////////// RULES ///////////////////////////////////////////////////

RULE == Program       == Statement*
RULE == Statement     == VarDecl | FnDecl | ExprStatement
RULE == FnParams      == `(` IdentList? `)` | IdentList
RULE == IdentList     == IDENTIFIER ( `,`? IDENTIFIER )*
RULE == Block         == `{` Statement* `}`
RULE == ParenCallArgs == `(` CallArgsList? `)`
RULE == SingleBareArg == LITERAL | IDENTiFIER | STRING | NUMBER
RULE == CallArgsList  == NamedArgsList | ExprArgsList

# ------------ Declarations --------------------------------------------

#### ValDeclarationOperator
META ValDeclOp
TYPE == { isConst: Bool }
RULE == `#=` => false
RULE ==  `=` => true

#### ValDeclaration
META ValDecl
TYPE == { name, value }
RULE == `val` IDENTIFIER ValDeclOp Expr `;` => 2 4
CODE == `${name} :\=${value};\n`

#### FunctionCall
META FnCall
TYPE == { callee, args }
RULE == IDENTIFIER ( ParenCallArgs | SingleBareArg ) => 1 2
CODE == `${callee}(${args})`

#### FunctionDeclaration
META FnDecl
TYPE == { identifier, args, body }
RULE == `fn` IDENTIFIER     FnParams      Block     => 2 3 4
RULE == `fn` IDENTIFIER `=` FnParams `=>` Statement => 2 4 6
CODE == `${identifier} :\= proc(${args})${body};\n`

#### BinaryExpression
META BinaryExpr
TYPE == { left, op, right }
RULE == Expr OPERATOR Expr => 1 2 3
CODE == `(${left} ${op}${right})`

#### NamedArgumentsList
META NamedArgsList
TYPE == { args }
RULE == NamedPropDecl ( `,`? NamedPropDecl )* => 1
CODE == `{\n${args, ",\n"}\n}`

#### NamedPropDeclaration
META NamedPropDecl
TYPE == { key, value }
RULE == IDENTIFIER `:` Expr => 1 3
CODE == `${key} \=${value}`

#### ExpressionArgumentsList
META ExprArgsList
TYPE == { items }
RULE == Expr ( `,`? Expr )* => 1
CODE == `${items, ", "}`

#### ArrayLikeLiteral
META ArrayLikeLiteral
TYPE == { elements, type }
RULE == `#{` ArgsListExpr? `}` => 2 Record
RULE == `#(` ArgsListExpr? `)` => 2 Tuple
RULE == `#[` ArgsListExpr? `]` => 2 List
RULE ==  `[` ArgsListExpr? `]` => 2 Array
CODE == `${elements}`

# //////////// SYNTAX HIGHLIGHTING /////////////////////////////////////

HL COMMENT == `comment.line`
HL KEYWORD == `keyword.control`
HL LITERAL == `constant.language`
HL NUMBER  == `constant.numeric`
HL STRING  == `string.quoted`

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
