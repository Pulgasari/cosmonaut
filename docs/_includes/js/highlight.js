// docs/_includes/js/highlight.js

let poo = {};
poo.builtins     = 'Array Blob Bool Char Color Date Enum Generator List Map Number Queue Pattern Record RegExp Set Stack String Store Symbol Tree Tuple Union';
poo.keywords     = 'as and break catch continue cpy do fail fn if kill loop in new obj of on or pkg ref return skip static switch use val yield',
poo.literals     = 'false null true undefined',
poo.punctuations = `{}[]();:,.`;
poo.operators = `
  >>> <=> === ~== !==
  >> |> |? |! |* || && ?? =>
  == != =< >= += -= *= /= #= ~= :=
  + - * / % = < > ! & | ^ ~ #
`;

// RegExp
const rgx = {};
rgx.numbers   = '0[xX][0-9a-fA-F_]+|0[bB][01_]+|\\d[\\d_]*\\.\\d[\\d_]*(?:[eE][+-]?\\d+)?|\\d[\\d_]*';
rgx.operators = buildOperatorRegex(poo.operators);

hljs.registerLanguage('poo', function (hljs) {
  const KEYWORDS = {
    built_in: poo.builtins,
    keyword: poo.keywords,
    literal: poo.literals,
  };

  const COMMENT = hljs.COMMENT(/\/\//, /$/);

  const NUMBER = {
    scope: 'number',
    match: new RegExp(rgx.numbers),
    relevance: 0,
  };

  const OPERATOR = {
    scope: 'operator',
    match: rgx.operators,
    relevance: 0,
  };

  // Used at the top level, where both braces are ordinary punctuation.
  const PUNCTUATION = {
    scope: 'punctuation',
    match: /[{}[\]();:,.]/,
    relevance: 0,
  };

  /*
   * Used inside ${...} and nested {...} blocks.
   *
   * It must not match "}", because that character closes either
   * EXPRESSION_INTERPOLATION or BRACED_CODE.
   */
  const EXPRESSION_PUNCTUATION = {
    scope: 'punctuation',
    match: /[{\[\]();:,.]/,
    relevance: 0,
  };

  const SPECIAL_KEYWORD = {
    scope: 'keyword',
    match: /\bfn[*^]/,
  };

  const VARIABLE_INTERPOLATION = {
    scope: 'variable',
    match: /\$[A-Za-z_][A-Za-z0-9_]*/,
    relevance: 0,
  };

  const STRING_SINGLE = {
    scope: 'string',
    begin: /'/,
    end: /'/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
    ],
  };

  const STRING_DOUBLE = {
    scope: 'string',
    begin: /"/,
    end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VARIABLE_INTERPOLATION,
    ],
  };

  /*
   * These modes are connected below:
   *
   * TEMPLATE_STRING
   *   -> ${ EXPRESSION_INTERPOLATION }
   *        -> nested { BRACED_CODE }
   *        -> nested `TEMPLATE_STRING`
   */
  const EXPRESSION_INTERPOLATION = {
    scope: 'subst',
    begin: /\$\{/,
    end: /\}/,
    keywords: KEYWORDS,
    contains: [],
  };

  const TEMPLATE_STRING = {
    scope: 'string',
    begin: /`/,
    end: /`/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      EXPRESSION_INTERPOLATION, // Must be checked before ordinary $variable interpolation.
      VARIABLE_INTERPOLATION,
    ],
  };

  /*
   * A normal {...} block inside an expression interpolation.
   *
   * "self" handles arbitrarily nested brace blocks.
   */
  const BRACED_CODE = {
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS,
    contains: [],
  };

  /*
   * Do not put a matcher for "}" in this list. A closing brace must remain
   * available to the enclosing BRACED_CODE or EXPRESSION_INTERPOLATION mode.
   */
  const EXPRESSION_ATOMS = [
    COMMENT,
    STRING_SINGLE,
    STRING_DOUBLE,
    TEMPLATE_STRING,
    SPECIAL_KEYWORD,
    NUMBER,
    OPERATOR,
    EXPRESSION_PUNCTUATION,
  ];

  /*
   * "self" recursively handles nested brace blocks.
   *
   * Do not put BRACED_CODE itself in BRACED_CODE.contains.
   */
  BRACED_CODE.contains = [
    'self',
    ...EXPRESSION_ATOMS,
  ];

  /*
   * BRACED_CODE must come before EXPRESSION_PUNCTUATION so that an opening
   * brace starts a nested block instead of being consumed as punctuation.
   */
  EXPRESSION_INTERPOLATION.contains = [
    BRACED_CODE,
    ...EXPRESSION_ATOMS,
  ];

  return {
    name: 'Poo',
    aliases: ['poo'],
    case_insensitive: false,
    keywords: KEYWORDS,

    contains: [
      COMMENT,
      STRING_SINGLE,
      STRING_DOUBLE,
      TEMPLATE_STRING,
      SPECIAL_KEYWORD,
      NUMBER,
      OPERATOR,
      PUNCTUATION,
    ],
  };
});


    
  
  



function buildOperatorRegex (opsInput) {
  const ops = typeof opsInput === 'string' ? opsInput.trim().split(/\s+/) : [...opsInput];

  const escaped = ops
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  return new RegExp(escaped.join('|'));
}

function escapeRegex (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


