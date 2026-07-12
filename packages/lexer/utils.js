// @cosmonaut/lexer/utils.js

import { ensureArray, makeStickyRegex } from '@cosmonaut/utils';

// :::::: TokenType

export const coreTokenTypes = ['EOF', 'IDENTIFIER', 'KEYWORD', 'NUMBER', 'OPERATOR', 'PUNCT', 'STRING'];

export function buildTokenTypes (custom = []) {
  const all = [...coreTokenTypes, ...custom];
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

// Löst { use, override, add } zu einer flachen, effektiven Rule-Liste auf.
// - use:      explizite Positivliste aus Preset-Regeln (nichts passiert implizit)
// - override: ersetzt eine Regel aus 'use' per id (id muss existieren -> laute Fehler statt stillem No-Op)
// - add:      komplett neue, sprachspezifische Regeln, hinten angehängt
export function resolveRules ({ use = [], override = {}, add = [] } = {}) {
  const resolved = use.map(rule => {
    if (override[rule.id]) return normalizeRule(override[rule.id]);
    return normalizeRule(rule);
  });

  for (const id of Object.keys(override)) {
    if (!use.some(r => r.id === id)) {
      throw new Error(`[Lexer] rules.override: Rule-id "${id}" is not a member of 'rules.use'.`);
    }
  }

  return [...resolved, ...add.map(normalizeRule)];
}

function normalizeRule (rule) {
  return rule.regex.sticky ? rule : { ...rule, regex: makeStickyRegex(rule.regex) }
}

// :::::: Scanners

export function buildCommentScanners (comments) {
  const list = Array.isArray(comments) ? comments : [];

  const scanners = list.map(c => {
    if (c.type === 'line') {
      const regex = makeStickyRegex(RegExp.escape(c.start) + '.*');
      return {
        id: `comment:${c.start}`,
        test: (source, i) => source.startsWith(c.start, i),
        scan: (source, i) => { regex.lastIndex = i; const m = regex.exec(source); return { token: null, endCursor: i + m[0].length }; },
        _sortKey: c.start,
      };
    }
    if (c.type === 'block') {
      const regex = makeStickyRegex(RegExp.escape(c.start) + '[\\s\\S]*?' + RegExp.escape(c.end));
      return {
        id: `comment:${c.start}...${c.end}`,
        test: (source, i) => source.startsWith(c.start, i),
        scan: (source, i) => { regex.lastIndex = i; const m = regex.exec(source); return { token: null, endCursor: i + m[0].length }; },
        _sortKey: c.start,
      };
    }
    throw new Error(`[Lexer] Unbekannter comment-Typ: "${c.type}"`);
  });

  // Längere Starts zuerst (z.B. '///' vor '//'), damit test() nicht am kürzeren hängenbleibt.
  scanners.sort((a, b) => b._sortKey.length - a._sortKey.length);
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
