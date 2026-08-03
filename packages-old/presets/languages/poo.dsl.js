(* ==========================================================
   Poo :: Grammar | Tokenizer & Parser Instructions
============================================================= *)

====== META INFO ============================================

META LIST builtins = ( Identifier is String ) Array BigInt Boolean Date Error Function Map Number Object Promise RegExp Set String Symbol
META LIST comments =
META LIST keywords = as break continue catch do fn for if in new pkg pnt prop ref return static switch until use while yield
META LIST globals  = ( Identifier is String ) clearInterval clearTimeout console document globalThis process setInterval setTimeout window
META LIST literals = ( Identifier is String ) false null true undefined
META LIST puncts   = ( Identifier is String ) { } ( ) [ ] , ; . : ?
META LIST symbols  = 0 1 2 3 4 5 6 7 8 9 A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z 
META LIST tokens   = ( Key is String ) IDENTIFIER KEYWORD NUMBER PUNCT STRING TEMPLATE_STRING JSX_TEMPLATE

META LIST operators = (
  group         is String
  associativity is String
  precedence    is Number
  operator      is String
){
  declare  left   0 ...( = #= )...
  multi    idk    0 ...( * / % )...
  additive idk    0 ...( + - )...
  compare  idk    0 ...( ~= == === != !== < > =< >= || && ?? )...
  pipe     left   0 ...( |> ??> ?!> )...
  ternary  idk    0 ...( ? : )...
  assign   left   0 ...( = += -= *= /= ??= ?!= )...
  bitwise  idk    0 ...( << >> )...
  maybe    idk    0 ...( ~ %= <<= >>= >>>=&= ^= |= )...
}

====== TOKENIZER RULES ======================================

TKN OPERATOR   = ...( operators => /@/y )...
TKN PUNCT      = ...( puncts    => /@/y )...
TKN STRING     = /"(?:\\.|[^"\\])*"/y
TKN STRING     = /'(?:\\.|[^'\\])*'/y
TKN NUMBER     = /0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|(?:\d(?:_?\d)*)?\.\d(?:_?\d)*(?:[eE][+-]?\d+)?|\d(?:_?\d)*\.(?!\.)(?:[eE][+-]?\d+)?|\d(?:_?\d)*(?:[eE][+-]?\d+)?/y 
TKN IDENTIFIER = /[a-zA-Z_$][a-zA-Z0-9_$]*/y

====== PARSER RULES =========================================

NODE PropDeclStatement = { identifier, mode, expr <> !!! }

RULE PropDeclStatement => Node = prop Identifier `=` Expr <> !!!!

====== HIGHLIGHTING RULES ===================================

HL literal        = ...meta:literals... OR <literal-num> OR <literal-range>

HL d_             = <d> OR _
HL literal-int    = - <d> ?( <d_> )? <> ?!?
HL literal-float  = - <d> {{ <d_> }} . <d> {{ <d> }}
HL literal-num    = <literal-float> OR <literal-int>
HL literal-range  = <literal-num> .. <literal-num> <> !!!

HL literal-array  =  [ <list-of-vals> ] <> !?!
HL literal-list   = #[ <list-of-vals> ] <> !?!
HL literal-tuple  = #( <list-of-vals> ) <> !?!
HL literal-record = #{ <list-of-args> } <> !?!

HL list-of-args = TRAILING LIST OF <arg>  WITH SEPARATOR ,
HL list-of-vals = TRAILING LIST OF <expr> WITH SEPARATOR ,

HL arg     = pair-kv OR id
HL pair-kv = id : expr <> !!!

HL id           = L AND MAYBE L D _
HL id-const     = #<id>
HL id-label     = $<id>
HL id-pointer   = &<id>
HL id-temp      = @<id>
HL id-qualified = id :: id <> !!!

HL statement-pnt = !!! <> pnt <ImportList> ;
HL statement-ref = !!! <> ref <ImportList> ;
HL statement-use = !!! <> use <ImportList> ;

HL expr-as      = id OR as id 
HL expr-as-list = TRAILING LIST OF <expr-as> WITH SEPARATOR , 





   
   
HL list-of-args = arg  ?( , arg  )? , <> ???
HL list-of-vals = expr ?( , expr )? , <> ???

HL list-of-args = ... , :arg: <> ?! ... , <> !?
HL list-of-vals = Sequence of <vals> with trailing `,`




