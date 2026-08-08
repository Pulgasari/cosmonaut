// @cosmonaut/compiler

// The compiler toolkit. Everything a language implementation needs, in one
// package: the three stages, the machine they share, the streams they read,
// and the reusable grammar/codegen patterns.

// :::::: Main Export

export { default }              from './Compiler.js';
export { default as Cosmonaut } from './Compiler.js';

// :::::: Stages

export { default as Lexer }     from './stages/Lexer.js';
export { default as Parser }    from './stages/Parser.js';
export { default as Generator } from './stages/Generator.js';

// :::::: Machine + Streams

export { default as CharStream }  from './streams/CharStream.js';
export { default as Machine }     from './machine/Machine.js';
export { default as TokenStream } from './streams/TokenStream.js';

// :::::: Toolkit Re-Exports

export * as grammar  from './grammar/index.js';
export * as presets  from './presets/index.js';

export * as layouter from '@cosmonaut/layouter';
export * as parsers  from '@cosmonaut/parsers';

// :::::: Utils

export * from './rules/index.js';
export * from './utils/index.js';
