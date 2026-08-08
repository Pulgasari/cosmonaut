// @cosmonaut/cosmonaut/Compiler.js

// The allrounder: one object, one options tree, one import.
// Owns a configured instance of each stage 
// and wires them into a pipeline, 
// while leaving every stage individually callable.

// [Lexer]     source -> tokenize -> tokens
// [Parser]    tokens -> parse    -> AST
// [Generator] AST    -> generate -> string

import Lexer     from './stages/Lexer.js';
import Parser    from './stages/Parser.js';
import Generator from './stages/Generator.js';

const defaultConfig = {
  lexer     : {},
  parser    : {},
  generator : {},
  layout    : {},
};

export default class Cosmonaut {

  constructor (config = {}) {
    this.config = { ...defaultConfig, ...config };

    this.lexer     = new Lexer('', this.config.lexer);
    this.parser    = new Parser(this.config.parser);
    this.generator = new Generator({
      ...this.config.generator,
      printOptions: { 
        ...this.config.layout, 
        ...this.config.generator.printOptions 
      },
    });
  }

  // :::::: Stages (via the Machines)

  tokenize (source) {
    this.lexer.setSource(source);
    return this.lexer.tokenize();
  }

  parse (source) {
    const tokenized = this.tokenize(source);
    const parsed    = this.parser.run(tokenized);
    return parsed;
  }

  generate (node, printOptions) {
    return this.generator.run(node, printOptions);
  }

  // :::::: Pipeline

  compile (source) {
    const parsed    = this.parse(source);
    const generated = this.generate(parsed);
    
    return generated;
  }

}
