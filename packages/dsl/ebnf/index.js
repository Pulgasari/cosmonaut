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