(* ===== IDENTIFIER ===== *)

literal-str-single-char = ? beliebiges Zeichen außer "'" und "\\" ? | EscapeSequence ;
literal-str-single      = "'" { SingleStringChar } "'" ;

literal-str-double           = '"' { DoubleStringChar | DoubleStringExpansion } '"' ;
literal-str-double-char      = ? beliebiges Zeichen außer '"' und "\\" ? | EscapeSequence ;
literal-str-double-expansion = "$" [ "@" | "#" | "&" ] Identifier ;

literal-str-template      = '`' { TemplateStringChar | TemplateStringExpression } '`' ;
literal-str-template-char = ? beliebiges Zeichen außer '`' und "\\" ? | EscapeSequence ;
literal-str-template-expr = "${" expr "}" ;

(* ===== BLOCKS ===== *)

block = "{" { Statement } "}" ;

statement-decl-prop = "prop" ( id | id-const ) op-assign expr ";" ;
statement-decl-temp =        id-temp           op-assign expr ";" ;
statement-decl-var  = decl-prop | decl-temp ;

statement-jump   = ( "break" | "continue" ) [ literal-int | id-label ] ";" ;
statement-return = "return" [ expr ] ";" ;

(* ===== 2. LITERALE ===== *)
(* 2.1 Escapes für Strings *)
EscapeSequence     = "\\" ( "n" | "t" | "\\" | "'" | '"' | "`" ) ;

(* ===== 3. FUNKTIONEN ===== *)
decl-fn-args = [ id { "," id } ] ;   (* () oder (a) oder (a,b) *)
decl-fn-body = block | expr ";" ;            
decl-fn-expr = "(" FunctionArgs ")" "=>" FunctionBody ;

(* ===== 4. AUSDRÜCKE (nach Priorität geordnet) ===== *)
(* 4.1 Argumente für Funktionsaufrufe *)
fn-call-args-item    = "..." Expression
                | Identifier ":" Expression
                | Expression ;
fn-call-args-list    = ArgumentItem { "," ArgumentItem } ;

(* 4.2 Primäre Ausdrücke (kleinste Einheiten) *)
Primary = ConstIdentifier
        | QualifiedIdentifier [ ( Expression | "(" [ ArgumentList ] ")" ) ]
        | LabelIdentifier
        | SingleStringLiteral | DoubleStringLiteral | TemplateStringLiteral
        | IntegerLiteral | FloatLiteral | BooleanLiteral | NullLiteral
        | ArrayLiteral | ListLiteral | TupleLiteral | RecordLiteral
        | FunctionExpression
        | "(" Expression ")" ;

(* 4.3 Operatoren-Hierarchie (niedrigste Priorität = Assignment) *)


expr        = op-assign ;

(* ===== 6. KONTROLLFLUSS ===== *)
(* 6.1 if / or *)
statement-if = "if"   "(" Expression ")"   Block
             { "or" [ "(" Expression ")" ] Block }
             [ ";" ] ;

(* 6.2 Schleifen *)

ForStatement    = "for" "(" ForSpec ")"
                  [ "while" "(" Expression ")" | "until" "(" Expression ")" ]
                  Block
                  [ ";" ] ;

spec-cond = ;
spec-for  = ( id | literal-range ) [ "as" id-temp ] ;

loop-until  = "until" "(" spec-cond ")" Block [ ";" ] ;
loop-while  = "while" "(" spec-cond ")" Block [ ";" ] ;

statement-loop-inline

(* ===== 8. IMPORTS ===== *)

ImportLikeStatement = UseStatement | PntStatement | RefStatement ;

(* ===== 9. STATEMENTS & PROGRAMM ===== *)

Statement = VariableDeclaration
          | statement-if
          | statement-jump
          | ImportLikeStatement
          | statement-return
          | statement-loop-for
          | statement-loop-while
          | statement-loop-until
          | block
          | expr ";" 

          (* PLATZHALTER FÜR SPÄTER *)
          | "do" ...   (* kommt später – kein Loop, sondern separater Mechanismus *)
          | "switch" ...
          | ObjectBodyDeclaration ...   (* für prop <identifier> = <objectBody> *)
          ;

Program = { Statement } ;

(* ===== 10. PLATZHALTER (noch zu definieren) ===== *)
(* ObjectBody = ... ;   (* für prop <identifier> = <objectBody> *) *)

