// @cosmonaut/combinators

// :::::: IMPORTS

import { isFn } from '@cosmonaut/utils/internals';
import { ThenBuilder } from './then-builder.js';

// :::::: MAIN EXPORT

export class Combinator {

  constructor (parseFn, options = {}) {
    if (!isFn(parseFn)) throw new TypeError('[Combinator] parseFn must be a function.');
    
    this.parseFn = parseFn;
    this.name    = options.name ?? null;
  }

  // ::: Core
  
  parse (parser) {
    return this.parseFn(parser);
  }

  run (parser) {
    return this.parse(parser);
  }

  // ::: Fluent
  
  get then () {
    return new ThenBuilder(this);
  }
 
  // ::: Meta
  
  named (name) {
    return new Combinator (p => this.parse(p), { name });
  }

  debug (logger = console.log) {
    return new Combinator (p => {
      logger(`[Combinator${this.name ? `:${this.name}` : ''}]`, p.peek?.());
      return this.parse(p);
    }, {
      name: this.name
    });
  }

  // Higher-Order Combinators (implemented lazily to avoid circular imports)
  
  many () {
    const { many } = awaitImport('./builders.js');
    return many(this);
  }

  many1 () {
    const { many1 } = awaitImport('./builders.js');
    return many1(this);
  }

  map (fn) {
    const { map } = awaitImport('./builders.js');
    return map(this, fn);
  }

  optional () {
    const { optional } = awaitImport('./builders.js');
    return optional(this);
  }

  repeat (count) {
    const { repeat } = awaitImport('./builders.js');
    return repeat(this, count);
  }

  separated (separator) {
    const { separated } = awaitImport('./builders.js');
    return separated(this, separator);
  }

  until (stop) {
    const { until } = awaitImport('./builders.js');
    return until(stop, this);
  }

  while (test) {
    const { while: whileComb } = awaitImport('./builders.js');
    return whileComb(test, this);
  }

  wrapped (open, close) {
    const { wrapped } = awaitImport('./builders.js');
    return wrapped(open, this, close);
  }

}
