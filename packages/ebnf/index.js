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
// Rule names AND references are PascalCased on the way in
// ("function-declaration" -> "FunctionDeclaration"), because that is the
// shape the Machine registry requires. Names already in that shape - most
// importantly token types like IDENTIFIER - pass through untouched.
export function readEBNF (source) {
  const tokens      = createEBNFLexer(source).tokenize();
  const productions = parseEBNFGrammar(tokens);

  return Object.fromEntries(
    productions.map(({ name, expr }) => [toPascalCase(name), normalizeRefs(expr)]),
  );
}

function normalizeRefs (node) {
  switch (node.type) {
    case 'reference' : return { ...node, name: toPascalCase(node.name) };
    case 'sequence'  : return { ...node, factors: node.factors.map(normalizeRefs) };
    case 'choice'    : return { ...node, alternatives: node.alternatives.map(normalizeRefs) };
    case 'optional'  :
    case 'repeat'    :
    case 'group'     : return { ...node, expr: normalizeRefs(node.expr) };
    default          : return node;
  }
}

export function compileEBNF (source, options = {}) {
  return compileGrammar(readEBNF(source), options);
}
