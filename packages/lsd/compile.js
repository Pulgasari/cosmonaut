// @cosmonaut/lsd/compile.js

// Turns a parsed LSD document into the target artifacts. compileTokenizer
// and compileParserMethods are now real (were previously stubs); codegen
// is deliberately NOT part of this package - see the readme for why:
// codegen from AST to a specific target language (JS, later Odin, ...) is
// the consuming compiler's own job, built with @cosmonaut/generator. LSD
// only takes source text all the way to AST nodes.

import { Lexer, buildTokenTypes, resolveRules } from '@cosmonaut/lexer';
import * as PARSER_BLOCKS                       from '@cosmonaut/parser';

import { compileExpr }          from './expression.js';
import { extractLiteralPrefix } from './highlightjs.js';
import { buildTypeRegistry }    from './resolve.js';

function escapeRegExp (str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// :::::: Tokenizer

// TKN entries compile to @cosmonaut/lexer content rules, in DECLARATION
// ORDER - poo.lsd's own comment ("order and relation of rules is part of
// the control flow") is honored directly, since Lexer's rule matching
// already tries rules in array order, first sticky match wins.
//
// - kind 'regex': becomes a direct content rule, UNLESS the TKN's own
//   name is exactly "WHITESPACE" - the Lexer already whitespace-skips by
//   default (buildWhitespaceScanner, always active via skipWhitespace),
//   so a redundant content rule for it is simply omitted.
// - kind 'ref' pointing at a META LIST: becomes one word-boundary content
//   rule PER WORD in that list (e.g. every keyword gets its own rule) -
//   UNLESS the word itself isn't "word-shaped" (e.g. punctuation like
//   "(" or ";"), in which case no word-boundary is used at all, since
//   "\b" only makes sense adjacent to \w characters and would otherwise
//   silently fail to match punctuation entirely.
//   Note @cosmonaut/lexer's Lexer ALSO auto-reclassifies any IDENTIFIER-
//   shaped match into KEYWORD when it's in options.keywords - that
//   mechanism is used too (for whichever TKN name's ref list is passed
//   as `keywords`), as a second line of defense/simpler path; the
//   explicit per-word rules generated here work for ANY ref'd TKN name
//   (not just one specifically called "KEYWORD"), which is why they're
//   generated unconditionally instead of relying on that name-specific
//   built-in.
// - kind 'ref' pointing at a META TABLE: becomes one content rule PER
//   SYMBOL across all of the table's rows (its trailing "( a b c )"
//   columns), sorted longest-first so e.g. ">=" is tried before ">".
//
// LIMITATION (documented, same heuristic already used by highlightjs.js):
// a COMMENT-named TKN's regex is converted to a line-comment
// `{ start: <literal prefix> }` via extractLiteralPrefix() - covers "//"/
// "#" style comments, not block comments ("/* */"), which aren't
// reliably derivable from an arbitrary regex. Pass `options.extraComments`
// to add those by hand until LSD gains an explicit line/block distinction.
//
// KNOWN LIMITATION (found while testing, not yet fixed): a META TABLE
// row whose own symbol list itself contains "(" or ")" as literal
// symbols confuses meta.js's naive "last parenthesized group at end of
// line" row parser. Keep such punctuation in a separate META LIST for
// now if you hit this.

export function compileTokenizer (lsd, options = {}) {
  const { extraComments = [] } = options;

  const tokenTypes = buildTokenTypes(lsd.tokens.map(t => t.name));
  const rules      = [];
  const comments   = [...extraComments];
  let keywordList  = [];

  for (const tkn of lsd.tokens) {
    const upperName = tkn.name.toUpperCase();

    if (tkn.kind === 'regex') {
      if (upperName === 'WHITESPACE') continue; // Lexer already skips whitespace by default

      if (upperName === 'COMMENT') {
        const prefix = extractLiteralPrefix(tkn.pattern.source);
        if (prefix) { comments.push({ type: 'line', start: prefix }); continue; }
      }

      rules.push({ id: `tkn:${tkn.name}`, type: tokenTypes[tkn.name], regex: tkn.pattern });
      continue;
    }

    if (tkn.kind === 'ref') {
      const list  = lsd.meta.lists[tkn.ref];
      const table = lsd.meta.tables[tkn.ref];

      if (list) {
        if (upperName === 'KEYWORD') keywordList = list; // let Lexer's built-in IDENTIFIER->KEYWORD reclassification apply too
        for (const word of list) {
          const isWordShaped = /^\w+$/.test(word); // \b only makes sense around \w-shaped text
          rules.push({
            id: `tkn:${tkn.name}:${word}`,
            type: tokenTypes[tkn.name],
            regex: isWordShaped
              ? new RegExp('\\b' + escapeRegExp(word) + '\\b')
              : new RegExp(escapeRegExp(word)),
          });
        }
        continue;
      }

      if (table) {
        const symbols = table.rows.flatMap(row => row.symbols ?? []).sort((a, b) => b.length - a.length);
        for (const symbol of symbols) {
          rules.push({
            id: `tkn:${tkn.name}:${symbol}`,
            type: tokenTypes[tkn.name],
            regex: new RegExp(escapeRegExp(symbol)),
          });
        }
        continue;
      }

      throw new Error(`[lsd] TKN "${tkn.name}" references "@${tkn.ref}", but no META LIST or META TABLE by that name was found.`);
    }
  }

  return function createLexer (source) {
    return new Lexer(source, {
      tokenTypes,
      rules: resolveRules(rules),
      comments,
      keywords: keywordList,
    });
  };
}



// :::::: Parser methods

export function compileParserMethods (lsd) {
  const registry = buildTypeRegistry(lsd);
  const methods  = {};

  // Top-level "RULE :: Name == Expr [=> N]" productions (Program, Statement,
  // IdentList, Block, ...) are TRANSPARENT dispatch aliases, not their own
  // distinct node type - they just forward whatever their compiled
  // pattern matched, unwrapped. An optional trailing "=> N" extracts just
  // raw position N from a multi-factor pattern instead of forwarding the
  // whole raw match array - needed whenever the pattern wraps its real
  // content in delimiter literals (e.g. "Block == `{` Statement* `}` => 2",
  // where the useful value is just the Statement* array at position 2,
  // not the 3-element [openBrace, statements, closeBrace] array).
  for (const production of lsd.grammar.productions) {
    const matchParser = compileExpr(production.expr, registry, PARSER_BLOCKS);

    methods[production.name] = production.extractIndex == null
      ? state => matchParser(state)
      : state => {
          const result = matchParser(state);
          return result === undefined ? undefined : result[production.extractIndex - 1];
        };
  }

  for (const block of lsd.grammar.blocks) {
    const alternativeMatchers = block.alternatives.map(alt => {
      const factorParsers = alt.patternFactors.map(f => compileExpr(f, registry, PARSER_BLOCKS));
      const matchParser   = factorParsers.length === 1 ? factorParsers[0] : PARSER_BLOCKS.seq(...factorParsers);

      return state => {
        const position  = state.save();
        const rawResult = matchParser(state);

        if (rawResult === undefined) { state.restore(position); return undefined; }

        const rawArray = factorParsers.length === 1 ? [rawResult] : rawResult;
        const node     = { type: block.name };

        for (const [name, binding] of Object.entries(alt.bindings)) {
          node[name] = binding.kind === 'constant' ? binding.value : rawArray[binding.index - 1];
        }

        return node;
      };
    });

    methods[block.name] = state => {
      for (const matchAlternative of alternativeMatchers) {
        const result = matchAlternative(state);
        if (result !== undefined) return result;
      }
      return undefined;
    };
  }

  return methods;
}

// :::::: Highlighting

export function compileHighlighting (lsd) {
  return lsd.highlighting;
}
