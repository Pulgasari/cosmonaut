

```md
TYPE decl-val == switch ( identifier, mode, expr ) {
  (
}

NODE decl-fn         == { identifier, args, body }
RULE decl-fn         == NODE <= decl-fn-classic | decl-fn-arrow
RULE decl-fn-classic ==         `fn` IDENTIFIER `(` args:list-id? `)` body:block
RULE decl-fn-arrow   ==         `fn` IDENTIFIER ( `=` params-fn? )? `=>` body:statement


RULE decl-fn         == 
RULE decl-fn-classic == NODE 'FnDeclaration' <= fn IDENTIFIER   ( IdentifierList )      Block     <> 1 3 5    
RULE decl-fn-arrow   == NODE 'FnDeclaration' <= fn IDENTIFIER = ( IdentifierList ) `=>` Statement <> 1 4 7    

NODE FnDeclaration == { identifier, args, body }
RULE FnDeclaration => | fn IDENTIFIER   ( IdentifierList )      Block     <> NODE 1 3 5    
                      | fn IDENTIFIER = ( IdentifierList ) `=>` Statement <> NODE 1 4 7    


NODE FnDecl == { identifier, args, body }
RULE FnDecl => | fn IDENT   ( IdentList )      Block     <> NODE 1 3 5
               | fn IDENT = ( IdentList ) `=>` Statement <> NODE 1 4 7    

NODE FnDecl == { identifier, args, body }
RULE FnDecl == fn IDENT     ArgsList      Block     => NODE 1 3 5
RULE FnDecl == fn IDENT `=` ArgsList `=>` Statement => NODE 1 4 7    

RULE Dispatch == KEYWORD ? fn  : FnDecl
                         ? val : ValDecl

NODE FnDecl == { identifier, args, body }
RULE FnDecl
== fn IDENT     ArgsList      Block     => NODE 1 3 5
== fn IDENT `=` ArgsList `=>` Statement => NODE 1 4 7    


TYPE FnDecl
:: { identifier, args, body }
== fn IDENT     ArgsList      Block     => 1 3 5
== fn IDENT `=` ArgsList `=>` Statement => 1 4 7



const RULE = {
  seq(
    token('fn'),
    token('IDENTIFIER'),
    choice(
      wrapped( IdentifierList, '()').parse('Block').capture('body'),
      
    )

  )
}
```



lexer / tokenizer / scanner
- 1st stage: scan

Die schöne Erkenntnis für deine Architektur:

· Ein Lexer ist ein Flat-Walker, der eine Sequenz in eine andere Sequenz umwandelt (Zeichen → Tokens).
· Ein Parser (egal ob TD oder BU) ist ein Flat-Walker (über Tokens), der eine Tree-Struktur baut.
· Ein Transformer ist ein Tree-Walker, der den Baum verändert.
· Ein Generator ist ein Tree-Walker, der den Baum in eine flache Sequenz (Text) zurückwandelt.

```
walk > flat > tokenize   # create list of tokens from stream
walk > flat > parse      # create tree of nodes  from stream
walk > tree > transform  # create ast from ast (= transform)
walk > tree > generate   # create code from ast
```

```
├── core
│   ├── climb         (stack-machine)
│   ├── walk-stream   (sequencer: chars or tokens)
│   ├── walk-tree     (traverse)
│
├── lexer
│
├── parser
│   ├── combinators
│   ├── pratt
│
├── presets
│   ├── grammars
│
├── utils
│   ├── internals
```

```
├── core/
│   ├── cursor (stream)
│   ├── stack
│   ├── walk (ast)
```

```
├── generators | interpreters
│   ├── ebnf-lr
│   ├── ebnf-td
│   ├── peg-td
```

```
climb
  - core
    - stack-machine

walk
  - core
    - cursor-streamer
    - ast-walker
    - tokenizer  
  - combinators  # deklarative dsl
  - pratt        # 

generators
- ebnf
- peg

presets
- grammars
  - javascript.ebnf
  - json.ebnf
  - ratscript.peg
```


