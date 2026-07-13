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

  // init
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

  // navigate + match
  peek (offset = 0) { 
    return this.tokens[this.cursor + offset];
  }
  check (spec, offset = 0) {
    const { type, value } = resolveTokenSpec(spec, this._tokenMap);
    const token = this.at(offset);
    if (!token) return false;
    return token.type === type && (value === undefined || token.value === value);
  }
  match (spec) {
    if (!this.check(spec)) return false;
    this.advance();
    return true;
  }
  consume (spec, extra) {
    // 'extra' ist optional -> nur für zusätzlichen Kontext, ersetzt NICHT die Kernmeldung
    // z.B. consume('as', "after 'alias'") -> "Expected 'as' but found ... (after 'alias')"
    if (this.check(spec)) return this.advance();
    throw this._unexpected(spec, extra);
  }
  checkAny (...specs) {
    return specs.some(spec => this.check(spec));
  }
  matchAny (...specs) {
    if (!this.checkAny(...specs)) return false;
    this.advance();
    return true;
  }
  consumeAny (...specs) {
    if (this.checkAny(...specs)) return this.advance();
    throw this._unexpected(specs);
  }
  consumeAnyOrMessage (specsList, message) {
    if (this.checkAny(...specsList)) return this.advance();
    throw this._unexpected(specsList, message);
  }
  
  // navigate extras for dx
  checkNext (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue,  1); }
  checkPrev (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue, -1); }
  checkSequence (...specs) { return specs.every((spec, i) => this.check(...normalizeSpec(spec), i)); }
  isEOF    () { return this.check('EOF'); }
  peekNext () { return this.peek( 1); }
  peekPrev () { return this.peek(-1); }
  
  // aliases for dx
  at           = this.peek;
  consumeToken = this.consume;
  isToken      = this.check;
  matchToken   = this.match;
  previous () { return this.at(-1); }

  // navigation
  advance  () { if (!this.isEOF()) this.cursor++; return this.previous(); }
  

  //
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

  // :::::: error handling (implicit — builds full message from spec + current token)

  _unexpected (specOrSpecs, extra) {
    const t = this.peek();
    const expected = Array.isArray(specOrSpecs)
      ? `one of [${specOrSpecs.map(describeTokenSpec).join(', ')}]`
      : describeTokenSpec(specOrSpecs);
    const found = describeToken(t, this.options.tokenTypes);
    const suffix = extra ? ` (${extra})` : '';
    return new SyntaxError(`[Parser ${t.line}:${t.column}] Expected ${expected} but found ${found}${suffix}`);
  }
    
}

default export Parser;

// :::::: HELPERS

export function resolveTokenSpec (spec, tokenMap) {
  if (typeof spec === 'string') {
    const resolved = tokenMap.get(spec);
    if (!resolved) throw new Error(`[Parser] Unknown token spec: "${spec}"`);
    return resolved;
  }

  if (Array.isArray(spec)) {
    const [type, value] = spec;
    return { type, value };
  }

  if (spec && typeof spec === 'object') {
    if ('type'  in spec && 'value' in spec) return { type: spec.type, value: spec.value };
    if ('type'  in spec)                    return { type: spec.type, value: undefined };
    if ('value' in spec)                    return resolveTokenSpec(spec.value, tokenMap);
  }

  throw new Error(`[Parser] Invalid token spec: ${JSON.stringify(spec)}`);
}

export function describeTokenSpec (spec) {
  if (typeof spec === 'string')  return `'${spec}'`;
  if (Array.isArray(spec))       return `'${spec[1] ?? spec[0]}'`;
  if (spec?.value !== undefined) return `'${spec.value}'`;
  if (spec?.type  !== undefined) return spec.type;
  return JSON.stringify(spec);
}
