# ======================================================================
# JSON :: LANGUAGE SPECIFICATION DATA :: json.lsd
# ======================================================================

# //////////// META ////////////////////////////////////////////////////

META PROP :: char     == ( a..z | A..Z )
META PROP :: digit    == 0..9
META LIST :: literals == false null true
META LIST :: symbols  == a-z A-Z 0-9 _ @ $ & \#

# //////////// TOKENIZER ///////////////////////////////////////////////

TKN :: WHITESPACE == /[ \t\n\r]+/y
TKN :: LITERAL    == @literals
TKN :: NUMBER     == /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN :: STRING     == /""/y

# //////////// RULES ///////////////////////////////////////////////////

RULE :: Program   == Statement*
RULE :: Statement == CpyDecl | RefDecl | ValDecl | FnDecl | ExprStatement
RULE :: Pair      == STRING `:` Expr

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
