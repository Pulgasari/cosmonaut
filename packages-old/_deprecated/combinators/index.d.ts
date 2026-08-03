/**
 * @cosmonaut/combinators
 * TypeScript type definitions for the functional parser-combinator DSL toolkit.
 */

/**
 * The parser context provided by @cosmonaut/parser or any compatible parser engine.
 * Maintains state such as current index, failure flags, and navigation methods.
 */
export interface ParserContext {
  index: number;
  failed: boolean;
  consume(value: any): any;
  match(pattern: RegExp | string): any;
  check(pattern: RegExp | string): boolean;
  peek(): any;
  next(): any;
  parse(ruleName: string, ...args: any[]): any;
  [ruleName: string]: any; // Allows dynamic method dispatch for user-defined grammar rules
}

/**
 * A decorated parser function (Combinator).
 * At its core, a combinator is a function taking a ParserContext
 * and returning either the parsed value or null/undefined on backtrack.
 */
export interface Combinator<T = any> {
  (ctx: ParserContext): T | null;

  // Optional metadata
  displayName?: string;

  // Fluent API modifiers (method chaining directly on the combinator function object)
  many(): Combinator<T[]>;
  many1(): Combinator<T[]>;
  optional(): Combinator<T | null>;
  repeat(n: number): Combinator<T[]>;
  map<R>(fn: (val: T, ctx: ParserContext) => R): Combinator<R>;
  capture(name: string): Combinator<Record<string, T>>;
  node(type: string): Combinator<any>;
}

/**
 * A lazy-referenced grammar rule.
 * Acts as a standard Combinator but is callable like a builder function 
 * when arguments (such as operator precedence levels) need to be passed down.
 * * @example
 * Expression
 * Expression(4)
 */
export interface LazyRule<T = any> extends Combinator<T> {
  (...args: any[]): Combinator<T>;
}

/**
 * The magic `rule` proxy.
 * Provides dynamic property-level access to any grammar rule by name.
 * Ideal for object destructuring at the top of your grammar file.
 * * @example
 * const { Expression, Block, Statement } = rule;
 */
export interface RuleProxy {
  readonly [ruleName: string]: LazyRule<any>;
}

/**
 * The magic `parse` proxy.
 * Can be invoked directly as a dynamic fallback or accessed as a property proxy.
 * * @example
 * parse('Expression')
 * parse('Expression', 4)
 * parse.Expression
 * parse.Expression(4)
 * parse['Expression'](4)
 */
export interface ParseProxy {
  (ruleName: string, ...args: any[]): Combinator<any>;
  readonly [ruleName: string]: LazyRule<any>;
}

// ==========================================
// Magic Proxy Exports
// ==========================================

export const rule: RuleProxy;
export const parse: ParseProxy;

// ==========================================
// Primitives
// ==========================================

export function consume(value: any): Combinator<any>;
export function match(pattern: RegExp | string): Combinator<string>;
export function check(pattern: RegExp | string): Combinator<string>;
export function call<T = any>(fn: (ctx: ParserContext) => T): Combinator<T>;
export function custom<T = any>(fn: (ctx: ParserContext) => T): Combinator<T>;

// ==========================================
// Flow Control (Combinators)
// ==========================================

export function seq(...combinators: Combinator<any>[]): Combinator<any[]>;
export function choice(...combinators: Combinator<any>[]): Combinator<any>;
export function optional<T>(combinator: Combinator<T>): Combinator<T | null>;
export function repeat<T>(combinator: Combinator<T>, n: number): Combinator<T[]>;
export function many<T>(combinator: Combinator<T>): Combinator<T[]>;
export function many1<T>(combinator: Combinator<T>): Combinator<T[]>;

// In TS, 'while' and 'until' are reserved. We declare them as constants and export them with aliases.
declare const whileLoop: (cond: ((ctx: ParserContext) => boolean) | Combinator<any>) => Combinator<any[]>;
declare const untilLoop: (cond: ((ctx: ParserContext) => boolean) | Combinator<any>) => Combinator<any[]>;

export { whileLoop as while, untilLoop as until };

export function not(combinator: Combinator<any>): Combinator<boolean>;
export function lookahead<T>(combinator: Combinator<T>): Combinator<T | null>;
export function peek<T>(combinator: Combinator<T>): Combinator<T | null>;

// ==========================================
// Parser Helpers
// ==========================================

export function wrapped<O, I, C>(
  open: Combinator<O>,
  inner: Combinator<I>,
  close: Combinator<C>
): Combinator<I>;

export function separated<I, S>(
  inner: Combinator<I>,
  separator: Combinator<S>
): Combinator<I[]>;

// ==========================================
// Transformations
// ==========================================

export function map<T, R>(combinator: Combinator<T>, fn: (val: T, ctx: ParserContext) => R): Combinator<R>;
export function capture<T>(combinator: Combinator<T>, name: string): Combinator<Record<string, T>>;
export function node<T>(combinator: Combinator<T>, type: string): Combinator<any>;

// ==========================================
// Utilities
// ==========================================

export function lazy<T>(fn: () => Combinator<T>): Combinator<T>;
export function memo<T>(combinator: Combinator<T>): Combinator<T>;
export function named<T>(combinator: Combinator<T>, name: string): Combinator<T>;
export function debug<T>(combinator: Combinator<T>, message?: string): Combinator<T>;
