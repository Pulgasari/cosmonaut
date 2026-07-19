// @cosmonaut/ebnf/_grammar.js

// Grammar for the small EBNF dialect this package understands, expressed
// with the very same @cosmonaut/parser/blocks combinators used to parse
// any other language. This file is internal to @cosmonaut/ebnf - it is
// not part of the public API.
//
//   grammar    = production+
//   production = IDENTIFIER "::=" expression ";"
//   expression = term ( "|" term )*
//   term       = factor+
//   factor     = STRING | IDENTIFIER
//              | "[" expression "]"
//              | "{" expression "}"
//              | "(" expression ")"

import { ParserState, choice, lazy, many1, map, seq, sepBy1, token } from '@cosmonaut/parser';

const literal     = map(token('STRING'),     t => ({ type: 'literal',     value: t.value }));
const nonterminal = map(token('IDENTIFIER'), t => ({ type: 'nonterminal', name:  t.value }));

const optionalExpr = map(
  seq(token('['), lazy(() => expression), token(']')),
  ([, expr]) => ({ type: 'optional', expr }),
);

const repeatExpr = map(
  seq(token('{'), lazy(() => expression), token('}')),
  ([, expr]) => ({ type: 'repeat', expr }),
);

const groupExpr = map(
  seq(token('('), lazy(() => expression), token(')')),
  ([, expr]) => ({ type: 'group', expr }),
);

const factor = choice(optionalExpr, repeatExpr, groupExpr, literal, nonterminal);

const term = map(
  many1(factor),
  factors => factors.length === 1 ? factors[0] : { type: 'sequence', factors },
);

const expression = map(
  sepBy1(term, token('|')),
  terms => terms.length === 1 ? terms[0] : { type: 'choice', terms },
);

const production = map(
  seq(token('IDENTIFIER'), token('::='), expression, token(';')),
  ([name, , expr]) => ({ type: 'production', name: name.value, expr }),
);

const grammar = many1(production);

export function parseEBNFGrammar (tokens) {
  const state  = new ParserState(tokens);
  const result = grammar(state);

  if (result == null || !state.isEOF()) {
    throw new SyntaxError(`[ebnf] Failed to parse grammar at token index ${state.index}.`);
  }

  return result;
}
