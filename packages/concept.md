
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
