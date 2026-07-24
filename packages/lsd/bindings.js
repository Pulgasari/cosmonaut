// @cosmonaut/lsd/bindings.js

// Unifies three ways of naming a RULE alternative's captured factors into
// one resolver, so all of these are valid and produce IDENTICAL results:
//
//   (A) positional, named externally via NODE:
//       RULE == `fn` IDENTIFIER FnParams Block => 2 3 4
//       NODE == { identifier, args, body }
//
//   (B) named inline, directly on the pattern factor:
//       RULE == `fn` IDENTIFIER:identifier FnParams:args Block:body
//
//   (C) named in the mapping itself:
//       RULE == `fn` IDENTIFIER FnParams Block => identifier:2 args:3 body:4
//
// ...and any MIX of the above within a single alternative, e.g. naming
// one field inline/explicitly and leaving the rest positional against
// NODE's remaining (not-yet-claimed) fields.
//
// A "constant" binding (a value with no corresponding pattern factor,
// e.g. ArrayLikeLiteral's "kind" tag) works the same way: either named
// explicitly ("kind:`Record`") or bare ("`Record`"), positionally
// claiming the next unclaimed NODE field.
//
// :::::: List factors - "[...]"
//
// A "[...]" factor always counts as exactly ONE position, no matter how
// many raw tokens it takes to match - this is precisely what fixes the
// earlier ambiguity of "NamedPropDecl ( `,`? NamedPropDecl )*" looking
// like it might be 1 or 2 positions. Six shapes are recognized inside
// the brackets, corresponding 1:1 to the sepBy-family combinators in
// @cosmonaut/parser/blocks/repeat.js:
//
//   [ Item  ]        -> many0(Item)                     (many, in repeat.js)
//   [ Item+ ]        -> many1(Item)
//   [ Item  Sep  ]   -> sepBy(Item, Sep)
//   [ Item+ Sep  ]   -> sepBy1(Item, Sep)
//   [ Item  Sep? ]   -> sepByLoose(Item, Sep)            (poo's actual case)
//   [ Item+ Sep? ]   -> sepBy1Loose(Item, Sep)
//
// sepEndBy/sepEndBy1 ("trailing separator allowed") aren't a distinct
// bracket shape - they're written as a list followed by a separate,
// ordinary trailing-optional factor right after the closing bracket:
//
//   [ Item Sep ] Sep?    -> sepEndBy(Item, Sep)
//   [ Item+ Sep ] Sep?   -> sepEndBy1(Item, Sep)
//
// NOTE: this only captures the STRUCTURE of a list factor (item text,
// separator text, which combinator it corresponds to). It does not yet
// compile that into an actual parser - that's still pending, same as
// the rest of the "RULE expression -> AST" pipeline flagged in
// grammar.js's file header. Quantifiers on ordinary (non-list) factors
// (e.g. "FnParams?", "Statement*") are likewise still left as
// unparsed raw text for now, for the same reason - only "[...]"'s
// internal quantifiers are interpreted at this point, since that's
// specifically what was being wired in here.

// :::::: Scanning a pattern into atoms
//
// A "[...]" list and a "`...`" literal are each captured as ONE atom
// before any whitespace-splitting happens - critical so a list's
// internal spaces don't fragment it into multiple factors. A directly
// (no-space) trailing ":label" or quantifier is swept up as part of the
// same atom too, e.g. "[ Item Sep? ]:args" or "`,`?".

function scanPatternAtoms (patternText) {
  const atoms = [];
  const text  = patternText.trim();
  let i = 0;

  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }

    if (text[i] === '`') {
      const start = i;
      i++;
      while (i < text.length && text[i] !== '`') i++;
      i++; // consume closing backtick
      while (i < text.length && !/\s/.test(text[i])) i++; // trailing ?/label, no space
      atoms.push(text.slice(start, i));
      continue;
    }

    if (text[i] === '[') {
      const start = i;
      let depth = 0;
      while (i < text.length) {
        if (text[i] === '[') depth++;
        if (text[i] === ']') { depth--; i++; if (depth === 0) break; continue; }
        i++;
      }
      while (i < text.length && !/\s/.test(text[i])) i++; // trailing label, no space
      atoms.push(text.slice(start, i));
      continue;
    }

    const start = i;
    while (i < text.length && !/\s/.test(text[i])) i++;
    atoms.push(text.slice(start, i));
  }

  return atoms;
}

