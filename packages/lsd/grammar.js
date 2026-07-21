// @cosmonaut/lsd/grammar.js

// WIP. Parses:
//   (a) top-level "RULE == Name == Expr" productions
//   (b) "#### Name" blocks: META <BlockName>, TYPE == {...}, one or more
//       RULE == Pattern => Mapping alternatives, and a CODE template.
//
// The expression algebra used inside RULE patterns (literal, nonterminal,
// sequence, choice, optional, repeat, group) is the SAME shape already
// used by @cosmonaut/ebnf's internal AST - only the concrete syntax
// differs (backtick literals + postfix ?/* here, vs quoted literals +
// [...]/{...} there). Once the concrete LSD grammar syntax is settled,
// this file should scan/parse into that same node shape so the existing
// compileExpr() logic in @cosmonaut/ebnf/compile.js can be reused
// (or factored out into a shared internal module both packages depend
// on) rather than reimplemented here.
//
// OPEN QUESTIONS (intentionally not guessed at):
//   1. Do top-level "RULE == Name == Expr" productions and "#### Name"
//      blocks live in the same rule namespace, or are top-level RULEs
//      purely structural (used *inside* patterns, e.g. "IdentList" used
//      inside "FnParams") while #### blocks are the only ones that
//      produce actual typed AST nodes?
//   2. The "=> mapping" list mixes numeric capture indices (positional,
//      1-based, matching factors in the pattern) with bare identifiers
//      used as literal tag values (e.g. "=> 2 Record"). Needs a firm
//      rule for telling the two apart (numeric literal vs. anything
//      matching /^[A-Z]/ as a tag, most likely) plus a rule for what
//      happens when the mapping list is shorter than the TYPE fields.
//   3. CODE templates support at least two placeholder forms:
//        ${field}              -> a single field's generated Doc
//        ${field, "separator"} -> a list field, joined with a separator
//      Both map directly onto @cosmonaut/generator (a field reference
//      -> generator.genNode(node[field]), a joined list -> genList /
//      joinMap). Needs deciding whether CODE templates support anything
//      beyond straight field interpolation (conditionals? nested
//      literal text with escapes, as seen in "${name} :\=${value};\n" -
//      note the "\=" - is that an escaped "=" or a distinct operator
//      token in the target language's own syntax?).

export function parseGrammar ({ ruleLines, blockSections }) {
  const productions = ruleLines.map(parseTopLevelRule);
  const blocks       = blockSections.map(parseBlock);
  return { productions, blocks };
}

function parseTopLevelRule (line) {
  const match = line.match(/^RULE\s*==\s*(\S+)\s*==\s*(.+)$/);
  if (!match) throw new Error(`[lsd] Malformed top-level RULE line: "${line}"`);
  const [, name, exprText] = match;

  return {
    name,
    exprText: exprText.trim(), // TODO: parse into the shared literal/nonterminal/
                                //       sequence/choice/optional/repeat/group AST
                                //       once the concrete syntax (backticks, `?`, `*`)
                                //       is finalized - see file header.
  };
}

function parseBlock ({ header, lines }) {
  const text = lines.join('\n');

  const name     = header.trim();
  const metaName = (text.match(/^META\s+(\S+)/m) ?? [])[1];
  const typeText = (text.match(/^TYPE\s*==\s*\{([^}]*)\}/m) ?? [])[1];

  const typeFields = (typeText ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(field => field.split(':').map(s => s.trim())[0]); // "name" or "name: Type" -> "name"

  const alternatives = [...text.matchAll(/^RULE\s*==\s*(.+?)\s*=>\s*(.+)$/gm)]
    .map(([, patternText, mappingText]) => ({
      patternText: patternText.trim(), // TODO: same expression parser as parseTopLevelRule
      mapping: mappingText.trim().split(/\s+/), // strings for now - numeric vs. tag
                                                  // disambiguation is open question #2
    }));

  const codeMatch = text.match(/^CODE\s*==\s*`([\s\S]*?)`\s*$/m);
  const codeTemplate = codeMatch?.[1] ?? null; // TODO: parse ${field} / ${field, "sep"}
                                                //       placeholders - open question #3

  return { name, metaName, typeFields, alternatives, codeTemplate };
}
