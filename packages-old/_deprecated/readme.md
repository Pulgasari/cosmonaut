# @cosmonaut

### Core Skeletons

1. [lexer](/packages/lexer) (tokenizer) - convert code to tokens
2. [parser](/packages/parser) - convert tokens to AST
3. [transformer](/packages/transformer) - pre-process AST
4. [generator](/packages/generator) - convert AST to final code

### Utility Blocks

Useful utility blocks for building compiler.

- [combinators](/packages/combinators) = composable methods to build parsing methods
- [presets](/packages/presets) = presets for commons and languages
- [utils](/packages/utils) = these are re-exported in every core-package as well
