// @cosmonaut/parser

// :::::: IMPORTS & RE-EXPORTS

import * from '@cosmonaut/utils/internals';

export * from './utils.js';
export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';

// :::::: MAIN EXPORT

const defaultOptions = {
  aliases     : [],
  grammar     : [],   // Module mit parseXxx-Regeln, s.u.
  keywords    : [],
  methods     : [],
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

    if (this.options.methods) Parser.addMethod(this.options.methods);
    this._installMethods();
    this._buildAliases();
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
    return expandSpecs(specs).some(spec => this.check(spec));
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

  // sequence
  checkSequence (...specs) { 
    return expandSpecs(specs).every(
      (spec, i) => this.check(...normalizeSpec(spec), i)
    );
  }
  consumeSequence (...specs) {
    if (!this.checkSequence(...specs)) throw this._unexpected(specs);
    return specs.map(() => this.advance());
  }
  matchSequence (...specs) {...}
  sequenceResult () {
    //
    let tokens = [];
    // let id = consumeSequence('IDENTIFIER', ':', 'STRING').value(0);
    const type   = index => tokens[index].type;
    const value  = index => tokens[index].value;

    // let [id, str] = consumeSequence('IDENTIFIER', ':', 'STRING').values(); // all values as array
    // let [id, str] = consumeSequence('IDENTIFIER', ':', 'STRING').values(0,2);
    const types  = () => {};
    const values = () => {};

    const bool;

    return {
      
    }
  }
  // regulär verhalten sich checkSequence, matchSequence, consumeSequence
  // analog zu check, match, consume
  // zusätzlich kann man aber .value/values/type/types() anhängen 
  // für derlei rückgabewerte DX
  
  // navigate extras for dx
  checkNext (spec) { return this.check(spec,  1); }
  checkPrev (spec) { return this.check(spec, -1); }
  isEOF     ()     { return this.check('EOF'); }
  peekNext  ()     { return this.peek( 1); }
  peekPrev  ()     { return this.peek(-1); }
  
  // aliases for dx
  at   = this.peek;
  next = this.peekNext;
  prev = this.peekPrev;

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
  
  // internal
  // options.aliases = { consume: 'expect', check: 'is', peekPrev: 'prev toString' }
  // canonical -> comma/whitespace-separated alias name(s). Additive only - never overrides
  // an existing method/property, whether that's a built-in one or another alias.
  _buildAliases () {
    for (const [canonical, aliasSpec] of Object.entries(this.options.aliases || {})) {
      if (typeof this[canonical] !== 'function') throw new Error(`[Parser] options.aliases: "${canonical}" is not a known method.`);
      for (const aliasName of aliasSpec.trim().split(/[\s,]+/).filter(Boolean)) {
        if (this[aliasName] !== undefined) throw new Error(`[Parser] options.aliases: "${aliasName}" would override an existing method/property.`);
        // indirection through 'this[canonical]' (not a direct .bind()) so aliasing still
        // works even if 'canonical' itself gets reassigned later (e.g. Parser.addMethod()).
        this[aliasName] = (...args) => this[canonical](...args);
      }
    }
  }
  _buildDispatch () { /* s.u. Punkt 4 */ }
  _unexpected (specOrSpecs, extra) {
    // error handling (implicit — builds full message from spec + current token)
    const t = this.peek();
    const expected = Array.isArray(specOrSpecs)
      ? `one of [${specOrSpecs.map(describeTokenSpec).join(', ')}]`
      : describeTokenSpec(specOrSpecs);
    const found  = describeToken(t, this.options.tokenTypes);
    const suffix = extra ? ` (${extra})` : '';
    return new SyntaxError(`[Parser ${t.line}:${t.column}] Expected ${expected} but found ${found}${suffix}`);
  }

  // Methods Registry
  parse (name, ...args) {
    return this['parse' + name]?.(...args) ?? null;
  }
  static _methods = [
    parseBinaryExpression, // options, min
    parseList, // parseElement, options
    parseUnaryExpression,
    parseUntil, // parseElement, stop
    parseWrapped, // wrapper, fn
  ];
  static addMethod (methods) {
    methods = isObject(methods) ? Object.values(methods) : arrayfied(methods);
    for (const fn of methods) {
      if (!isFunction(fn)) continue;
      if (!fn.name || !fn.name.startsWith('parse')) continue;
      // override allowed
      Parser._methods.push(fn);
    }
  }
  _installMethods () {
    for (const fn of Parser._methods) {
      this[fn.name] = (...args) => fn (this, ...args);
    }
  }

  // control flow
  dispatch (cases, defaultTarget) {
    const entries = isArray(cases)
      ? cases
      : Object.entries(cases).map(([specStr, target]) => [specStr.trim().split(/\s+/), target]);
  
    for (const [specs, target] of entries) {
      if (this.checkAny(...specs)) return this.parse(target);
    }
  
    return defaultTarget !== undefined ? this.parse(defaultTarget) : null;
  }
  when (spec, target) {
    if (!this.matchAny(spec)) return null;
    return isString(target) ? this.parse(target) : target(this);
  }
  
}

export default Parser;

// :::::: INTERNAL HELPERS

function expandSpecs (specs) {
  // 'checkAny("{ | )")' statt 'checkAny("{", "|", ")")' -> ein einzelner String-Arg wird
  // an Whitespace aufgesplittet. Mehrere Args (oder Arrays als Specs) bleiben unangetastet.
  return (specs.length === 1 && isString(specs[0]))
    ? specs[0].trim().split(/\s+/)
    : specs;
}

/*
peek      at
advance   eat      eat
check     is       is
match     match    wouldEat
consume   expect   mustEat


*/
