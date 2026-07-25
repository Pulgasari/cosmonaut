# @cosmonaut/generator

Codegen counterpart to `@cosmonaut/parser`: a `Generator` class with the
same method-registration architecture (`genMethodName`/`MethodName`
registered functions become available as `g.genX()`, `g.X()`,
`g.gen('X')`), built on top of `@cosmonaut/doc` and `@cosmonaut/doc-printer`
for layout.

## Installation

```sh
deno install jsr:@cosmonaut/generator
```

## Usage

```js
import Generator from '@cosmonaut/generator';
import { text, concat } from '@cosmonaut/doc';

const operators = {
  '+': { precedence: 12, associativity: 'left' },
  '*': { precedence: 13, associativity: 'left' },
};
const isBinary = node => node.type === 'BinaryExpression';

const methods = {
  genIdentifier: (g, node) => text(node.name),

  genBinaryExpression: (g, node) => g.genBinaryExpr(node, {
    getOperator: n => n.operator,
    getLeft:     n => n.left,
    getRight:    n => n.right,
    operators,
    isBinary,
    genOperand: (gg, n) => gg.genNode(n),
  }),

  genCallExpression: (g, node) => concat(
    g.genNode(node.callee),
    g.genList(node.arguments, { trailingComma: 'ifBreak' }),
  ),
};

const generator = new Generator({ methods });
generator.generate(someAstNode); // -> string
```

## Public API

### `Generator` (class)

- `new Generator({ methods, printOptions, root })`
- `g.genNode(node)` - dispatches to the registered method matching
  `node.type`
- `g.generate(node = options.root, printOptions = options.printOptions)`
  - runs `genNode` and pipes the resulting Doc through
    `@cosmonaut/doc-printer`'s `print()`
- `g.addMethod(key, fn)` - registers an additional method after
  construction
- `g.$` - the full `@cosmonaut/doc` module, for building custom Docs
  inline in your own methods

### Registered custom methods

Same naming convention as `@cosmonaut/parser`'s `methods` option:
`genMethodName` or bare `MethodName`. Once registered, all of these are
equivalent:

```js
g.genBinaryExpression(node);
g.BinaryExpression(node);
g.gen('BinaryExpression', node);
g.gen.BinaryExpression(node);
```

`genNode(node)` is really just `g.gen(node.type, node)`.

### Higher-level methods

- `g.genBinaryExpr(node, config, parentPrecedence = 0)` - precedence-
  and associativity-aware; wraps operands in parentheses as needed
- `g.genUnaryExpr(node, config)` - wraps a binary-shaped operand in
  parentheses
- `g.genList(items, config)` - separated, optionally wrapped list with
  automatic line-breaking (via `group`) and optional trailing comma

See the JSDoc comments in `methods/genBinaryExpr.js`,
`methods/genUnaryExpr.js`, and `methods/genList.js` for the exact
config shape each one expects.
