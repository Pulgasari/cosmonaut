// @cosmonaut/ebnf

// Turns EBNF grammar source into parser methods. Terminals are quoted
// literals; every bare name is a rule reference - EBNF has no in-band token
// type declarations, so nothing to disambiguate.

import { compileGrammar } from '@cosmonaut/compiler';
import { toPascalCase }   from '@cosmonaut/compiler/internals/index.js';

import { createEBNFLexer }  from './lexer.js';
import { parseEBNFGrammar } from './grammar.js';

export function readEBNF (source) {
  const tokens      = createEBNFLexer(source).tokenize();
  const productions = parseEBNFGrammar(tokens);

  return Object.fromEntries(
    productions.map(({ name, expr }) => [toPascalCase(name), expr]),
  );
}

export function makeRulesFromEBNF (source, options = {}) {
  return compileGrammar(readEBNF(source), options);
}