```text
packages/
├── core/           # Die puren Mechaniken (kein Sprachwissen)
│   ├── streamer.js # Cursor für Sequenzen (Zeichen ODER Tokens)
│   ├── traverser.js           # Baum-Traversal (für AST)
│   └── stack-machine.js       # Stack-Automat (für Bottom-Up)
│
├── lexer/    # TOP-LEVEL: Wandelt Zeichen → Tokens
│   └── (nutzt core/streamer.js)
│
├── Top-Down / Recursive Descent
│   ├── parser/       # class-td TD core/streamer.js for tokens
│   ├── combinators/  # Deklarative DSL für TD
│   └── pratt/        # Präzedenz-Climbing für TD
│
├── Bottom-Up / Shift-Reduce
│   └── lr-parser/   # classLR/LALR via core/stack-machine
│
├── grammar/  
│   ├── ebnf/         # Parser für EBNF-Syntax
│   ├── peg/          # Parser für PEG-Syntax (ist inhärent TD)
│   ├── backends/
│   │   ├── td-generator/    # grammar to combinator code
│   │   └── lr-generator/    # grammar to in lr-parser-Tabellen
│   └── index.js  # Orchestriert: "Welches Backend willst du?"
│
└── presets/                   # Daten (Keywords, Token-Typen) für ALLE
```


