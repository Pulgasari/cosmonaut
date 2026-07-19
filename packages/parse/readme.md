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
import * as methods from './myLangParseMethods.js'; // custom parsing methods

const myLangParserConfig = {
  methods : methods,
};

const myInputTokens = []; // assumed to be here
const myLangParserConfig = {};
const myLangParser = new Parser (myInputTokens, myLangParserConfig);
const myLangAST    = myLangParser.run();
```

---

The main methods you use are:

- `p.check()`, `p.match()`, `p.expect()`, `p.advance()`
- `p.checkSequence()`, `p.matchSequence()`, `p.expectSequence()`
- `p.parse()` (the central parsing method wrapper)
- `p.parsePattern()`
- `p.parseListPattern()`
- `p.parseBinaryExpr()`
- `p.parseUnaryExpr()`
- `p.$` a link to the blocks-system


---

### Example for Creating Custom Nodes

---

### Example for Creating Custom Parsing Methods

Note:

For example the call to `p.parse('Statement')` method is the sugar the CosmonautParser provides when the implementor register its own methodes to the class. Otherwise he must only use `parseStatement(p)`.

The reason for this is that the `p.parse()` wrapper enhances the readability while the registering in general gonna decorate the methods with debugging info etc.

```js
// myLangParseMethods.js (example)


export function parseLabeledStatement (p) {
  const label = p.advance().value; // identifier
  p.advance(); // ':'
  const body = p.parse('Statement');
  return ASTNode['LabeledStatement']({ label, body });
}

export function parseWhileStatement (p) {
  p.advance(); // 'while'
  const test = p.parse('Wrapped', '()', 'ConditionTest');
  const body = p.parse('Block');
  return ASTNode.WhileStatement({ test, body });
}

export function parseBlock (p) {
  const p.parse('Wrapped', '{}', 'Body');
  return ASTNode['BlockStatement']({ body });
}

export function parseStatement (p) {
  if (p.checkSequence('IDENTIFIER', ':')) return p.parse('LabeledStatement');

  return p.dispatch({
    'alias'         : 'AliasDeclaration',
    'async'         : 'FunctionDeclaration',
    'break'         : 'BreakStatement',
    'class'         : 'ClassDeclaration',
    'const'         : 'VariableDeclaration',
    'continue'      : 'ContinueStatement',
    'export'        : 'ExportDeclaration',
    'fn'            : 'FunctionDeclaration',
    'for'           : 'ForStatement',
    'if'            : 'IfStatement',
    'import'        : 'ImportDeclaration',
    'let'           : 'VariableDeclaration',
    'mold'          : 'MoldStatement',
    'return'        : 'ReturnStatement',
    'sift'          : 'SiftStatement',
    'switch'        : 'SwitchStatement',
    'trait'         : 'TraitDeclaration',
    'try'           : 'TryStatement',
    'union'         : 'UnionDeclaration',
    'while'         : 'WhileStatement',
    'var'           : 'VariableDeclaration',
  }).or('ExprStatement');
}
```

---

Additional Notes:

- I am aware that there are several issues with the unidentical naming of stuff. But for now we don't do nothing about it. But we gonna collect and remember all the issues like this we will come across while bulding the CosmonautParser.



























