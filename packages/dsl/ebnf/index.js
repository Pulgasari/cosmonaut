// EBNF

import { tokenizeEBNF } from './tokenizer.js';
import { parseEBNF }    from './parser.js';
import { compileEBNF }  from './compiler.js'; // (noch nicht gezeigt)

export default function installEBNF (Parser, grammarSource) {
  const tokens  = tokenizeEBNF (grammarSource); // tokenize :: convert grammar into tokens
  const ast     =    parseEBNF (tokens);        // parse    :: convert tokens  into ast
  const methods =  compileEBNF (ast);           // compile  :: convert ast     into parser methods
  
  Parser.addMethod(methods);
}

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
