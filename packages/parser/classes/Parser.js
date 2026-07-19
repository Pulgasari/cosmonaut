// @cosmonaut/parser/classes/Parser.js

import ParserState            from './ParserState.js';
import * as blocks            from './../blocks/index.js';
import parseBinaryExprMethod  from './../methods/parseBinaryExpr.js';
import parseListPatternMethod from './../methods/parseListPattern.js';
import parsePatternMethod     from './../methods/parsePattern.js';
import parseUnaryExprMethod   from './../methods/parseUnaryExpr.js';
import { isTitleCase }        from '@cosmonaut/utils/internals';

// :::::: Helpers

function normalizeMethodName (key) {
  if (key.startsWith('parse') && key.length > 5 && isTitleCase(key.slice(5))) return key.slice(5);
  if (isTitleCase(key)) return key;
  throw new Error(`[Parser] Invalid method name "${key}" (expected "parseMethodName" or "MethodName").`);
}

const defaultOptions = {
  methods : {},
  entry   : 'Program',
};

export default class Parser {

  // :::::: init

  constructor (tokens = [], options = {}) {
    this.options = { ...defaultOptions, ...options };
    this.state   = new ParserState(tokens);
    this.$       = blocks;

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

  // :::::: Higher-Level Parsing Methods

  parsePattern (pattern, strategies, capture) {
    return parsePatternMethod(this, pattern, strategies, capture);
  }

  parseListPattern (element, config) {
    return parseListPatternMethod(this, element, config);
  }

  parseBinaryExpr (config, minPrecedence = 0) {
    return parseBinaryExprMethod(this, config, minPrecedence);
  }

  parseUnaryExpr (config) {
    return parseUnaryExprMethod(this, config);
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

      const name  = normalizeMethodName(key);
      const bound = (...args) => fn(this, ...args);

      this._methods[name]  = fn;
      this[name]            = bound; // p.MethodName()
      this['parse' + name]  = bound; // p.parseMethodName()
      this.parse[name]      = bound; // p.parse['MethodName'](), p.parse.MethodName()
    }
  }

}
