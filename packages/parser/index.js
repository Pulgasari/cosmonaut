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
  
  // :::::: navigate + check / match / consume (base names)

  advance  () { 
    if (!this.isEOF()) this.cursor++; 
    return this.previous(); 
  }
  
  peek (offset = 0) { 
    return this.tokens[this.cursor + offset];
  }

  // shared matching core - check(), checkNext/checkPrev, and *Sequence() all go through
  // this, so there's exactly one place that knows how a token compares against a spec.
  _matches (token, spec) {
    if (!token) return false;
    const query = resolveTokenSpec(spec, this._tokenMap);
    if (query.type  !== undefined && token.type  !== query.type)  return false;
    if (query.value !== undefined && token.value !== query.value) return false;
    return true;
  }
  
  check (spec, offset = 0) {
    return this._matches(this.peek(), spec); 
  }

  match (spec) {
    if (this.check(spec)) { this.advance(); return true; }
    return false;
  }

  consume (spec, extra) {
    if (this.check(spec)) return this.advance();
    throw this._unexpected(spec, extra);
  }

  // :::::: value-level alternatives at the current position (NOT type-level)

  checkAny (...specs) {
    return expandSpecs(specs).some(spec => this.check(spec));
  }

  matchAny (...specs) {
    if (this.checkAny(...specs)) { this.advance(); return true; }
    return false;
  }

  consumeAny (specs, message) {
    const list = isString(specs) ? specs.trim().split(/\s+/) : specs;
    if (this.checkAny(...list)) return this.advance();
    throw this._unexpected(list, message);
  }
  
  // :::::: sequential lookahead (+ capture)

  checkSequence (...specs) {
    return expandSpecs(specs).every((spec, i) => this._matches(this.at(i), spec));
  }

  matchSequence (...specs) {
    const list = expandSpecs(specs);
    if (!this.checkSequence(...list)) return null; // falsy -> 'if (p.matchSequence(...))' just works
    return makeSequenceResult(list.map(() => this.advance()));
  }

  consumeSequence (...specs) {
    const list = expandSpecs(specs);
    if (!this.checkSequence(...list)) throw this._unexpected(list);
    return makeSequenceResult(list.map(() => this.advance()));
  }

  // :::::: navigate extras

  checkNext (spec) { return this._matches(this.next(), spec); }
  checkPrev (spec) { return this._matches(this.prev(), spec); }
  isEOF     ()     { return this.check('EOF'); }
  next      ()     { return this.peek( 1); }
  prev      ()     { return this.peek(-1); }
  
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
