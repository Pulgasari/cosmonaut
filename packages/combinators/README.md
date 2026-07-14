# @cosmonaut/combinators

## Example

### Example: Hierarchische Statements

```javascript
import { seq, consume, rule, wrapped } from '@cosmonaut/combinators';

// Einfache Regeln referenzieren
const IfStatement = seq(
  consume('if'),
  rule.Expression.capture('condition'),
  rule.Block.capture('thenBranch')
).node('IfStatement');

// Blöcke parsen mit sauberer Schachtelung
const Block = wrapped(
  consume('{'),
  rule.Statement.many(),
  consume('}')
);
```

### Example: Parametrisierte Regeln (Arguments)

```javascript
// Ruft unter der Haube `ctx.Expression(4)`
// oder `ctx.parse('Expression', 4)` auf!
const HighPrecedenceExpr = rule.Expression(4);
```

### Example: Destructuring-Sugar (optional)

```javascript
const { Expression, Block, Statement } = rule;

const IfStatement = seq(
  consume('if'),
  Expression.capture('condition'),
  Block.capture('thenBranch')
).node('IfStatement');
```
