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
    meta         : parseMeta         (sections.META),
    tokens       : parseTokens       (sections.TKN),
    highlighting : parseHighlighting (sections.HL),
    grammar      : parseGrammar({ ruleLines: sections.RULE, blocks: sections.BLOCKS }),
  };
}

// Parses + compiles in one step: 
//   createLexer(sourceText) -> a ready @cosmonaut/lexer Lexer instance
//   methods                 -> ready for `new Parser(tokens, { methods })`
//   highlighting            -> the parsed HL section, as-is
export function compileLSD (source, options = {}) {
  const lsd = parseLSD(source);

  return {
    createLexer  : compileTokenizer     (lsd, options.tokenizer),
    methods      : compileParserMethods (lsd),
    highlighting : compileHighlighting  (lsd),
  };
}

// :::::: RE-EXPORTS

export * from './bindings.js';
export * from './compile.js';
export * from './expression.js';
export * from './grammar.js';
export * from './highlighting.js';
export * from './highlightjs.js';
export * from './meta.js';
export * from './resolve.js';
export * from './sections.js';
export * from './tokens.js';

/*
export { parseGrammar, parseHighlighting, parseMeta, splitSections, parseTokens };
export { compileTokenizer, compileParserMethods, compileHighlighting } from './compile.js';
export { getMetaPropsFromLSD, createHighlightJsObjectFromLSD, extractLiteralPrefix } from './highlightjs.js';
export { buildTypeRegistry, resolveField, resolvePath, interpolateTemplate, makeGenerator } from './resolve.js';
export { checkBlockConsistency, parseMappingTokens, parsePatternFactors, resolveBindings } from './bindings.js';
export { compileExpr, numberTopLevelFactors, parsePattern } from './expression.js';
*/




