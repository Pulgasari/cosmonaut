# LSD

*(Language Syntax Definition)*

---

Dieses Dokument hält den aktuellen Spezifikationsstand der universellen Language-DSL für das JavaScript Lexer/Parser/Compiler Toolkit fest. Die DSL dient als **Single Source of Truth** für den Tokenizer, Parser, die AST-Generierung und das Syntax-Highlighting.

---

## 1. Kern-Architektur & Keywords

Die DSL verzichtet bewusst auf redundanten Sonderzeichen-Bloat und nutzt einheitlich das Gleichheitszeichen (`=`) für Deklarationen sowie den Richtungspfeil (`<=`) für den syntaktischen Datenfluss. Sie ist in fünf funktionale Blöcke unterteilt:

* **`META`**: Globale Listen, Konfigurationen und Operator-Präzedenzen.
* **`TKN`**: Reguläre Ausdrücke für den lexikalischen Scanner (Tokenizer).
* **`RULE`**: Deterministische Parsing-Regeln (PEG-basiert) mit optionaler AST- oder Regel-Mündung.
* **`NODE`**: Deklarative Definition der Ziel-Datenstrukturen des Abstract Syntax Trees (AST).
* **`HL`**: Mappings für semantisches und syntaktisches Code-Highlighting.

---

## 2. Tokenizer- & Metadaten (META & TKN)

### META LIST

Definiert statische Wort- oder Symbollisten, die vom Tokenizer wiederverwendet werden können, um z. B. Keywords von Identifiers zu trennen.

```md
META LIST keywords = as break continue fn pkg val
```

### META LIST operators

Ein spezialisierter Block, der Operatorgruppen, deren Assoziativität und Priorität (Precedence) definiert. Das Toolkit nutzt diese Tabelle, um intern einen Pratt-Parser für mathematische Ausdrücke zu generieren, ohne dass die PEG-Regeln tief verschachtelt werden müssen.
```md
META LIST operators = (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( = += -= )
  additive left   300  ( + - )
}
```

### TKN Rules

Definiert Tokens mithilfe von JavaScript-RegEx-Literalen. Jedes native RegEx-Literal sollte das Sticky-Flag `/y` besitzen, um eine performante, zeigerbasierte Analyse des Quelltextes zu ermöglichen.

```md
TKN STRING     = /"(?:\\.|[^"\\])*"/y
TKN KEYWORD    = keywords
TKN OPERATOR   = operators
```

---

## 3. Parser-Regeln & AST-Knoten (RULE & NODE)

Die Syntax unterscheidet strikt zwischen reiner Textanalyse (PEG-Muster), der Überführung von gematchten Daten in Datenstrukturen (Knoten) und der Strukturdeklaration selbst.

### A. Reine Grammatik-Regel (Kein Node)

Wenn ein Ausdruck lediglich eine Struktur gruppiert oder validiert, ohne einen eigenen Speicher-Knoten im Baum zu hinterlassen, wird ein einfaches `=` verwendet.

```md
RULE Program = Statement*
```

### B. Implizite Node-Überführung (`= Node <=`)

Der Pfeil `<=` signalisiert den Datenfluss: Die rechts stehende PEG-Regel wird geparst, und die mit `:Labels` markierten Werte fließen nach links in den Knoten ab. Bei `Node <=` erzeugt das Toolkit automatisch einen AST-Knoten, dessen Typ exakt dem Namen der `RULE` entspricht.

```md
RULE VarDecl = Node <= "val" name:IDENTIFIER "=" value:Expression ";"
```

Dazu passend deklariert die `NODE`-Regel die Struktur des Objekts mittels einfachem `=`:

```md
NODE VarDecl = { name, value }
```

### C. Explizite Node-Überführung (`= Node "Name" <=`)

Soll das Ergebnis der Regel in einen Knoten fließen, der *anders* heißt als die Regel selbst, wird der Name explizit in Anführungszeichen angegeben.

```md
RULE FunctionDecl = Node "FunctionDecl" <= ClassicFunctionDecl / ArrowFunctionDecl
```

### D. Rule-Aliasing / Polymorphie (`= Rule "Name" <=`)

Erlaubt es, zwei syntaktisch völlig unterschiedliche Text-Strukturen getrennt zu parsen, dem Toolkit aber mitzuteilen, dass beide am Ende semantisch in derselben Parser-Logik bzw. demselben AST-Reduzierer münden.

```md
RULE ClassicFunctionDecl = Rule "FunctionDecl" <= "fn" identifier:IDENTIFIER "(" args:IdentList? ")" body:Block
RULE ArrowFunctionDecl   = Rule "FunctionDecl" <= "fn" identifier:IDENTIFIER "=>" body:Statement
```

