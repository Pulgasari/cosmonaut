# CosmonautParser

This document lays out the construction plan for the CosmonautParser we gonna build at this location: `cosmonaut/packages/parser/classes/Parser.js`

So for this task the only relevant main directory of the repo is: `cosmonaut/packages/parser/`. Please make sure you have the up to date files by loading them or the whole repo.

---

General Notes about the internal construction of the CosmonautParser.

1. The modular blocks for the base parsing mechanics are provided by ``cosmonaut/packages/parser/blocks`. These are pure and kinda its "own thing" but used here.

2. Special higher-level parsing methods are stored in `/methods`. (They will be expanded and enhanced over time. They are kinda pure as well and could be used without the CosmonautParser we are building. But they are also the core parsing methodes the CosmonautParser provides.

3. The Parser State of the CosmonautParser is provided by the `ParserState` class in `cosmonaut/packages/parser/classes/ParserState.js`.

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

### The public methods of the CosmonautParser class:

- `p.check()`, `p.match()`, `p.expect()`, `p.advance()`
- `p.checkSequence()`, `p.matchSequence()`, `p.expectSequence()`
- `p.parse()` (the central parsing method wrapper)
- `p.parsePattern()`
- `p.parseListPattern()`
- `p.parseBinaryExpr()`
- `p.parseUnaryExpr()`
- `p.$` a link to the blocks-system
- `p.dispatch()` with optional `.or()` applied to it

This means that we have to create these: `check`, `match`, `expect`, `advance`, `checkSequence`, `matchSequence`, `expectSequence`, `parse`, `$`, `dispatch/or`

While these already exist:
```
cosmonaut/packages/parser/methods/parseBinaryExpr.js
cosmonaut/packages/parser/methods/parseListPattern.js
cosmonaut/packages/parser/methods/parsePattern.js
cosmonaut/packages/parser/methods/parseUnaryExpr.js
```

---

### Example for Creating Custom Parsing Methods which the User than registers at the CosmonautParser when initializing it

Note:

For example the call here to `p.parse('Statement')` method is the sugar the CosmonautParser provides when the implementor register its own methodes to the class. Otherwise he must only use `parseStatement(p)`.

The reason for this is that the `p.parse()` wrapper enhances the readability while the registering in general will/should in future gonna decorate the methods with debugging info, statistics, etc. (but these additional decorations are not part of the current task)

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

### Clarification on the CosmonautParser's `parse()` Method and the registered Custom Parse Methods the User

The user provides an array/object of objects like for example:

```js
const methods = {
  'parseForStatement': function,
  'parseVariableDeclaration': function,
};
const myLangParser = new Parser (myInputTokens, { methods });
```

Which in practice could simply look like this:

```js
import * as methods from './myLangParseMethods.js'; // custom parsing methods
const myLangParser = new Parser (myInputTokens, { methods });
```

The naming of the methods must have one of these Formats:

- `parseMethodName` (= 'parse' prefix and method name in titlecase)
- `MethodName` (= titlecase, no prefix)

The class internally maps/binds/whatever these functions and its name to be used with the CosmonautParser class like this:

- `p.parseMethodName()`
- `p.parse('MethodName')`
- `p.parse['MethodName']`
- `p.parseMethodName(...args)`
- `p.parse('MethodName', ...args)`
- `p.parse['MethodName'](...args)`

---

## Additional Notes for Coding Style:

- we use indent size of `2 spaces`
- when defining functions we use whitespace around the parens for example `function (args) {...}`
- in general we use modern js syntax style unless these of big negative impact on performance somehow (like array spreading in some cases or whatever)






















