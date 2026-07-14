// EBNF/parser

import { EBNF_TOKEN_TYPES } from './meta.js';

// :::::: toAST <> convert grammar tokens to AST

export default function toAST (tokens) {
  let pos = 0;

  function peek   ()     { return tokens[pos] || { type: EBNF_TOKEN_TYPES.EOF }; }
  function next   ()     { return tokens[pos++]; }
  function match  (type) { return (peek().type === type) ? next() : null; }
  function expect (type) {
    const token = match(type);
    if (!token) throw new SyntaxError(`Expected ${type} at ${peek().line}:${peek().column}`);
    return token;
  }

  // Produktionen: identifier "::=" expression
  function parseProduction () {
    const name = expect(EBNF_TOKEN_TYPES.IDENTIFIER);
    expect(EBNF_TOKEN_TYPES.SYMBOL); // "::="
    const expr = parseExpression();
    return { type: 'production', name: name.value, expr };
  }

  // Expression: Alternativen (durch "|" getrennt)
  function parseExpression () {
    const terms = [parseTerm()];
    while (peek().value === '|') {
      next(); // '|' konsumieren
      terms.push(parseTerm());
    }
    return terms.length === 1 ? terms[0] : { type: 'choice', terms };
  }

  // Term: Sequenz von Faktoren (optional, Wiederholung, Gruppe, Literal, Identifier)
  function parseTerm() {
    const factors = [];
    while (peek().type === EBNF_TOKEN_TYPES.SYMBOL     ||
           peek().type === EBNF_TOKEN_TYPES.STRING     ||
           peek().type === EBNF_TOKEN_TYPES.IDENTIFIER ||
           peek().type === EBNF_TOKEN_TYPES.REGEX      ||
           peek().type === EBNF_TOKEN_TYPES.ELLIPSIS   ){
      factors.push(parseFactor());
    }
    return factors.length === 1 ? factors[0] : { type: 'sequence', factors };
  }

  function parseFactor() {
    switch (peek().value) {
      case '[' : next(); const expr = parseExpression(); expect(EBNF_TOKEN_TYPES.SYMBOL); return { expr, type: 'optional' };
      case '{' : next(); const expr = parseExpression(); expect(EBNF_TOKEN_TYPES.SYMBOL); return { expr, type: 'repeat'   };
      case '(' : next(); const expr = parseExpression(); expect(EBNF_TOKEN_TYPES.SYMBOL); return { expr, type: 'group'    };
    }
    
    switch (peek().type) {
      case EBNF_TOKEN_TYPES.ELLIPSIS   : return { value: token.value, type: 'ellipsis'    };
      case EBNF_TOKEN_TYPES.IDENTIFIER : return { value: token.value, type: 'nonterminal' };
      case EBNF_TOKEN_TYPES.REGEX      : return { value: token.value, type: 'regex'       };
      case EBNF_TOKEN_TYPES.STRING     : return { value: token.value, type: 'literal'     };
    }

    // Identifier (Nichtterminal)
    const token = expect(EBNF_TOKEN_TYPES.IDENTIFIER);
    return { type: 'nonterminal', name: token.value };
  }

  // Hauptschleife: alle Produktionen lesen
  const productions = [];
  while (peek().type === EBNF_TOKEN_TYPES.ITIFIER) {
    productions.push(parseProduction());
    // optional: Kommentare ignorieren
  }
  return productions;
}
