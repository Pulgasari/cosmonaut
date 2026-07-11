// utils.js

// :::::: EXPORTS
export const CommentPresets = {
  C_STYLE: [
    { type: 'line',  start: '//'  },
    { type: 'block', start: '/*', end: '*/' }
  ],
  HASH_STYLE: [
    { type: 'line', start: '#' }
  ],
  DASH_STYLE: [
    { type: 'line', start: '--' } // SQL / SQL-like
  ],
  PYTHON_STYLE: [
    { type: 'line', start: '#' },
    { type: 'block', start: "'''", end: "'''" },
    { type: 'block', start: '"""', end: '"""' }
  ],
  COMMON: [
    { type: 'line', start: '//' },
    { type: 'line', start: '#' },
    { type: 'block', start: '/*', end: '*/' }
  ]
};

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
  if (pattern instanceof RegExp) {
    return new RegExp(pattern.source, Array.from(new Set((pattern.flags || '') + f)).join(''));
  }
  return new RegExp(pattern, f);
};

export const makeRulesFromPuncts = puncts => {
  return ensureArray(puncts).map(ch => ({
    type: 'PUNCT',
    value: ch,
    regex: makeStickyRegex(RegExp.escape(String(ch)))
  }));
};

export const makeRulesFromOperators = operators => {
  // NOTE: do not sort here by default; caller decides ordering
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

// Merge user options with defaults in a predictable way
export const mergeOptions = (user = {}, defaults = {}) => {
  const out = { ...defaults, ...user };
  // normalize some fields
  out.puncts    = user.puncts ?? defaults.puncts;
  out.operators = user.operators ?? defaults.operators;
  out.keywords  = Array.isArray(user.keywords) ? user.keywords : (defaults.keywords || []);
  out.comments  = Array.isArray(user.comments) ? user.comments : (defaults.comments || []);
  out.rules     = Array.isArray(user.rules)    ? user.rules    : (defaults.rules || []);
  return out;
};

// Kleine Token-Fabrik falls du sie nutzen willst
export const makeToken = ({ type, value, line, column }) => ({ type, value, line, column });

// Polyfill für RegExp.escape falls nicht vorhanden
if (!RegExp.escape) {
  RegExp.escape = function (s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
}
