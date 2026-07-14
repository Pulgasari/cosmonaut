// EBNF

export tokenize  from './tokenize.js';
export toAST     from './toAST.js';
export toMethods from './toMethods.js';

export function convert ({ from, to, input }) {
  if (from === 'grammar' && to === 'tokens')
  if (from === 'grammar' && to === 'ast)
  if (from === 'grammar' && to === 'methods)
  if (from === 'tokens'  && to === 'ast)
  if (from === 'tokens'  && to === 'methods)
  if (from === 'ast'     && to === 'methods)
}

const EBNF = { tokenize, toAST, toMethods };
export default EBNF;

// :::::: TOKEN TYPES

export const EBNF_TOKEN_TYPES = {
  IDENTIFIER: 'IDENTIFIER',   // z.B. "function-declaration"
  STRING:     'STRING',       // "async" oder ';'
  SYMBOL:     'SYMBOL',       // ::=, |, [, ], {, }, ?, :, (, ), ...
  ELLIPSIS:   'ELLIPSIS',     // ...
  REGEX:      'REGEX',        // ? any valid js regexp pattern ?
  COMMENT:    'COMMENT',      // # Kommentar
  EOF:        'EOF',
};
