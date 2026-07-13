// @cosmonaut/lexer/utils.js

import { commonTokens }                 from '@cosmonaut/presets';
import { ensureArray, makeStickyRegex } from '@cosmonaut/utils';

// :::::: TokenType

export function buildTokenTypes (custom = []) {
  const all = [...commonTokens, ...custom];
  return Object.freeze(Object.fromEntries(all.map(k => [k, k])));
}

// :::::: Rules

export function makeRulesFromPuncts (puncts, tokenTypes) {
  return ensureArray(puncts).map(ch => ({
    id: `punct:${ch}`, type: tokenTypes.PUNCT, value: ch, regex: makeStickyRegex(RegExp.escape(String(ch))),
  }));
}

export function makeRulesFromOperators (operators, tokenTypes) {
  return ensureArray(operators).map(op => ({
    id: `operator:${op}`, type: tokenTypes.OPERATOR, value: op, regex: makeStickyRegex(RegExp.escape(String(op))),
  }));
}

// Resolves a flat list of rule objects into the effective rule set. 
// Every rule needs a unique 'id' - if the same id shows up more than once, the last one wins. 
export function resolveRules (rules = []) {
  const byId = new Map();

  for (const rule of rules) {
    if (!rule.id) throw new Error('[Lexer] rule is missing an "id" (required so later rules can override earlier ones).');
    byId.set(rule.id, normalizeRule(rule));
  }

  return [...byId.values()];
}

function normalizeRule (rule) {
  return rule.regex.sticky ? rule : { ...rule, regex: makeStickyRegex(rule.regex) }
}

// :::::: Scanners

export function buildCommentScanners (comments) {
  const list = Array.isArray(comments) ? comments : [];

  const scanners = list.map(c => {
    // make scanner: single line comment
    if (c.type === 'line') {
      const regex = makeStickyRegex(RegExp.escape(c.start) + '.*');
      return {
        id   : `comment:${c.start}`,
        test : (source, i) => source.startsWith(c.start, i),
        scan : (source, i) => { 
          regex.lastIndex = i;
          const m = regex.exec(source);
          return { token: null, endCursor: i + m[0].length };
        },
        _sortKey : c.start,
      };
    }
    // make scanner: multi line (block) comment
    if (c.type === 'block') {
      const regex = makeStickyRegex(RegExp.escape(c.start) + '[\\s\\S]*?' + RegExp.escape(c.end));
      return {
        id: `comment:${c.start}...${c.end}`,
        test: (source, i) => source.startsWith(c.start, i),
        scan: (source, i) => {
          regex.lastIndex = i;
          const m = regex.exec(source); 
          return { token: null, endCursor: i + m[0].length };
        },
        _sortKey: c.start,
      };
    }
    // error: wrong type
    throw new Error(`[Lexer] Unknown comment type: "${c.type}"`);
  });

  // sort scanners by length of start ('///' before '//')
  scanners.sort((a, b) => b._sortKey.length - a._sortKey.length);

  // done!
  return scanners;
}

export function buildWhitespaceScanner () {
  return {
    id: 'whitespace',
    test: (source, i) => /\s/.test(source[i]),
    scan: (source, i) => {
      let end = i;
      while (end < source.length && /\s/.test(source[end])) end++;
      return { token: null, endCursor: end };
    },
  };
}

// :::::: Helpers

export function isKeyword (keywords, value) {
  if (!keywords)                    return false;
  if (keywords instanceof Set)      return keywords.has(value);
  if (Array.isArray(keywords))      return keywords.includes(value);
  if (typeof keywords === 'object') return Object.prototype.hasOwnProperty.call(keywords, value);
  return false;
}
