// @cosmonaut/ebnf/grammar.js

// Grammar for the small EBNF dialect this package understands, expressed
// with the very same @cosmonaut/parsers blocks used to parse any other
// language. Internal to @cosmonaut/ebnf, not part of the public API.
//
//   grammar    = production+
//   production = IDENTIFIER "::=" expression ";"
//   expression = term ( "|" term )*
//   term       = factor+
//   factor     = STRING | IDENTIFIER
//              | "[" expression "]"
//              | "{" expression "}"
//              | "(" expression ")"
//
// Node shapes are the shared grammar AST from @cosmonaut/compiler - not a
// dialect of its own. A bare IDENTIFIER becomes a `reference`; EBNF has no
// in-band token type declarations, so every reference is a rule reference
// and terminals are always quoted.

import { TokenStream } from '@cosmonaut/compiler';
import { choice, lazy, many1, map, seq, sepBy1, token } from '@cosmonaut/parsers';

// STRING tokens still carry their delimiters, but a grammar literal is the
// text between them - `"val"` has to compile to a match against `val`.
const unquote = text => text.slice(1, -1).replace(/\\(["'\\])/g, '$1');

const literal   = map(token('STRING'),     t => ({ type: 'literal',   value: unquote(t.value) }));
const reference = map(token('IDENTIFIER'), t => ({ type: 'reference', name:  t.value }));

const optionalExpr = map(
  seq(token('['), lazy(() => expression), token(']')),
  ([, expr]) => ({ type: 'optional', expr }),
);

// "{ x }" is zero-or-more in EBNF, so atLeastOne is false.
const repeatExpr = map(
  seq(token('{'), lazy(() => expression), token('}')),
  ([, expr]) => ({ type: 'repeat', expr, atLeastOne: false }),
);

const groupExpr = map(
  seq(token('('), lazy(() => expression), token(')')),
  ([, expr]) => ({ type: 'group', expr }),
);

const factor = choice(optionalExpr, repeatExpr, groupExpr, literal, reference);

const term = map(
  many1(factor),
  factors => factors.length === 1 ? factors[0] : { type: 'sequence', factors },
);

const expression = map(
  sepBy1(term, token('|')),
  alternatives => alternatives.length === 1
    ? alternatives[0]
    : { type: 'choice', alternatives },
);

const production = map(
  seq(token('IDENTIFIER'), token('::='), expression, token(';')),
  ([name, , expr]) => ({ type: 'production', name: name.value, expr }),
);

const grammar = many1(production);

export function parseEBNFGrammar (tokens) {
  const stream = new TokenStream(tokens);
  const result = grammar(stream);

  if (result === undefined || !stream.eof()) {
    throw stream.error('Failed to parse EBNF grammar');
  }

  return result;
}
