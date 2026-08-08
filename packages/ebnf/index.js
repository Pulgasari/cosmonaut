// @cosmonaut/ebnf

// A grammar frontend, not a full language spec: EBNF describes syntax only.
// Token types, keywords and comment styles are not expressible in it, so the
// lexer stays the caller's job.
//
//   readEBNF(source)  -> { RuleName: grammarNode }   raw grammar AST
//   compileEBNF(...)  -> { RuleName: parseMethod }   ready for a Parser
//
// The two-step split is deliberate: a caller may want to inspect, extend or
// selectively override rules before anything is compiled.

import { compileGrammar, toPascalCase } from '@cosmonaut/compiler';

import { createEBNFLexer }  from './lexer.js';
import { parseEBNFGrammar } from './grammar.js';

export { createEBNFLexer, parseEBNFGrammar };

// Rule names are PascalCased on the way in ("function-declaration" ->
// "FunctionDeclaration"), because that is the shape the Machine registry
// requires - EBNF's own hyphenated convention would be rejected.
export function readEBNF (source) {
  const tokens      = createEBNFLexer(source).tokenize();
  const productions = parseEBNFGrammar(tokens);

  return Object.fromEntries(
    productions.map(({ name, expr }) => [toPascalCase(name), expr]),
  );
}

export function compileEBNF (source, options = {}) {
  return compileGrammar(readEBNF(source), options);
}
