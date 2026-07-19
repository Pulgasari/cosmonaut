# @cosmonaut/ebnf

Turns a small EBNF grammar into ready-to-use `parseMethods` for
`@cosmonaut/parser`.

## Usage

```js
import Parser from '@cosmonaut/parser';
import { makeRulesFromEBNF } from '@cosmonaut/ebnf';

const grammar = `
  greeting ::= "hello" name ;
  name     ::= "alice" | "bob" ;
`;

const methods = makeRulesFromEBNF(grammar); // { parseGreeting, parseName }
const parser  = new Parser(tokens, { methods });
const ast     = parser.run(); // entry defaults to "Program", override via options.entry
```

## Supported syntax

- `name ::= expression ;` — a production
- `"literal"` / `'literal'` — matches a token whose value equals the literal
- `identifier` — reference to another production, resolved at parse time
  via `p.parse(name)`
- `a b c` — sequence (juxtaposition)
- `a | b | c` — choice
- `[ a ]` — optional
- `{ a }` — repeat (zero or more)
- `( a )` — group
- `# ...` — line comment
