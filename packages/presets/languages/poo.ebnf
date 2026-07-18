(* ================================================================
   KOMPLETTE EBNF-GRAMMATIK – STAND 12
   ================================================================
   Enthaltene Features:
   - Literale (Zahlen, Strings mit Escapes & Interpolation, Booleans, null/undefined)
   - Collections (Arrays, Listen, Tuples, Records)
   - Ausdrücke (Prioritäten: Range, Multiplikativ, Additiv, Vergleich, Pipe, Ternary, Assignment)
   - Variablen-Deklarationen (prop, @)
   - Funktionen (FunctionExpression als First-Class-Citizen)
   - Kontrollfluss (if/or, for, while, until)
   - Sprünge (break, continue, return)
   - Imports (use, pnt, ref mit "as"-Alias)
   - Blöcke & Statements
   ================================================================ *)

(* ===== OPERATORS ===== *)

op-assign   = ("=" | "#=") ;
op-multi    = ("*" | "/")  ;
op-additive = op-multi    { ("+" | "-") op-multi } ;
op-compare  = op-additive { ("==" | "===" | "<" | ">" | "<=" | ">=" | "!=" | "!==" | "~=") op-additive } ;
op-pipe     = op-compare  { ("|>" | "??>" | "?!>") op-compare } ;
op-ternary  = op-pipe     { "?" expr ":" expr } ;
op-assign   = op-ternary  { ("=" | "+=" | "-=" | "*=" | "/=" | "??=" | "?!=") op-ternary } ;

(* ===== IDENTIFIER ===== *)

id           = ? Letter { Letter | Digit | "_" } ? ;
id-const     = "#" id ;
id-label     = "$" id ;
id-pointer   = "&" id ;
id-temp      = "@" id ;
id-qualified = id { "::" id } ;

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
