// @cosmonaut/ebnf/_lexer.js

// Token preset for the small EBNF dialect this package understands:
//
//   name ::= expression ;
//
// where expression is built from string literals, identifiers,
// "|" (choice), "[ ]" (optional), "{ }" (repeat) and "( )" (group).
// Comments start with "#" and run to the end of the line.

import { Lexer, buildTokenTypes, resolveRules } from '@cosmonaut/lexer';
import { baseRules, hashStyleComments }         from '@cosmonaut/presets';

export const tokenTypes = buildTokenTypes();

// Allow hyphens in identifiers (e.g. "function-declaration"),
// matching the style used throughout the existing grammar drafts.
const identifier = {
  id: 'identifier',
  type: tokenTypes.IDENTIFIER,
  regex: /[a-zA-Z_][a-zA-Z0-9_-]*/,
};

const puncts = ['::=', '|', '[', ']', '{', '}', '(', ')', ';'];

const rules = resolveRules([
  baseRules.doubleQuoteString,
  baseRules.singleQuoteString,
  identifier,
]);

export function createEBNFLexer (source) {
  return new Lexer(source, {
    tokenTypes,
    comments: hashStyleComments,
    puncts,
    rules,
  });
}
