// @cosmonaut/lsd

import { splitSections }      from './sections.js';
import { parseMeta }          from './meta.js';
import { parseTokens }        from './tokens.js';
import { parseHighlighting }  from './highlighting.js';
import { parseGrammar }       from './grammar.js';

import {
  compileTokenizer,
  compileParserMethods,
  compileGeneratorMethods,
  compileHighlighting,
} from './compile.js';

// Parses raw LSD source into an intermediate representation. This part
// works end-to-end for META/TKN/HL; the `grammar` field is partially
// structured only (see grammar.js).
export function parseLSD (source) {
  const sections = splitSections(source);

  return {
    meta:          parseMeta(sections.META),
    tokens:        parseTokens(sections.TKN),
    highlighting:  parseHighlighting(sections.HL),
    grammar: parseGrammar({ ruleLines: sections.RULE, blocks: sections.BLOCKS }),
  };
}

// Not implemented end-to-end yet - see compile.js for the per-artifact
// plan. Exposed already so the intended public shape is visible.
export function compileLSD (source) {
  const lsd = parseLSD(source);

  return {
    lexer:         compileTokenizer(lsd),
    parserMethods: compileParserMethods(lsd),
    genMethods:    compileGeneratorMethods(lsd),
    highlighting:  compileHighlighting(lsd),
  };
}

export { parseMeta, parseTokens, parseHighlighting, parseGrammar };
