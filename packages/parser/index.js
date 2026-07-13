// @cosmonaut/parser

const defaultOptions = {
  grammar     : [],   // Module mit parseXxx-Regeln, s.u.
  keywords    : [],
  nodeFactory : null, // s.u. (ASTNode-Proxy)
  puncts      : [],
  operators   : {},
  tokenTypes  : null, // z.B. via buildTokenTypes() aus @cosmonaut/lexer
  wrappers    : {},   // custom open/close-Paare, s.u.
};

export class Parser {
  constructor (tokens = [], options = {}) {
    this.options = mergeOptions(options, defaultOptions);
    if (!this.options.nodeFactory) throw new Error('[Parser] options.nodeFactory fehlt.');

    this._tokenMap = buildTokenValueMap(this.options);
    this._wrappers = buildWrapperMap(this.options.wrappers);
    this.node      = this.options.nodeFactory;
    this._stack    = [];
    
    this.setTokens(tokens);
    this._buildDispatch();
  }

  // navigate
  at (offset = 0) { return this.tokens[this.cursor + offset]; }
  peek     () { return this.at( 0); }
  peekNext () { return this.at( 1); }
  peekPrev () { return this.at(-1); }

  check   (typeOrValue, maybeValue, offset = 0) { /* wie isToken, aber mit offset */ }
  match   (typeOrValue, maybeValue)             { if (this.check(typeOrValue, maybeValue)) { this.advance(); return true; } return false; }
  consume (typeOrValue, maybeValue, message)    { /* wie bisher */ }

  checkAny (...specs) {
    return specs.some(spec => this.check(...normalizeSpec(spec)));
  }
  consumeAny (specs, message) {
    if (this.checkAny(...specs)) return this.advance();
    throw this.error(message ?? `Erwarte eines von [${specs.join(', ')}]`);
  }
  matchAny (...specs) {
    if (this.checkAny(...specs)) return this.advance();
    return false;
  }
  
  

  //
  checkNext (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue,  1); }
  checkPrev (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue, -1); }
  checkSequence (...specs) { return specs.every((spec, i) => this.check(...normalizeSpec(spec), i)); }
  
  // aliases
  consumeToken = this.consume;
  isToken      = this.check;
  matchToken   = this.match;
  previous () { return this.at(-1); }

  // navigation
  advance  () { if (!this.isEOF()) this.cursor++; return this.previous(); }
  peek     () { return this.tokens[this.cursor]; }
  peekNext () { return this.tokens[this.cursor + 1]; }
  previous () { return this.tokens[this.cursor - 1]; }
  isEOF    () { return this.isToken('EOF'); }

  // matching
  isToken      (typeOrValue, maybeValue) { /* wie bisher, aber via this._tokenMap */ }
  matchToken   (typeOrValue, maybeValue) { if (this.isToken(typeOrValue, maybeValue)) { this.advance(); return true; } return false; }
  consumeToken (typeOrValue, maybeValue, message) { /* wie bisher, this.error(...) */ }

  error (message) {
    const t = this.peek();
    return new SyntaxError(`[Parser ${t.line}:${t.column}]: ${message} (Gefunden: '${t.value}')`);
  }

  // Sub-Parsing auf anderem Token-Stream (Template-Expr, JSX-Islands, ...)
  setTokens (tokens) { this.tokens = tokens; this.cursor = 0; }

  withTokens (tokens, fn) {
    this._stack.push({ tokens: this.tokens, cursor: this.cursor });
    this.setTokens(tokens);
    try { return fn(); }
    finally { ({ tokens: this.tokens, cursor: this.cursor } = this._stack.pop()); }
  }

  // from utils
  parseList             (...args) { return parseList             (this, ...args); } // parseElement, options
  parseWrapped          (...args) { return parseWrapped          (this, ...args); } // wrapper, fn
  parseUntil            (...args) { return parseUntil            (this, ...args); } // parseElement, stop
  parseBinaryExpression (...args) { return parseBinaryExpression (this, ...args); } // options, min

  // internal
  _buildDispatch () { /* s.u. Punkt 4 */ }
  
}

default export Parser;

// :::::: HELPERS

/ Spec-Normalisierung: ein Element ist entweder ein String (Wert/Typ, über TOKEN_MAP aufgelöst)
// oder ein [type, value]-Paar für den expliziten Fall
function normalizeSpec (spec) {
  return Array.isArray(spec) ? spec : [spec, undefined];
}


