// @cosmonaut/ebnf/_compile.js

// Compiles a single EBNF AST node (as produced by grammar.js) into a
// parser block: a plain (state) => result | null function, built from
// @cosmonaut/parser/blocks.
//
// "nonterminal" references are resolved lazily, by name, against
// whatever methods the consuming Parser instance has registered -
// see p.parse(name) in @cosmonaut/parser.

import { choice, lazy, many, optional, seq, token } from '@cosmonaut/parser';

export function compileExpr (node) {
  switch (node.type) {
    case 'literal'     : return token(node.value);
    case 'nonterminal' : return lazy(() => state => state.parse(node.name));
    case 'sequence'    : return seq(...node.factors.map(compileExpr));
    case 'choice'      : return choice(...node.terms.map(compileExpr));
    case 'optional'    : return optional(compileExpr(node.expr));
    case 'repeat'      : return many(compileExpr(node.expr));
    case 'group'       : return compileExpr(node.expr);
    default : throw new Error(`[ebnf] Unknown AST node type "${node.type}".`);
  }
}
