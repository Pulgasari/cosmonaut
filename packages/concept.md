
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



```text
packages/
├── core/                      # Die puren Mechaniken (kein Sprachwissen)
│   ├── streamer.js            # Cursor für Sequenzen (Zeichen ODER Tokens)
│   ├── traverser.js           # Baum-Traversal (für AST)
│   └── stack-machine.js       # Stack-Automat (für Bottom-Up)
│
├── lexer/                     # TOP-LEVEL: Wandelt Zeichen → Tokens
│   └── (nutzt core/streamer.js)
│
├── (Familie A: Top-Down / Recursive Descent)
│   ├── parser/                # Kern-Klasse für TD (nutzt core/streamer.js auf Token-Ebene)
│   ├── combinators/           # Deklarative DSL für TD
│   └── pratt/                 # Präzedenz-Climbing für TD
│
├── (Familie B: Bottom-Up / Shift-Reduce)
│   └── lr-parser/             # Kern-Klasse für LR/LALR (nutzt core/stack-machine.js)
│
├── grammar/                   # <-- HIER GEHÖRT ES HIN (GANZ OBEN, UNABHÄNGIG)
│   ├── ebnf/                  # Parser für EBNF-Syntax
│   ├── peg/                   # Parser für PEG-Syntax (ist inhärent TD)
│   ├── backends/
│   │   ├── td-generator/      # Übersetzt Grammatik in parser/combinators-Code
│   │   └── lr-generator/      # Übersetzt Grammatik in lr-parser-Tabellen
│   └── index.js               # Orchestriert: "Welches Backend willst du?"
│
└── presets/                   # Daten (Keywords, Token-Typen) für ALLE
```


```text
packages/
├── core/
│   ├── streamer.js          # GENERISCH: Cursor über SEQUENZEN (beliebige Items)
│   ├── traverser.js         # GENERISCH: Baum-Traversal
│   └── stack-machine.js     # GENERISCH: Stack-Automat (für Bottom-Up)
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
