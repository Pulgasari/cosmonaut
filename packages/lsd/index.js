// @cosmonaut/lsd

import { splitSections }      from './sections.js';
import { parseMeta }          from './meta.js';
import { parseTokens }        from './tokens.js';
import { parseHighlighting }  from './highlighting.js';
import { parseGrammar }       from './grammar.js';
import { compileTokenizer, compileParserMethods, compileHighlighting } from './compile.js';

// Parses raw LSD source into an intermediate representation. Works
// end-to-end for META/TKN/RULE/HL, including full pattern parsing
// ("(...)" grouping/choice, quantifiers, "[...]" lists) - see
// expression.js. Codegen (AST -> target language) is deliberately NOT
// part of this - see compile.js's file header for why.
export function parseLSD (source) {
  const sections = splitSections(source);

  return {
    meta:          parseMeta(sections.META),
    tokens:        parseTokens(sections.TKN),
    highlighting:  parseHighlighting(sections.HL),
    grammar:       parseGrammar({ ruleLines: sections.RULE, blocks: sections.BLOCKS }),
  };
}

// Parses + compiles in one step: source text -> { createLexer, methods, highlighting }.
//   createLexer(sourceText) -> a ready @cosmonaut/lexer Lexer instance
//   methods                  -> ready for `new Parser(tokens, { methods })`
//   highlighting              -> the parsed HL section, as-is
export function compileLSD (source, options = {}) {
  const lsd = parseLSD(source);

  return {
    createLexer:   compileTokenizer(lsd, options.tokenizer),
    methods:       compileParserMethods(lsd),
    highlighting:  compileHighlighting(lsd),
  };
}

export { parseMeta, parseTokens, parseHighlighting, parseGrammar, splitSections };
export { compileTokenizer, compileParserMethods, compileHighlighting } from './compile.js';
export { getMetaPropsFromLSD, createHighlightJsObjectFromLSD, extractLiteralPrefix } from './highlightjs.js';
export { buildTypeRegistry, resolveField, resolvePath, interpolateTemplate, makeGenerator } from './resolve.js';
export { parsePatternFactors, parseMappingTokens, resolveBindings, checkBlockConsistency } from './bindings.js';
export { parsePattern, numberTopLevelFactors, compileExpr } from './expression.js';
