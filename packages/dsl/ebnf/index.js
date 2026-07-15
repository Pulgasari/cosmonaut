// EBNF

export tokenize  from './tokenize.js';
export toAST     from './toAST.js';
export toMethods from './toMethods.js';

export function convert ({ from, to, input }) {
  if (!from || !to || !input) return '';
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

// :::::: tokenize <> convert grammar definition into tokens

export function default tokenize (source) {
  const len    = source.length;
  const tokens = [];
  let   column = 1;
  let   line   = 1;
  let   pos    = 0;

  while (pos < len) {
    const ch = source[pos];

    // ----- Whitespace -----
    if (/\s/.test(ch)) {
      if (ch === '\n') { line++; column = 1; } else { column++; }
      pos++;
      continue;
    }

    // ----- Kommentar: # bis Zeilenende -----
    if (ch === '#') {
      const start = pos;
      while (pos < len && source[pos] !== '\n') pos++;
      const value = source.slice(start, pos);
      tokens.push({ type: EBNF_TOKEN_TYPES.COMMENT, value, line, column });
      // Zeile/Spalte werden beim nächsten Zeichen (Newline) aktualisiert
      continue;
    }

    // ----- String: "..." oder '...' -----
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = pos;
      pos++; // öffnendes Anführungszeichen überspringen
      let escaped = false;
      while (pos < len) {
        const c = source[pos];
        if (escaped) {
          escaped = false;
          pos++;
          continue;
        }
        if (c === '\\') {
          escaped = true;
          pos++;
          continue;
        }
        if (c === quote) break;
        pos++;
      }
      if (pos >= len) {
        throw new SyntaxError(`Unterminated string at ${line}:${column}`);
      }
      const value = source.slice(start, pos + 1); // inkl. der Anführungszeichen
      tokens.push({ type: EBNF_TOKEN_TYPES.STRING, value, line, column });
      pos++; // schließendes Anführungszeichen überspringen
      column += value.length; // vereinfacht; besser Zeilenumbrüche innerhalb des Strings zählen (optional)
      continue;
    }

    // ----- Regex-Block: ? ... ? -----
    if (ch === '?') {
      const start = pos;
      pos++; // erstes '?' überspringen
      // Suche nach dem nächsten '?', das nicht escaped ist (in EBNF nicht relevant)
      while (pos < len && source[pos] !== '?') pos++;
      if (pos >= len) {
        throw new SyntaxError(`Unterminated regex block at ${line}:${column}`);
      }
      const value = source.slice(start, pos + 1); // inkl. '?'
      tokens.push({ type: EBNF_TOKEN_TYPES.REGEX, value, line, column });
      pos++; // schließendes '?' überspringen
      column += value.length;
      continue;
    }

    // ----- Mehrstellige Symbole: ::=, ... (Ellipsis) -----
    if (source.startsWith('::=', pos)) {
      tokens.push({ type: EBNF_TOKEN_TYPES.SYMBOL, value: '::=', line, column });
      pos += 3;
      column += 3;
      continue;
    }
    if (source.startsWith('...', pos)) {
      tokens.push({ type: EBNF_TOKEN_TYPES.ELLIPSIS, value: '...', line, column });
      pos += 3;
      column += 3;
      continue;
    }

    // ----- Einzelzeichen-Symbole -----
    const singleSymbols = '|[]{}():;';
    if (singleSymbols.includes(ch)) {
      tokens.push({ type: EBNF_TOKEN_TYPES.SYMBOL, value: ch, line, column });
      pos++;
      column++;
      continue;
    }

    // ----- Bezeichner (Identifier) -----
    if (/[a-zA-Z_]/.test(ch)) {
      const start = pos;
      while (pos < len && /[a-zA-Z0-9_-]/.test(source[pos])) pos++;
      const value = source.slice(start, pos);
      tokens.push({ type: EBNF_TOKEN_TYPES.IDENTIFIER, value, line, column });
      column += value.length;
      continue;
    }

    // ----- Unerwartetes Zeichen -----
    throw new SyntaxError(`Unexpected character '${ch}' at ${line}:${column}`);
  }

  tokens.push({ type: EBNF_TOKEN_TYPES.EOF, value: '', line, column });
  return tokens;
}
