# CosmonautParser

This document lays out the construction plan for the CosmonautParser we gonna build next.

---

General Notes about the internal construction of the CosmonautParser.

1. The modular blocks for the base parsing mechanics are provided by `/blocks`. These are pure and kinda its "own thing" but used here.

2. Special higher-level parsing methods are stored in `/methods`. (They will be expanded and enhanced over time. They are kinda pure as well and could be used without the CosmonautParser we are building. But they are also the core parsing methodes the CosmonautParser provides.

3. The Parser State of the Parser is provided by the `ParserState` class in `/classes/ParserState.js`.

---

## Features, Abilities and Usage of the CosmonautParser

Should be used like this:

```js
import Parser from '@cosmonaut/parser';

const myInputTokens = []; // assumed to be here
const myLangParserConfig = {};
const myLangParser = new Parser (myInputTokens, myLangParserConfig);
const myLangAST    = myLangParser.run();
```

When initializing the CosmonautParser you provide the mechanics and meta infos you need for your language like this:

```js
import { comments, keywords, puncts from './myLangMeta.js';
import * as methods from './myLangParseMethods.js';
import * as nodes   from './myLangNodes.js';

const comments  = [];
const keywords  = [];
const operators = [];
const puncts    = [];

const myLangParserConfig = {
  methods : methods.
  nodes   : nodes, // note sure if really needed here?
};
```


---

The main methods you use are:

- `p.parse()`
- `p.parsePattern()`
- `p.parseListPattern()`
- `p.parseBinaryExpr()`
- `p.parseUnaryExpr()`

But additionally the CosmonautParser provides a link to the blocks-system accessible under `p.$`.

---

### Example for Creating Custom Nodes

---

### Example for Creating Custom Parsing Methods

```js
// myLangParseMethods.js (example)


export function parseLabeledStatement (p) {
  const label = p.advance().value; // identifier
  p.advance(); // ':'
  const body = p.parse('Statement');
  return ASTNode['LabeledStatement']({ label, body });
}
```





