---

## 4. Syntax Highlighting (HL)

Da das Toolkit durch die `TKN`- und `META`-Blöcke bereits die genauen Positionsdaten (Zeile, Spalte) aller relevanten Sprachelemente kennt, erfolgt die Konfiguration für Editoren (wie VS Code TextMate-Scopes) über ein einfaches Direkt-Mapping mit `=`:

```md
HL KEYWORD = "keyword.control"
HL LITERAL = "constant.language"
HL NUMBER  = "constant.numeric"
HL STRING  = "string.quoted"
HL COMMENT = "comment.line"
```

---

## 5. Referenz-Implementierung (Beispiel: Sprache 'Poo')

Hier ist die vollständige, bereinigte Grammatikdatei für den aktuellen Sprachumfang von *Poo*:

```md
# ======================================================================
# POO LANGUAGE SPECIFICATION (DSL REFERENCE)
# ======================================================================

META LIST keywords = as break continue catch do fn for if in new pkg pnt prop ref return static switch until use while yield
META LIST literals = false null true undefined

META LIST operators = (
  group         is String
  associativity is String
  precedence    is Number
) {
  assign   left   100  ( = += -= *= /= ??= )
  compare  idk    200  ( ~= == === != !== < > =< >= || && ?? )
  additive left   300  ( + - )
  multi    left   400  ( * / % )
  pipe     left   500  ( |> ??> )
}

# --- Tokenizer Rules ---
TKN COMMENT     = /\/\/[^\n]*/y
TKN WHITESPACE  = /[ \t\n\r]+/y

TKN KEYWORD     = keywords
TKN LITERAL     = literals
TKN OPERATOR    = operators

TKN NUMBER      = /0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*/y
TKN STRING      = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`])*`/y
TKN IDENTIFIER  = /[a-zA-Z_$][a-zA-Z0-9_$]*/y

# --- Parser Rules & Nodes ---
RULE Program = Statement*
RULE Statement = VarDecl / FunctionDecl / ExpressionStatement

# Variables
RULE VarDecl = Node <= "val" name:IDENTIFIER "=" value:Expression ";"
NODE VarDecl = { name, value }

# Functions
RULE FunctionDecl = Node "FunctionDecl" <= ClassicFunctionDecl / ArrowFunctionDecl
NODE FunctionDecl = { identifier, args, body }

RULE ClassicFunctionDecl = Rule "FunctionDecl" <= "fn" identifier:IDENTIFIER "(" args:IdentList? ")" body:Block
RULE ArrowFunctionDecl   = Rule "FunctionDecl" <= "fn" identifier:IDENTIFIER ( "=" args:FunctionParams? )? "=>" body:Statement

RULE FunctionParams = "(" IdentList? ")" / IdentList
RULE IdentList      = IDENTIFIER ( ","? IDENTIFIER )*
RULE Block          = "{" Statement* "}"

# Expressions & Calls
RULE Expression = FunctionCall / BinaryExpression / LITERAL / IDENTIFIER / STRING / NUMBER

RULE BinaryExpression = Node <= left:Expression op:OPERATOR right:Expression
NODE BinaryExpression = { left, op, right }

RULE FunctionCall = Node <= callee:IDENTIFIER ( args:ParenCallArgs / args:SingleBareArg )
NODE FunctionCall = { callee, args }

RULE ParenCallArgs = "(" CallArgsList? ")"
RULE SingleBareArg = LITERAL / IDENTIFIER / STRING / NUMBER

RULE CallArgsList = NamedArgsList / ExpressionList

RULE NamedArgsList = Node <= args:NamedArg ( ","? args:NamedArg )*
NODE NamedArgsList = { args }

RULE NamedArg = Node <= key:IDENTIFIER ":" value:Expression
NODE NamedArg = { key, value }

RULE ExpressionList = Node <= items:Expression ( ","? items:Expression )*
NODE ExpressionList = { items }

# Literals
RULE ArrayLiteral = Node <= "[" elements:ExpressionList? "]"
NODE ArrayLiteral = { elements }

RULE ListLiteral = Node <= "#[" elements:ExpressionList? "]"
NODE ListLiteral = { elements }

RULE TupleLiteral = Node <= "#(" elements:ExpressionList? ")"
NODE TupleLiteral = { elements }

# --- Highlighting ---
HL KEYWORD = "keyword.control"
HL LITERAL = "constant.language"
HL NUMBER  = "constant.numeric"
HL STRING  = "string.quoted"
HL COMMENT = "comment.line"
```