// :::::: Parsing a RULE pattern's factors (inline labels + list shapes)
//
//   `fn` IDENTIFIER:identifier FnParams:args Block:body
//        ^factor 2  ^label      ^factor 3 ^label
//
// KNOWN LIMITATION (unchanged from before): this still does not
// understand "(...)" grouping/choice - only "[...]" lists are handled
// as a distinguished shape. A pattern like
// "IDENTIFIER ( ParenCallArgs | SingleBareArg )" is still mis-split
// into multiple separate factors instead of the intended 2 - see
// grammar.js's file header for the full writeup and impact.

export function parsePatternFactors (patternText) {
  return scanPatternAtoms(patternText).map((atom, i) => parseAtomToFactor(atom, i + 1));
}

function parseAtomToFactor (atom, index) {
  const labelMatch  = atom.match(/^(.+?):([A-Za-z_][A-Za-z0-9_]*)$/);
  const body        = labelMatch ? labelMatch[1] : atom;
  const inlineLabel = labelMatch ? labelMatch[2] : null;

  if (body.startsWith('[')) {
    return { index, kind: 'list', inlineLabel, ...parseListBody(body) };
  }

  return {
    index,
    kind: body.startsWith('`') ? 'literal' : 'reference',
    raw: body,
    inlineLabel,
  };
}

// Parses the inside of "[ ... ]" into one of the six sepBy-family shapes
// (see file header table above).
function parseListBody (bracketText) {
  const inner      = bracketText.slice(1, -1).trim(); // strip [ and ]
  const innerAtoms = scanPatternAtoms(inner);

  if (innerAtoms.length < 1 || innerAtoms.length > 2) {
    throw new Error(
      `[lsd] Malformed list expression "${bracketText}": expected "[ Item ]" or ` +
      `"[ Item Sep ]" (each optionally with a trailing "+" on Item and/or "?" on Sep).`
    );
  }

  const itemAtom = innerAtoms[0];
  const itemPlus = itemAtom.endsWith('+');
  const item     = itemPlus ? itemAtom.slice(0, -1) : itemAtom;

  if (innerAtoms.length === 1) {
    return {
      item,
      atLeastOne: itemPlus,
      separator: null,
      separatorOptional: false,
      combinator: itemPlus ? 'many1' : 'many0',
    };
  }

  const sepAtom     = innerAtoms[1];
  const sepOptional = sepAtom.endsWith('?');
  const separator   = sepOptional ? sepAtom.slice(0, -1) : sepAtom;

  const combinator = sepOptional
    ? (itemPlus ? 'sepBy1Loose' : 'sepByLoose')
    : (itemPlus ? 'sepBy1'      : 'sepBy');

  return { item, atLeastOne: itemPlus, separator, separatorOptional: sepOptional, combinator };
}

// :::::: Parsing a "=>" mapping list
//
// Each mapping token is one of:
//   N                 - bare index                  (needs NODE to name it)
//   name:N             - named index                 (self-contained)
//   `literal`          - bare constant                (needs NODE to name it)
//   name:`literal`      - named constant               (self-contained)
//   name:bareword       - named constant, unquoted     (self-contained)

export function parseMappingTokens (mappingText) {
  if (!mappingText?.trim()) return [];

  return mappingText.trim().split(/\s+/).map(token => {
    const namedMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*):(.+)$/);

    if (namedMatch) {
      const [, name, valueText] = namedMatch;
      if (/^\d+$/.test(valueText)) return { kind: 'namedIndex', name, index: Number(valueText) };
      return { kind: 'namedConstant', name, value: parseConstant(valueText) };
    }

    if (/^\d+$/.test(token)) return { kind: 'index', index: Number(token) };
    return { kind: 'constant', value: parseConstant(token) };
  });
}

