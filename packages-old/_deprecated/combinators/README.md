# @cosmonaut/combinators

## Architecture and Design

The toolkit is designed around several core architectural principles:

 * **No Classes:** There are no classes or inheritance hierarchies. Every combinator is a plain JavaScript function.
 * **Functions as Objects:** Combinators are decorated functions (Combinator). They can be executed directly by passing a parser context, and they carry fluent API methods (such as .many(), .optional(), and .map()) as properties on the function object.
 * **Lazy Rule Binding:** To avoid circular dependency issues when defining recursive rules (e.g., expressions containing expressions), rules are represented as lazy-bound references using rule and parse proxies. They resolve to actual context functions only at parse-time.
 * **Backtrack-by-Default:** Sequential and alternative paths perform automated backtracking. If a combinator fails midway, the index in the parser context is automatically restored to its original state before the failed execution.

## Install

```
deno install jsr:@cosmonaut/combinators
```

## Examples

All comments and implementations in `@cosmonaut/combinators` use English as the project language.

### Example: Hierarchical Statements

```javascript
import { seq, consume, parse, wrapped } from '@cosmonaut/combinators';

// Reference rules dynamically at runtime
const IfStatement = seq(
  consume('if'),
  parse('Expression').capture('condition'),
  parse('Block').capture('thenBranch')
).node('IfStatement');

// Parse blocks with clean nesting
const Block = wrapped(
  consume('{'),
  parse('Statement').many(),
  consume('}')
);
```

### Example: Parameterized Rules (Arguments)

```javascript
import { rule } from '@cosmonaut/combinators';

// Invokes `ctx.Expression(4)` or `ctx.parse('Expression', 4)` under the hood at runtime.
const HighPrecedenceExpr = rule.Expression(4);
```

### Example: Destructuring Sugar

```javascript
import { seq, consume, rule } from '@cosmonaut/combinators';

// Destructure any arbitrary grammar rule names directly from the rule proxy
const { Expression, Block, Statement } = rule;

const IfStatement = seq(
  consume('if'),
  Expression.capture('condition'),
  Block.capture('thenBranch')
).node('IfStatement');
```

## API Reference

### Primitives

| Method / Property | Signature | Returns | Description |
|---|---|---|---|
| call / custom | call(fn: (ctx) => any) | Combinator | Executes a custom user-defined parser function on the context. |
| check | check(pattern: string | RegExp) | Combinator | Tests if the next characters match a pattern without advancing the parser index. |
| consume | consume(value: any) | Combinator | Consumes a specific token or value from the input stream. |
| match | match(pattern: string | RegExp) | Combinator | Consumes input that matches the provided regular expression or string pattern. |
| parse | parse(ruleName: string, ...args: any[]) | Combinator | Dynamic dynamic fallback or property lookup to reference and invoke a context rule. |
| rule | rule.[RuleName] | LazyRule | Proxy object allowing dynamic property destructuring of any grammar rule name. |

### Flow Control

| Method / Property | Signature | Returns | Description |
|---|---|---|---|
| choice | choice(...combinators) | Combinator | Tries several combinators sequentially, returning the result of the first one that succeeds. |
| lookahead / peek | lookahead(combinator) | Combinator | Executes a combinator to verify matching without consuming any input (backtracks index on success). |
| many | many(combinator) | Combinator | Parses zero or more occurrences of the target combinator. Returns an array. |
| many1 | many1(combinator) | Combinator | Parses one or more occurrences of the target combinator. Fails if there is not at least one match. |
| not | not(combinator) | Combinator | Fails if the inner combinator succeeds. Returns true on success and does not consume input. |
| optional | optional(combinator) | Combinator | Tries to parse the combinator. If it fails, backtracks and returns null instead of failing. |
| repeat | repeat(combinator, n) | Combinator | Parses the combinator exactly n times. |
| seq | seq(...combinators) | Combinator | Runs an ordered sequence of combinators. Fails and backtracks if any element in the sequence fails. |
| until | until(cond) | Combinator | Consumes and collects input tokens in a loop until the specified condition combinator matches. |
| while | while(cond) | Combinator | Consumes and collects input tokens as long as the specified condition combinator matches. |

### Parser Helpers

| Method / Property | Signature | Returns | Description |
|---|---|---|---|
| separated | separated(inner, separator) | Combinator | Parses a list of inner elements separated by a separator. Returns an array of parsed inner elements. |
| wrapped | wrapped(open, inner, close) | Combinator | Parses a sequence of open, inner, and close combinators, returning only the result of the inner combinator. |

### Transformations

| Method / Property | Signature | Returns | Description |
|---|---|---|---|
| capture | capture(combinator, name) | Combinator | Runs the combinator and returns its result wrapped in an object field with the given key name. |
| map | map(combinator, fn) | Combinator | Applies a mapping function to transform the parsed value of a successful combinator. |
| node | node(combinator, type) | Combinator | Wraps the result of a combinator in an AST node object containing type, start, and end offsets. |

### Utilities

| Method / Property | Signature | Returns | Description |
|---|---|---|---|
| debug | debug(combinator, message?) | Combinator | Logs entry, success, failure, index, and parsed results to console for debugging. |
| lazy | lazy(fn) | Combinator | Defers evaluation of a combinator function until parsing execution time (useful for recursion). |
| memo | memo(combinator) | Combinator | Memorizes parser results at specific context indexes (Packrat parsing style) to ensure O(n) parsing. |
| named | named(combinator, name) | Combinator | Attaches a display name to a combinator for cleaner debug logs and error messages. |
