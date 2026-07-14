// EBNF/parser

import { EBNF_TOKEN_TYPES } from './meta.js';

export function parseEBNF (tokens) {
  let pos = 0;

  function peek() { return tokens[pos] || { type: EBNF_TOKEN_TYPES.EOF }; }
  function next() { return tokens[pos++]; }
  function match(type) {
    if (peek().type === type) return next();
    return null;
  }
  function expect(type) {
    const token = match(type);
    if (!token) throw new SyntaxError(`Expected ${type} at ${peek().line}:${peek().column}`);
    return token;
  }

  // Produktionen: identifier "::=" expression
  function parseProduction() {
    const name = expect(EBNF_TOKEN_TYPES.IDENTIFIER);
    expect(EBNF_TOKEN_TYPES.SYMBOL); // "::="
    const expr = parseExpression();
    return { type: 'production', name: name.value, expr };
  }

  // Expression: Alternativen (durch "|" getrennt)
  function parseExpression() {
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
    while (peek().type === EBNF_TOKEN_TYPES.SYMBOL ||
           peek().type === EBNF_TOKEN_TYPES.STRING ||
           peek().type === EBNF_TOKEN_TYPES.IDENTIFIER ||
           peek().type === EBNF_TOKEN_TYPES.REGEX ||
           peek().type === EBNF_TOKEN_TYPES.ELLIPSIS) {
      factors.push(parseFactor());
    }
    return factors.length === 1 ? factors[0] : { type: 'sequence', factors };
  }

  function parseFactor() {
    // Option: [ ... ]
    if (peek().value === '[') {
      next(); // '['
      const expr = parseExpression();
      expect(EBNF_TOKEN_TYPES.SYMBOL); // ']'
      return { type: 'optional', expr };
    }
    // Wiederholung: { ... }
    if (peek().value === '{') {
      next(); // '{'
      const expr = parseExpression();
      expect(EBNF_TOKEN_TYPES.SYMBOL); // '}'
      return { type: 'repeat', expr };
    }
    // Gruppe: ( ... ) – optional, kann für Alternativen oder Sequenzen sein
    if (peek().value === '(') {
      next(); // '('
      const expr = parseExpression();
      expect(EBNF_TOKEN_TYPES.SYMBOL); // ')'
      return { type: 'group', expr };
    }
    // String-Literal
    if (peek().type === EBNF_TOKEN_TYPES.STRING) {
      const token = next();
      return { type: 'literal', value: token.value };
    }
    // Regex-Block
    if (peek().type === EBNF_TOKEN_TYPES.REGEX) {
      const token = next();
      return { type: 'regex', value: token.value };
    }
    // Ellipsis (für Zeichenklassen)
    if (peek().type === EBNF_TOKEN_TYPES.ELLIPSIS) {
      const token = next();
      return { type: 'ellipsis', value: token.value };
    }
    // Identifier (Nichtterminal)
    const token = expect(EBNF_TOKEN_TYPES.IDENTIFIER);
    return { type: 'nonterminal', name: token.value };
  }

  // Hauptschleife: alle Produktionen lesen
  const productions = [];
  while (peek().type === EBNF_TOKEN_TYPES.IDENTIFIER) {
    productions.push(parseProduction());
    // optional: Kommentare ignorieren
  }
  return productions;
}
