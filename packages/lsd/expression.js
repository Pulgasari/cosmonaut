// @cosmonaut/lsd/expression.js

// Closes the "TODO: parse into the shared literal/nonterminal/sequence/
// choice/optional/repeat/group AST" gap flagged since grammar.js's very
// first version. A RULE pattern is now parsed into a real tree instead
// of being whitespace-split, so "(...)" grouping and "|" choice are
// understood correctly - fixing the FunctionCall/ExpressionArgumentsList/
// NamedArgumentsList false-positive from before (where
// "IDENTIFIER ( ParenCallArgs | SingleBareArg )" was silently mis-split
// into 6 factors instead of the intended 2).
//
// Node shapes (same family as @cosmonaut/ebnf's internal AST, plus the
// "list" shape from bindings.js's "[...]" support):
//
//   { type: 'literal',    value }
//   { type: 'reference',  name }
//   { type: 'sequence',   factors: [...] }
//   { type: 'choice',     alternatives: [...] }   -- ORDERED (PEG-style):
//                                                     first match wins,
//                                                     same as @cosmonaut/
//                                                     parser/blocks' own
//                                                     choice() combinator
//   { type: 'optional',   expr }
//   { type: 'repeat',     expr, atLeastOne }        -- covers both * and +
//   { type: 'group',      expr }
//   { type: 'list',       item, separator, atLeastOne, separatorOptional }
//
// Any node may additionally carry `.inlineLabel` (from a trailing
// ":name") and, for a TOP-LEVEL factor only, `.index` (1-based position,
// for bindings.js's mapping system).
//
// SCOPE NOTE: inside "[...]", item/separator are still restricted to a
// bare literal or reference (not a full sub-expression) - matches every
// current use in poo.lsd and keeps list-compilation simple. Widen later
// if a real need for a grouped/quantified list item ever comes up.

// :::::: Tokenizer

