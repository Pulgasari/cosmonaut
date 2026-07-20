# ==============================================================================
# POO LANGUAGE SPECIFICATION (VARIANT 2 SPEC)
# ==============================================================================

META PROP id == IDENTIFIER

META LIST keywords == as break continue catch do fn for if in new pkg pnt prop ref return static switch until use while yield
META LIST literals == false null true undefined

META TABLE operators == (
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

# ==============================================================================
# TOKENIZER RULES (TKN)
# ==============================================================================

TKN COMMENT     == /\/\/[^\n]*/y
TKN WHITESPACE  == /[ \t\n\r]+/y

TKN KEYWORD     == @keywords
TKN LITERAL     == @literals
TKN OPERATOR    == @operators

TKN NUMBER      == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN STRING      == /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y
TKN IDENTIFIER  == /[a-zA-Z_$][a-zA-Z0-9_$]*/y

# ==============================================================================
# STANDALONE PARSER RULES (Global Hilfsregeln ohne AST-Knoten)
# ==============================================================================

RULE == Program          == Statement*
RULE == Statement        == VarDecl | FnDecl | ExprStatement
RULE == FnParams         == `(` IdentList? `)` | IdentList
RULE == IdentList        == IDENTIFIER ( `,`? IDENTIFIER )*
RULE == Block            == `{` Statement* `}`
RULE == ParenCallArgs    == `(` CallArgsList? `)`
RULE == SingleBareArg    == LITERAL | IDENTIFIER | STRING | NUMBER
RULE == CallArgsList     == list-args-named | list-args-expression

# ==============================================================================
# COHESIVE LANGUAGE BLOCKS (META Blocks with Types, Rules, and Code)
# ==============================================================================

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

#### BinaryExpr
META BinaryExpression
TYPE == { left, op, right }
RULE == Expr OPERATOR Expr => 1 2 3
CODE == `(${left} ${op}${right})`

META NamedArgsList
TYPE == { args }
RULE == decl-prop-named ( `,`? decl-prop-named )* => 1
CODE == `{\n${args, ",\n"}\n}`

META NamedPropDecl
TYPE == { key, value }
RULE == IDENTIFIER `:` Expression => 1 3
CODE == `${key} \=${value}`

# Inverted name syntax (list-args-expression)
META ExprArgsList
TYPE == { items }
RULE == Expression ( `,`? Expression )* => 1
CODE == `${items, ", "}`

#### ArrayLikeLiteral
META ArrayLikeLiteral
TYPE == { elements, type }
RULE == `#{` ArgsListExpr? `}` => 2 `Record`
RULE == `#(` ArgsListExpr? `)` => 2 `Tuple`
RULE == `#[` ArgsListExpr? `]` => 2 `List`
RULE ==  `[` ArgsListExpr? `]` => 2 `Array`
CODE == `${elements}`

META ArrayLiteral
TYPE == { elements }
RULE == `[` list-args-expression? `]` => 2
CODE == `${elements}`

META ListLiteral
TYPE == { elements }
RULE == `#[` list-args-expression? `]` => 2
CODE == `${elements}`

META TupleLiteral
TYPE == { elements }
RULE == `#(` list-args-expression? `)` => 2
CODE == `${elements}`

# ==============================================================================
# SYNTAX HIGHLIGHTING RULES (HL)
# ==============================================================================

HL KEYWORD == `keyword.control`
HL LITERAL == `constant.language`
HL NUMBER  == `constant.numeric`
HL STRING  == `string.quoted`
HL COMMENT == `comment.line,
