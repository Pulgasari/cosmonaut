// @cosmonaut/ebnf

// Public API: turn EBNF grammar source into an object of parseMethods,
// ready to be passed into `new Parser(tokens, { methods })`.

import { createEBNFLexer }  from './_lexer.js';
import { parseEBNFGrammar } from './_grammar.js';
import { compileExpr }      from './_compile.js';
import { toPascalCase }     from '@cosmonaut/utils/internals';

export function makeRulesFromEBNF (source) {
  const tokens      = createEBNFLexer(source).tokenize();
  const productions = parseEBNFGrammar(tokens);

  return Object.fromEntries(
    productions.map(({ name, expr }) => [
      `parse${toPascalCase(name)}`,
      compileExpr(expr),
    ]),
  );
}
