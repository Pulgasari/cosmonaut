(* ==========================================================
   Poo :: Grammar | Tokenizer & Parser Instructions
============================================================= *)

====== META INFO ============================================

META LIST builtins = ( Identifier is String ) Array BigInt Boolean Date Error Function Map Number Object Promise RegExp Set String Symbol
META LIST globals  = ( Identifier is String ) clearInterval clearTimeout console document globalThis process setInterval setTimeout window
META LIST literals = ( Identifier is String ) false null true undefined
META LIST puncts   = ( Identifier is String ) { } ( ) [ ] , ; . : ?
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

====== PARSER RULES =========================================

NODE PropDeclStatement = { identifier, mode, expr <> !!! }

RULE PropDeclStatement => Node = prop Identifier `=` Expr <> !!!!

====== HIGHLIGHTING RULES ===================================

HL literal        = ...meta:literals... | literal-num | literal-range

HL literal-int    = [ "-" ] ( ? Digit ? { ? Digit ? | "_" } )
HL literal-float  = [ "-" ] ( ? Digit ? { ? Digit ? | "_" } "." ? Digit ? { ? Digit ? } )
HL literal-num    = literal-float | literal-int
HL literal-range  = ( literal-num ) ".." ( literal-num )

HL literal-array  =  [ list-of-vals ] <> !?!
HL literal-list   = #[ list-of-vals ] <> !?!
HL literal-tuple  = #( list-of-vals ) <> !?!
HL literal-record = #{ list-of-args } <> !?!

HL list-of-args = arg  ?( , arg  )? , <> ???
HL list-of-vals = expr ?( , expr )? , <> ???


HL arg     = pair-kv | id
HL pair-kv = id : expr <> ?.. !!! ...

HL id           = L { L D _ }
HL id-const     = #<id>
HL id-label     = $<id>
HL id-pointer   = &<id>
HL id-temp      = @<id>
HL id-qualified = id :: id <> !!!

(* ===== IDENTIFIER ===== *)



(* ===== LITERALS ===== *)

literal-bool    = "true" | "false" ;
literal-nullish = "null" | "undefined" ;

literal-int   = [ "-" ] ( ? Digit ? { ? Digit ? | "_" } ) ;
literal-float = [ "-" ] ( ? Digit ? { ? Digit ? | "_" } "." ? Ziffer ? { ? Ziffer ? } ) ;
literal-range = ( Digit | Float ) ".." ( Digit | Float ) ;

literal-array  =  "[" [ expr { "," expr } [ "," ] ] "]" ;
literal-list   = "#[" [ expr { "," expr } [ "," ] ] "]" ;  (* no nesting *)
literal-tuple  = "#(" [ expr { "," expr } [ "," ] ] ")" ;  (* no nesting *)
literal-record = "#{" [ id ":" expr { "," id ":" expr } [ "," ] ] "}" ;

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

(* ===== EXPRESSIONS ===== *)

expr-as      = id [ "as" id ] ;
expr-as-list = expr-as { "," expr-as } ;

(* ===== STATEMENTS ===== *)

statement-use = "use" ImportList ";" ;
statement-pnt = "pnt" ImportList ";" ;
statement-ref = "ref" ImportList ";" ;

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



// @cosmonaut/presets/languages/javascript.js

import { cStyleComments } from './../index.js';


export const comments = cStyleComments;


export const keywords = [
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'match',
  'new',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'use',
  'var',
  'void',
  'while',
  'yield',
];






default export {
  comments,
  keywords,
}


RULE Expression = (
  | atom      is char
  | operation is Array (char, Expression)
){
  cn::dispatch
  | operation ('-',
     operation ('*',
      atom('a'),
      atom('b'),
     ),
     operation ('/',
      atom('1'),
      atom('a'),
     ),
}

(- (* a b) (/ 1 a))

## prefixed notation

1 + 2 * 3                  (+ 1(* 2 3))


