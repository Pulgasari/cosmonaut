// packages/parser/classes/Parser.js

import { isTitleCase }        from '@cosmonaut/utils/internals';
import ParserState            from './ParserState.js';
import * as blocks            from './../blocks/index.js';
import parseBinaryExprMethod  from './../methods/parseBinaryExpr.js';
import parseListPatternMethod from './../methods/parseListPattern.js';
import parsePatternMethod     from './../methods/parsePattern.js';
import parseUnaryExprMethod   from './../methods/parseUnaryExpr.js';

// :::::: Helpers

function normalizeMethodName (key) {
  if (key.startsWith('parse') && key.length > 5 && isTitleCase(key.slice(5))) return key.slice(5);
  if (isTitleCase(key)) return key;
  throw new Error(`[Parser] Invalid method name "${key}" (expected "parseMethodName" or "MethodName").`);
}

// Core instance surface that grammar-rule registration must never overwrite.
// (parseBinaryExpr/parseUnaryExpr/parsePattern/parseListPattern are
// intentionally NOT in this list - they no longer live at the top level
// at all, see constructor comment.)
const RESERVED_CORE_NAMES = new Set(['$', 'check', 'match', 'advance', 'expect', 'consume', 'checkSequence', 'matchSequence', 'expectSequence', 'save', 'restore', 'peek', 'next', 'eof', 'dispatch', 'run', 'addMethod', 'parse', 'options', 'state', '_methods']);

const defaultOptions = {
  methods : {},
  entry   : 'Program',
};

export default class Parser {

  // :::::: init

  constructor (tokens = [], options = {}) {
    this.options = { ...defaultOptions, ...options };
    this.state   = new ParserState(tokens);

    // `p.$` is the toolkit namespace: the low-level @cosmonaut/blocks
    // combinators PLUS the higher-level parsing utilities below
    // (parsePattern/parseListPattern/parseBinaryExpr/parseUnaryExpr).
    // These utilities are deliberately kept OFF the instance's own
    // top-level `p.parseX()` surface, because that surface is also where
    // `_registerMethods()` attaches custom grammar rules by name - and a
    // grammar rule is free to be named "BinaryExpr" or "UnaryExpr" (very
    // plausible; poo.lsd itself has one). If these utilities lived at
    // `p.parseBinaryExpr`/`p.parseUnaryExpr` directly, registering such a
    // rule would silently shadow the built-in utility, and any call to it
    // from within a custom rule (e.g. implementing precedence climbing)
    // would recurse into itself instead of the real implementation.
    // Routing through `p.$` avoids the collision entirely, regardless of
    // what grammar rule names get registered - no manual re-importing
    // needed on the implementor's side.
    this.$ = {
      ...blocks,
      parsePattern     : (pattern, strategies, capture) => parsePatternMethod(this, pattern, strategies, capture),
      parseListPattern : (element, config) => parseListPatternMethod(this, element, config),
      parseBinaryExpr  : (config, minPrecedence = 0) => parseBinaryExprMethod(this, config, minPrecedence),
      parseUnaryExpr   : (config) => parseUnaryExprMethod(this, config),
    };

    this._methods = {};

    this._buildParse();
    this._registerMethods(this.options.methods);
  }

  // :::::: Core Token API

  check   (typeOrValue) { return this.state.check(typeOrValue); }
  match   (typeOrValue) { return this.state.match(typeOrValue); }
  advance ()            { return this.state.next(); }

  expect (typeOrValue) {
    const token = this.match(typeOrValue);
    if (token == null) throw new SyntaxError(`[Parser] Expected '${typeOrValue}' at position ${this.state.index}.`);
    return token;
  }

  // alias needed by the @cosmonaut/blocks combinators, which call `.consume()`
  consume (typeOrValue) { return this.expect(typeOrValue); }

  checkSequence (...values) {
    return values.every((value, offset) => {
      const token = this.state.peek(offset);
      return token != null && (token.type === value || token.value === value);
    });
  }

  matchSequence (...values) {
    if (!this.checkSequence(...values)) return null;
    return values.map(() => this.state.next());
  }

  expectSequence (...values) {
    const result = this.matchSequence(...values);
    if (result == null) throw new SyntaxError(`[Parser] Expected sequence [${values.join(', ')}] at position ${this.state.index}.`);
    return result;
  }

  // :::::: State-Like Interface (so `this` can be passed directly into @cosmonaut/blocks combinators)

  save    ()           { return this.state.save(); }
  restore (position)   { this.state.restore(position); }
  peek    (offset = 0) { return this.state.peek(offset); }
  next    ()           { return this.state.next(); }
  eof     ()           { return this.state.isEOF(); }

  // :::::: Dispatch

  dispatch (table) {
    for (const [key, methodName] of Object.entries(table)) {
      if (this.check(key)) {
        const result = this.parse(methodName);
        return { or: () => result };
      }
    }
    return { or: fallbackName => this.parse(fallbackName) };
  }

  // :::::: Run

  run () {
    return this.parse(this.options.entry);
  }

  // :::::: Method Registration

  addMethod (key, fn) {
    this._registerMethods({ [key]: fn });
    return this;
  }

  // :::::: internal

  _buildParse () {
    const self = this;

    function parse (name, ...args) {
      const method = self._methods[name];
      if (!method) throw new Error(`[Parser] No parsing method registered for "${name}".`);
      return method(self, ...args);
    }

    this.parse = parse;
  }

  _registerMethods (methods = {}) {
    for (const [key, fn] of Object.entries(methods)) {
      if (typeof fn !== 'function') continue;

      const name      = normalizeMethodName(key);
      const parseName = 'parse' + name;

      if (RESERVED_CORE_NAMES.has(parseName) || RESERVED_CORE_NAMES.has(name)) {
        throw new Error(
          `[Parser] Cannot register a method for rule "${name}": "${parseName}" collides with a ` +
          `reserved core Parser property. Rename the rule or the registration key.`
        );
      }

      const bound = (...args) => fn(this, ...args);

      this._methods[name]  = fn;
      this[name]            = bound; // p.MethodName()
      this['parse' + name]  = bound; // p.parseMethodName()
      this.parse[name]      = bound; // p.parse['MethodName'](), p.parse.MethodName()
    }
  }

}
