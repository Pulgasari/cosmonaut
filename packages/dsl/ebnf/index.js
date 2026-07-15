// EBNF

export tokenize  from './tokenize.js';
export toAST     from './toAST.js';
export toMethods from './toMethods.js';

export function convert ({ from, to, input }) {
  if (!from || !to || input) return '';
  if (from === 'grammar' && to === 'tokens')  tokenize(input);
  if (from === 'grammar' && to === 'ast')     toAST(tokenize(input));
  if (from === 'grammar' && to === 'methods') toMethods(toAST(tokenize(input)));
  if (from === 'tokens'  && to === 'ast')     toAST(input);
  if (from === 'tokens'  && to === 'methods') toMethods(toAST(input));
  if (from === 'ast'     && to === 'methods') toMethods(input);
}

const EBNF = { convert, tokenize, toAST, toMethods };
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
