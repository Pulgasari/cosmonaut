// @cosmonaut/lexer/utils.js

// :::::: HELPERS

export const ensureArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split('');
  if (value && typeof value === 'object') return Object.keys(value);
  return [];
};

export const escapedRegExp = (str, flags = '') => {
  return new RegExp(RegExp.escape(String(str)), flags);
};

export const makeStickyRegex = (pattern, flags = '') => {
  // ensure 'y' sticky flag is present
  const f = flags.includes('y') ? flags : flags + 'y';
  return (pattern instanceof RegExp)
    ? new RegExp(pattern.source, Array.from(new Set((pattern.flags || '') + f)).join(''))
    : new RegExp(pattern, f);
};

export const makeRulesFromPuncts = puncts => {
  return ensureArray(puncts).map(ch => ({
    type: 'PUNCT',
    value: ch,
    regex: makeStickyRegex(RegExp.escape(String(ch)))
  }));
};

export const makeRulesFromOperators = operators => {
  return ensureArray(operators).map(op => ({
    type: 'OPERATOR',
    value: op,
    regex: makeStickyRegex(RegExp.escape(String(op)))
  }));
};

// Build comment matchers used by the lexer
export const buildCommentMatchers = comments => {
  const list = Array.isArray(comments) ? comments : [];
  const matchers = list.map(c => {
    if (c.type === 'line') {
      // match from start to end of line (or EOF)
      return {
        kind: 'line',
        start: c.start,
        regex: makeStickyRegex(RegExp.escape(c.start) + '.*')
      };
    } else if (c.type === 'block') {
      // non-greedy block match allowing newlines
      return {
        kind: 'block',
        start: c.start,
        end: c.end,
        regex: makeStickyRegex(RegExp.escape(c.start) + '[\\s\\S]*?' + RegExp.escape(c.end))
      };
    } else {
      throw new Error('Unknown comment matcher type: ' + c.type);
    }
  });

  // longer starts first so '///' matches before '//'
  matchers.sort((a, b) => (b.start.length - a.start.length));
  return matchers;
};

export const mergeOptions = (user = {}, defaults = {}) => {
  const merged = { ...defaults, ...user };
  // normalize some fields
  merged.puncts    = user.puncts    ?? defaults.puncts;
  merged.operators = user.operators ?? defaults.operators;
  merged.keywords  = Array.isArray(user.keywords) ? user.keywords : (defaults.keywords || []);
  merged.comments  = Array.isArray(user.comments) ? user.comments : (defaults.comments || []);
  merged.rules     = Array.isArray(user.rules)    ? user.rules    : (defaults.rules    || []);
  return merged;
};

export const makeToken = ({ column, line, type, value }) => ({ column, line, type, value });

export function sortOperatorsByLength (operators) {
  if (!operators) return [];
  return Array.from(operators).slice().sort((a, b) => b.length - a.length);
}

export function isKeyword (keywords, value) {
  if (!keywords) return false;
  if (keywords instanceof Set) return keywords.has(value);
  if (Array.isArray(keywords)) return keywords.includes(value);
  // fallback: treat object keys as set
  if (typeof keywords === 'object') return Object.prototype.hasOwnProperty.call(keywords, value);
  return false;
}

// Polyfill für RegExp.escape falls nicht vorhanden
if (!RegExp.escape) {
  RegExp.escape = function (s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
}