function parseConstant (text) {
  const quoted = text.match(/^[`'"](.*)[`'"]$/);
  if (quoted) return quoted[1];
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^\d+$/.test(text)) return Number(text);
  return text; // bare word, used as-is
}

// :::::: The unifying resolver
//
// Produces the final { name -> { kind: 'capture', index } | { kind: 'constant', value } }
// bindings for one RULE alternative, from whichever combination of inline
// labels / mapping tokens / NODE fields was actually provided. Unchanged
// by the addition of list factors above - a "list" factor still just
// carries an .index and an optional .inlineLabel like any other factor,
// so it slots into this resolver with no special-casing needed.

export function resolveBindings ({ patternFactors, mappingTokens, nodeFields }) {
  const bindings = {};

  // 1. inline pattern labels
  for (const factor of patternFactors) {
    if (factor.inlineLabel) {
      bindings[factor.inlineLabel] = { kind: 'capture', index: factor.index };
    }
  }

  // 2. explicitly named mapping tokens
  const unnamedSlots = [];
  for (const token of mappingTokens) {
    if (token.kind === 'namedIndex')    bindings[token.name] = { kind: 'capture',  index: token.index };
    else if (token.kind === 'namedConstant') bindings[token.name] = { kind: 'constant', value: token.value };
    else unnamedSlots.push(token); // bare index / bare constant - resolved in step 3
  }

  // 3. bare (unnamed) slots claim NODE's remaining, not-yet-used fields, in order
  if (unnamedSlots.length > 0) {
    if (!nodeFields) {
      throw new Error(
        `[lsd] Alternative has ${unnamedSlots.length} unnamed capture(s)/constant(s), ` +
        `but no NODE is declared to name them from. Either label them inline/in the ` +
        `mapping, or declare a NODE with matching fields.`
      );
    }

    const alreadyClaimed  = new Set(Object.keys(bindings));
    const availableFields = nodeFields.filter(f => !alreadyClaimed.has(f));

    if (availableFields.length < unnamedSlots.length) {
      throw new Error(
        `[lsd] ${unnamedSlots.length} unnamed slot(s) but only ${availableFields.length} ` +
        `unclaimed NODE field(s) remain (${nodeFields.join(', ')}).`
      );
    }

    unnamedSlots.forEach((slot, i) => {
      const name = availableFields[i];
      bindings[name] = slot.kind === 'index'
        ? { kind: 'capture', index: slot.index }
        : { kind: 'constant', value: slot.value };
    });
  }

  return bindings;
}

// :::::: Cross-alternative consistency check
//
// Every alternative of a block should ultimately produce the SAME SET of
// field names (order doesn't matter - only the set does), regardless of
// which of the three styles each alternative used to get there.

export function checkBlockConsistency (blockName, alternativesBindings, nodeFields) {
  const nameSets = alternativesBindings.map(b => new Set(Object.keys(b)));
  const [first, ...rest] = nameSets;

  rest.forEach((set, i) => {
    const missing = [...first].filter(n => !set.has(n));
    const extra   = [...set].filter(n => !first.has(n));
    if (missing.length || extra.length) {
      throw new Error(
        `[lsd] Block "${blockName}": alternative ${i + 2} disagrees with alternative 1 ` +
        `on field names.` +
        (missing.length ? ` Missing: ${missing.join(', ')}.` : '') +
        (extra.length ? ` Extra: ${extra.join(', ')}.` : '')
      );
    }
  });

  if (nodeFields) {
    const declared = new Set(nodeFields);
    const produced  = first;
    const missing = [...declared].filter(n => !produced.has(n));
    const extra   = [...produced].filter(n => !declared.has(n));
    if (missing.length || extra.length) {
      throw new Error(
        `[lsd] Block "${blockName}": NODE declares { ${nodeFields.join(', ')} }, but the ` +
        `RULE alternatives produce a different field set.` +
        (missing.length ? ` NODE has extra/unused: ${missing.join(', ')}.` : '') +
        (extra.length ? ` RULEs produce undeclared: ${extra.join(', ')}.` : '')
      );
    }
  }
}
