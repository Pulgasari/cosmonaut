// @cosmonaut/lsd/grammar.js
//
// Parses:
//   (a) top-level "RULE :: Name == Expr" productions
//   (b) "#### Name" blocks: a "META :: <BlockName>", an optional
//       "NODE == { fields }" (also accepts the legacy spelling "TYPE"),
//       one or more "RULE == pattern [=> mapping]" alternatives, and a
//       "CODE == `template`" for codegen.
//
// Field naming inside a block's alternatives supports three styles, and
// any mix of them - see bindings.js for the unifying resolver:
//
//   (1) positional + NODE:      RULE == ... Block => 2 3 4
//                                 NODE == { identifier, args, body }
//   (2) inline pattern labels:  RULE == ... Block:body
//   (3) named mapping:          RULE == ... Block => identifier:2 args:3 body:4
//
// KNOWN LIMITATION: parsePatternFactors() (see bindings.js) currently
// splits a pattern on whitespace only - it does NOT understand grouping
// ("(...)"), choice ("|"), or quantifiers attached to a GROUP (only to a
// single preceding factor). Patterns containing a top-level group, e.g.
//
//   IDENTIFIER ( ParenCallArgs | SingleBareArg )
//
// get mis-numbered as 6 separate factors instead of the intended 2
// ("IDENTIFIER" and the whole group as one unit) - so any mapping/NODE
// referencing positions beyond the first factor will resolve INCORRECTLY
// for such patterns, WITHOUT raising an error (the resolver only checks
// that enough positions exist, not what they actually mean). Confirmed
// with poo.lsd's own FunctionCall/ExpressionArgumentsList/
// NamedArgumentsList blocks - all three currently pass validation while
// resolving the wrong raw position. This needs the same expression
// parser flagged as a TODO since this file's very first version
// (literal/nonterminal/sequence/choice/optional/repeat/group - the same
// shape used by @cosmonaut/ebnf's internal AST). Until that exists,
// patterns with a top-level "(...)" group should either avoid relying on
// positions past the group, or use inline labels placed on individual
// factors BEFORE the group only.

import {
  parsePatternFactors,
  parseMappingTokens,
  resolveBindings,
  checkBlockConsistency,
} from './bindings.js';

export function parseGrammar ({ ruleLines, blocks }) {
  const productions    = ruleLines.map(parseTopLevelRule);
  const compiledBlocks = blocks.map(parseBlock);
  return { productions, blocks: compiledBlocks };
}

function parseTopLevelRule (line) {
  const match = line.match(/^RULE\s*::\s*(\S+)\s*==\s*(.+)$/);
  if (!match) throw new Error(`[lsd] Malformed top-level RULE line: "${line}"`);
  const [, name, exprText] = match;

  return {
    name,
    exprText: exprText.trim(), // TODO: parse into the shared literal/nonterminal/
                                //       sequence/choice/optional/repeat/group AST
                                //       once the concrete syntax is finalized.
  };
}

function parseBlock ({ fullName, name, lines }) {
  const text = lines.join('\n');

  // NODE is the current spelling; TYPE is accepted as a legacy alias.
  const nodeMatch  = text.match(/^(?:NODE|TYPE)\s*==\s*\{([^}]*)\}/m);
  const nodeFields = nodeMatch
    ? nodeMatch[1].split(',').map(s => s.trim()).filter(Boolean).map(f => f.split(':')[0].trim())
    : null;

  const ruleLineMatches = [...text.matchAll(/^RULE\s*==\s*(.+)$/gm)];

  const alternatives = ruleLineMatches.map(([, fullText], i) => {
    const [patternText, mappingText] = splitPatternAndMapping(fullText);
    const patternFactors = parsePatternFactors(patternText);
    const mappingTokens  = mappingText ? parseMappingTokens(mappingText) : [];

    let bindings;
    try {
      bindings = resolveBindings({ patternFactors, mappingTokens, nodeFields });
    } catch (err) {
      throw new Error(
        `[lsd] In block "${name}"${fullName ? ` (${fullName})` : ''}, alternative ${i + 1}: ${err.message}`
      );
    }

    return { patternText, mappingText, patternFactors, mappingTokens, bindings };
  });

  if (alternatives.length > 0) {
    checkBlockConsistency(name, alternatives.map(a => a.bindings), nodeFields);
  }

  const codeMatch    = text.match(/^CODE\s*==\s*`([\s\S]*?)`\s*$/m);
  const codeTemplate = codeMatch?.[1] ?? null;

  return { fullName, name, nodeFields, alternatives, codeTemplate };
}

// Splits a "RULE == pattern [=> mapping]" line's right-hand side into its
// pattern and (optional - inline-label-only alternatives have none)
// mapping parts, respecting backtick-quoted literals so a "=>" occurring
// inside one (not expected in this grammar today, but cheap to guard) is
// never mistaken for the pattern/mapping separator.
function splitPatternAndMapping (fullText) {
  let inBacktick = false;

  for (let i = 0; i < fullText.length - 1; i++) {
    const ch = fullText[i];
    if (ch === '`') inBacktick = !inBacktick;
    if (!inBacktick && ch === '=' && fullText[i + 1] === '>') {
      return [fullText.slice(0, i).trim(), fullText.slice(i + 2).trim()];
    }
  }

  return [fullText.trim(), null];
}
