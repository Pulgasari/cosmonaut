// @cosmonaut/parser

// :::::: IMPORTS

import { isArray, isFunction, isObject, isString, arrayfied } from '@cosmonaut/utils/internals';
import { createEvilFactory, mergeOptions, ensureArray } from '@cosmonaut/utils';
import {
  resolveTokenSpec, describeTokenSpec, describeToken, makeSequenceResult,
  parseList, parseListWhen, parseUnaryExpression, parseUntil, parseWrapped, parseBinaryExpression,
} from './utils.js';

// :::::: RE-EXPORTS

export * from './utils.js';
export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';

// :::::: MAIN EXPORT

const DEFAULT_WRAPPERS = {
  braces   : ['{', '}'],
  brackets : ['[', ']'],
  parens   : ['(', ')'],
};

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
    if (!this.options.nodeFactory) throw new Error('[Parser] options.nodeFactory is missing.');

    this.node      = this.options.nodeFactory;
    this._wrappers = { ...DEFAULT_WRAPPERS, ...(this.options.wrappers || {}) };
    // this._wrappers = buildWrapperMap(this.options.wrappers);
    this._stack    = []; // for withTokens() sub-parsing (template literals, JSX islands, ...)
    //this._tokenMap = buildTokenValueMap(this.options);
    this._buildTokenMap();
    this._installMethods(); // shared utilities (Parser._methods)
    this._buildDispatch();  // this instance's grammar rules (options.grammar)
    this._buildAliases();
    
    this.setTokens(tokens);
  }

  // :::::: main

  reset () {
    this._current = 0;
  }

  setTokens (tokens) {
    this._tokens  = tokens;
    this._current = 0;
  }
  
  // sub-parsing on a different token stream (template-literal expressions, JSX islands, ...)
  // reuses this same instance (grammar/methods already wired) instead of spinning up a new one.
  withTokens (tokens, fn) {
    this._stack.push({ tokens: this._tokens, current: this._current });
    this.setTokens(tokens);
    try {
      return fn(this);
    } finally {
      ({ tokens: this._tokens, current: this._current } = this._stack.pop());
    }
  }
  
  // :::::: navigate: base

  advance  () { 
    if (!this.isEOF()) this.cursor++; 
    return this.previous(); 
  }
  
  peek (offset = 0) { 
    return this.tokens[this.cursor + offset];
  }

  // :::::: navigate: check / match / consume

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

  // :::::: navigate: value-level alternatives at the current position (NOT type-level)

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
  
  // :::::: navigate: sequential lookahead (+ capture)

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

  // :::::: navigate: extras

  checkNext (spec) { return this._matches(this.next(), spec); }
  checkPrev (spec) { return this._matches(this.prev(), spec); }
  isEOF     ()     { return this.check('EOF'); }
  next      ()     { return this.peek( 1); }
  prev      ()     { return this.peek(-1); }
  
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

  // :::::: utils: control flow
  
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

  // :::::: errors

  error (message) {
    const t = this.peek();
    return new SyntaxError(`[Parser ${t.line}:${t.column}]: ${message} (found '${t.value}')`);
  }

  _unexpected (specOrSpecs, extra) {
    const t = this.peek();
    const expected = isArray(specOrSpecs) && specOrSpecs.length > 1
      ? `one of [${specOrSpecs.map(describeTokenSpec).join(', ')}]`
      : describeTokenSpec(isArray(specOrSpecs) ? specOrSpecs[0] : specOrSpecs);
    const found  = describeToken(t, this.options.tokenTypes);
    const suffix = extra ? ` (${extra})` : '';
    return new SyntaxError(`[Parser ${t.line}:${t.column}]: Expected ${expected} but found ${found}${suffix}`);
  }

  // :::::: internal

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

  // this instance's grammar rules (options.grammar) - installed the same way as
  // _installMethods(), but scoped per-instance instead of shared across the class.
  _buildDispatch () {
    const list = isObject(this.options.grammar) ? Object.values(this.options.grammar) : arrayfied(this.options.grammar);
    for (const fn of list) {
      if (!isFunction(fn)) continue;
      if (!fn.name || !fn.name.startsWith('parse')) continue;
      this[fn.name] = (...args) => fn(this, ...args);
    }
    this.parse = (name, ...args) => this['parse' + name]?.(...args) ?? null;
  }

  _buildTokenMap () {
    const { tokenTypes, keywords, puncts, operators } = this.options;
    this._tokenMap = new Map();

    for (const type of Object.values(tokenTypes))     this._tokenMap.set(type, { type });
    for (const value of ensureArray(keywords))         this._tokenMap.set(value, { type: tokenTypes.KEYWORD,  value });
    for (const value of ensureArray(puncts))           this._tokenMap.set(value, { type: tokenTypes.PUNCT,    value });
    for (const value of Object.keys(operators || {}))  this._tokenMap.set(value, { type: tokenTypes.OPERATOR, value });
  }

  // shared utilities (Parser._methods, e.g. parseList/parseWrapped/...) - static, same
  // across every instance, extended via Parser.addMethod() before any instances exist.
  _installMethods () {
    for (const fn of Parser._methods) {
      this[fn.name] = (...args) => fn(this, ...args);
    }
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
