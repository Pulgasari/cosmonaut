// @cosmonaut/parser

// :::::: RE-EXPORTS

export * from './utils.js';
export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';

// :::::: MAIN EXPORT

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
    this._installCustomMethods();
  }

  // navigate + match
  advance  () { 
    if (!this.isEOF()) this.cursor++; 
    return this.previous(); 
  }
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
  checkNext     (spec)     { return this.check(spec,  1); }
  checkPrev     (spec)     { return this.check(spec, -1); }
  checkSequence (...specs) { return specs.every((spec, i) => this.check(...normalizeSpec(spec), i)); }
  isEOF    () { return this.check('EOF'); }
  peekNext () { return this.peek( 1); }
  peekPrev () { return this.peek(-1); }
  
  // aliases for dx
  at           = this.peek;
  consumeToken = this.consume;
  isToken      = this.check;
  matchToken   = this.match;
  next         = this.peekNext;
  prev         = this.peekPrev;
  previous     = this.peekPrev;

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
  parseUnaryExpression  (...args) { return parseUnaryExpression  (this, ...args); }

  // internal
  _buildDispatch () { /* s.u. Punkt 4 */ }
  _unexpected (specOrSpecs, extra) {
    // error handling (implicit — builds full message from spec + current token)
    const t = this.peek();
    const expected = Array.isArray(specOrSpecs)
      ? `one of [${specOrSpecs.map(describeTokenSpec).join(', ')}]`
      : describeTokenSpec(specOrSpecs);
    const found = describeToken(t, this.options.tokenTypes);
    const suffix = extra ? ` (${extra})` : '';
    return new SyntaxError(`[Parser ${t.line}:${t.column}] Expected ${expected} but found ${found}${suffix}`);
  }

  // Methods Registry
  static _customMethods = [];
  static addMethod (methods) {
    if (!Array.isArray(methods)) methods = [methods];
    for (const fn of methods) {
      if (typeof fn !== 'function')                 continue;
      if (!fn.name || !fn.name.startsWith('parse')) continue;
      // override allowed
      Parser._customMethods.push(fn);
    }
  }
  _installCustomMethods() {
    for (const fn of Parser._customMethods) {
      this[fn.name] = (...args) => fn (this, ...args);
    }
  }
  
}

export default Parser;