function tokenizePattern (text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (ch === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== '`') j++;
      if (j >= text.length) throw new Error(`[lsd] Unterminated literal in pattern: "${text}"`);
      tokens.push({ type: 'LITERAL', value: text.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    if (ch === '[') { tokens.push({ type: '[' }); i++; continue; }
    if (ch === ']') { tokens.push({ type: ']' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: ')' }); i++; continue; }
    if (ch === '|') { tokens.push({ type: '|' }); i++; continue; }
    if (ch === '?') { tokens.push({ type: '?' }); i++; continue; }
    if (ch === '*') { tokens.push({ type: '*' }); i++; continue; }
    if (ch === '+') { tokens.push({ type: '+' }); i++; continue; }
    if (ch === ':') { tokens.push({ type: ':' }); i++; continue; }

    if (/[A-Za-z0-9_$-]/.test(ch)) {
      let j = i;
      while (j < text.length && /[A-Za-z0-9_$-]/.test(text[j])) j++;
      tokens.push({ type: 'WORD', value: text.slice(i, j) });
      i = j;
      continue;
    }

    throw new Error(`[lsd] Unexpected character "${ch}" in pattern "${text}" at position ${i}.`);
  }

  tokens.push({ type: 'EOF' });
  return tokens;
}

// :::::: Recursive-descent parser

export function parsePattern (text) {
  const tokens = tokenizePattern(text);
  let pos = 0;

  const peek    = () => tokens[pos];
  const next    = () => tokens[pos++];
  const at      = type => peek().type === type;
  const expect  = type => {
    if (!at(type)) throw new Error(`[lsd] Expected "${type}" but got "${peek().type}" in pattern "${text}".`);
    return next();
  };

  function parseChoice (terminators) {
    const alternatives = [parseSequence(['|', ...terminators])];
    while (at('|')) {
      next();
      alternatives.push(parseSequence(['|', ...terminators]));
    }
    return alternatives.length === 1 ? alternatives[0] : { type: 'choice', alternatives };
  }

  function parseSequence (terminators) {
    const factors = [];
    while (!terminators.includes(peek().type)) factors.push(parseFactor());
    if (factors.length === 0) throw new Error(`[lsd] Empty sequence in pattern "${text}".`);
    return factors.length === 1 ? factors[0] : { type: 'sequence', factors };
  }

  function parseFactor () {
    let node = parsePrimary();

    if (at('?')) { next(); node = { type: 'optional', expr: node }; }
    else if (at('*')) { next(); node = { type: 'repeat', expr: node, atLeastOne: false }; }
    else if (at('+')) { next(); node = { type: 'repeat', expr: node, atLeastOne: true }; }

    if (at(':')) {
      next();
      const { value: name } = expect('WORD');
      node = { ...node, inlineLabel: name };
    }

    return node;
  }

  function parsePrimary () {
    if (at('LITERAL')) { const t = next(); return { type: 'literal', value: t.value }; }
    if (at('WORD'))    { const t = next(); return { type: 'reference', name: t.value }; }

    if (at('(')) {
      next();
      const inner = parseChoice([')']);
      expect(')');
      return { type: 'group', expr: inner };
    }

    if (at('[')) {
      next();
      const node = parseListBody();
      expect(']');
      return node;
    }

    throw new Error(`[lsd] Unexpected token "${peek().type}" in pattern "${text}".`);
  }

  function parseListBody () {
    const item = parseSimplePrimary();
    let atLeastOne = false;
    if (at('+')) { next(); atLeastOne = true; }

    let separator         = null;
    let separatorOptional = false;
    if (!at(']')) {
      separator = parseSimplePrimary();
      if (at('?')) { next(); separatorOptional = true; }
    }

    return { type: 'list', item, separator, atLeastOne, separatorOptional };
  }

  // Item/separator inside "[...]" are restricted to a bare literal or
  // reference - see the SCOPE NOTE in the file header.
  function parseSimplePrimary () {
    if (at('LITERAL')) { const t = next(); return { type: 'literal', value: t.value }; }
    if (at('WORD'))    { const t = next(); return { type: 'reference', name: t.value }; }
    throw new Error(`[lsd] Expected a literal or reference inside "[...]" in pattern "${text}".`);
  }

  const result = parseChoice(['EOF']);
  expect('EOF');
  return result;
}

// Numbers a pattern's TOP-LEVEL factors (1-based `.index`), for
// bindings.js's positional mapping system. A top-level "|" (only
// meaningful for a top-level "RULE :: Name == A | B | C" production, not
// inside a block's own "RULE == pattern => mapping" line) has no fixed
// factor count to number against a mapping, so it's rejected here with a
// clear message pointing at the supported alternative.
export function numberTopLevelFactors (patternText) {
  const node = parsePattern(patternText);

  if (node.type === 'choice') {
    throw new Error(
      `[lsd] Top-level "|" is not supported within a single block RULE == line ` +
      `("${patternText}") - write each alternative as its own separate RULE == line instead.`
    );
  }

  const factors = node.type === 'sequence' ? node.factors : [node];
  return factors.map((factor, i) => ({ ...factor, index: i + 1 }));
}

// :::::: AST -> @cosmonaut/parser/blocks compiler
//
// `registry` is the same { tokenTypeNames, nodeTypeNames } shape built by
// resolve.js's buildTypeRegistry() - needed here too, since a bare
// `reference` node is ambiguous without it: "IDENTIFIER" should compile
// to "match a token of this type" while "Block" should compile to
// "recursively parse this rule".

export function compileExpr (node, registry, blocks) {
  switch (node.type) {
    case 'literal':
      return blocks.token(node.value);

    case 'reference': {
      const { name } = node;
      if (registry.tokenTypeNames.has(name)) return blocks.token(name);
      return blocks.lazy(() => state => state.parse(name));
    }

    case 'sequence':
      return blocks.seq(...node.factors.map(f => compileExpr(f, registry, blocks)));

    case 'choice':
      return blocks.choice(...node.alternatives.map(a => compileExpr(a, registry, blocks)));

    case 'optional':
      return blocks.optional(compileExpr(node.expr, registry, blocks));

    case 'repeat':
      return node.atLeastOne
        ? blocks.many1(compileExpr(node.expr, registry, blocks))
        : blocks.many(compileExpr(node.expr, registry, blocks));

    case 'group':
      return compileExpr(node.expr, registry, blocks);

    case 'list': {
      const itemParser = compileExpr(node.item, registry, blocks);

      if (!node.separator) {
        return node.atLeastOne ? blocks.many1(itemParser) : blocks.many(itemParser);
      }

      const sepParser = compileExpr(node.separator, registry, blocks);

      if (node.separatorOptional) {
        return node.atLeastOne ? blocks.sepBy1Loose(itemParser, sepParser) : blocks.sepByLoose(itemParser, sepParser);
      }

      return node.atLeastOne ? blocks.sepBy1(itemParser, sepParser) : blocks.sepBy(itemParser, sepParser);
    }

    default:
      throw new Error(`[lsd] Unknown expression node type "${node.type}".`);
  }
}