```text
packages/
├── core/
│   ├── streamer.js      # GENERISCH: Cursor über SEQUENZEN
│   ├── traverser.js     # GENERISCH: Baum-Traversal
│   └── stack-machine.js # GENERISCH: Stack-Automat (für BU)
│
├── lexer/                   # <-- HIER GEHÖRT ER HIN (Top-Level, unabhängig)
│   ├── index.js             # Nutzt core/streamer.js auf Zeichen-Ebene
│   └── (scanner, regex-builder, etc.)
│
├── (Top-Down / Recursive-Descent-Familie)
│   ├── parser/              # Nutzt core/streamer.js auf TOKEN-Ebene
│   ├── combinators/         # setzt auf parser auf
│   ├── pratt/               # setzt auf parser auf
│   └── grammar/             # EBNF/PEG (kann in TD ODER BU übersetzen)
│
├── (Bottom-Up / Shift-Reduce-Familie)
│   ├── lr-parser/           # Nutzt core/streamer.js auf TOKEN-Ebene (oder stack)
│   └── lalr-generator/      # Erzeugt Parse-Tabellen
│
└── presets/                 # Daten für BEIDE Welten (Token-Typen, Keywords)


```text
packages/
├── core/
│   ├── stream & cursor
│   ├── climb
│   ├── walk
```

```text
- CLIMB (shift-reduce)
- WALK (recursive-descent

├── climb

├── walk
│   ├── cursor
│   ├── combinators
│   ├── tokenizer
│   ├── pratt

├── grammar
│   ├── EBNF
│   ├── PEG


-
```

```text
packages/
├── core/
│   ├── streamer.js          # NUR für Top-Down (Cursor, Backtracking)
│   ├── traverser.js         # Für AST-Besuche (Transformer/Generator)
│   └── stack-machine.js     # NEU: Basis für Bottom-Up (Stack, States, Actions)
│
├── (Top-Down / Recursive-Descent-Familie)
│   ├── parser/              # Kern-Klasse für TD (nutzt streamer.js)
│   ├── combinators/         # Deklarative DSL (setzt auf parser auf)
│   ├── pratt/               # Präzedenztechnik (setzt auf parser auf)
│   └── grammar/             # EBNF/PEG (übersetzen in combinators/parser)
│
└── (Bottom-Up / Shift-Reduce-Familie)  <-- HIER liegt der Unterschied
    ├── lr-parser/           # Kern-Klasse für LR/LALR (nutzt stack-machine.js)
    ├── lalr-generator/      # Erzeugt die Parse-Tabellen aus Grammatiken
    └── (evtl. yacc-compat)  # Kompatibilitätslayer
```


```
[ A ]
​Wiederholung (0 oder mehr): { A }
​Wiederholung (1 oder mehr): Nicht nativ als Symbol vorhanden. Muss als A , { A } ausgeschrieben

```md
?  =
!1 = many1

--- ebnf

      ,      == concat    =
      ;      == terminate =
 ( A  | B )  == alternate =
    ( A )    == group     = 
    [ A ]    == optional  =
    { A }    == match 0 + infinity
A , { A }    == match 1 + infinity

--- peg

 .     == wildcard (länge 1) == advance()

    terminal = 'string'
non-terminal = RuleName

  ( ...   ... ) == sequence (alles muss matchen)
  ( ... | ... ) == ordered choice

  A? or [A]  == match  0 or 1 times  + greedy 
  A*         == match  0 or infinity + greedy
  A+         == expect 1 or infinity + greedy
 &A          == lookahead +1
 !A          == lookahead -1
 !.          = eof

--- regex

  * + ?     == wiederholung + greedy
  *? +?     == lazy / non-greedy
{n}         == exakte zählung
{n, m}      == ranges
(?=A)       == lookahead +1
(?!A)       == lookahead -1
[a-zA-Z0-9] == zeicheklassen

--- we need

  A*    == many  + greedy
  A+    == many1 + greedy
  A?    == optional
 !A     lookahead -1
 &A     lookaheqd +1

terminate == ende der zeile

many0
many1
recursion

{ }  = 0 oder n
{ }1 = 1 oder n
{ }5 = 5 oder n

    terminal = `string`
non-terminal = RuleName or name-rule

---
  ( A )    == sequenz
  [ A ]    == optional
  { A }    == match  0 or greedy  |  could match but dont cares
  { A }*   == match  1 or greedy  |  needs 1 match to be relevant
  { A }*n  == match  n or greedy
  { A }+   == expect 1 or greedy
  { A }+n  == expect n or greedy
  

   A!    == lookahead +1
   A!n   == lookahead +n
  !A     == lookahead -1
 n!A     == lookahead -n

  KETTE [ `,` | `,` KETTE ]
  KETTE | [ `,` KETTE ]


---

--- many1 (Mindestens 1 Element
-- no traling sep == "A" oder "A, B"
Many1Strict ::= Item { "," Item }
Many1Strict  <- Item ( "," Item )*
Many1Strict_M = Item ( "," Item )*
Many1Strict  <- Item ( `,` Item )*

-- opt traling sep == "A", "A,", "A, B", "A, B,"
Many1Trailing ::= Item { "," Item } [ "," ]
Many1Trailing  <- Item ( "," Item )*  ","?
Many1Trailing   = Item ( "," Item )*  ","?
Many1Trailing   = Item ( "," Item )*  [`,`]


--- many0
-- no traling sep but could empty
Many0Strict ::= [ Item { "," Item }  ]
Many0Strict  <- ( Item ( "," Item )* )?
Many0Strict_M = ( Item ( "," Item )* )?
Many0Strict ::= [ Item { `,` Item }  ]
Many0Strict_B = ListOf<Item, ",">
Many0Strict_B = ListOf<Item `,`>
Many0Strict_B = ListPattern[Item `,`]

-- opt traling sep but could empty
Many0Trailing ::= [ Item { "," Item } [ "," ] ]
Many0Trailing  <- ( Item ( "," Item )*  ","?  )?
Many0Trailing   = ( Item ( "," Item )*  ","?  )?
Many0Trailing   = [ Item ( "," Item )* [`,`]  ]



[Item `,`] | [Item]
[Item] | [`,` Item]

 { (Item `,`) | Item }
 { Item | (`,` Item) }


    Item { Item, `,` }
  [ Item { Item, `,` } ]
    Item { `,` Item } [`,`]
  { Item [`,`] }

  [ Item [`,`] ]






