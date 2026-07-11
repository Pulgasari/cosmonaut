// @cosmonaut/lexer/presets/JavaScript.js

import { cStyleComments } from './../presets.js';

export const builtins = [
  'Array',
  'BigInt',
  'Boolean',
  'Date',
  'Error',
  'Function',
  'Map',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'Set',
  'String',
  'Symbol',
];

export const comments = cStyleComments;

export const globals = [
  'clearInterval',
  'clearTimeout',
  'console',
  'document',
  'globalThis',
  'process',
  'setInterval',
  'setTimeout',
  'window',
];

export const keywords = [
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'cond',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'guard',
  'if',
  'import',
  'in',
  'instanceof',
  'is',
  'let',
  'match',
  'new',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'use',
  'var',
  'void',
  'while',
  'yield',
];

export const literals = [
  'false',
  'null',
  'true',
  'undefined',
  'Infinity',
  'NaN',
];

export const operators = {
  // assignment (lowest precedence)
  '='    : { precedence: 1, associativity: 'right' },
  '+='   : { precedence: 1, associativity: 'right' },
  '-='   : { precedence: 1, associativity: 'right' },
  '*='   : { precedence: 1, associativity: 'right' },
  '/='   : { precedence: 1, associativity: 'right' },
  '%='   : { precedence: 1, associativity: 'right' },
  '<<='  : { precedence: 1, associativity: 'right' },
  '>>='  : { precedence: 1, associativity: 'right' },
  '>>>=' : { precedence: 1, associativity: 'right' },
  '&='   : { precedence: 1, associativity: 'right' },
  '^='   : { precedence: 1, associativity: 'right' },
  '|='   : { precedence: 1, associativity: 'right' },

  // logical OR
  '||' : { precedence: 4, associativity: 'left' },

  // logical AND
  '&&' : { precedence: 5, associativity: 'left' },

  // nullish
  '??' : { precedence: 6, associativity: 'left' },

  // equality
  '===' : { precedence: 7, associativity: 'left' },
  '!==' : { precedence: 7, associativity: 'left' },
  '=='  : { precedence: 7, associativity: 'left' },
  '!='  : { precedence: 7, associativity: 'left' },

  // relational
  '<'          : { precedence: 8, associativity: 'left' },
  '>'          : { precedence: 8, associativity: 'left' },
  '<='         : { precedence: 8, associativity: 'left' },
  '>='         : { precedence: 8, associativity: 'left' },
  'in'         : { precedence: 8, associativity: 'left' },
  'instanceof' : { precedence: 8, associativity: 'left' },

  // bitwise shifts
  '<<'  : { precedence: 9, associativity: 'left' },
  '>>'  : { precedence: 9, associativity: 'left' },
  '>>>' : { precedence: 9, associativity: 'left' },

  // additive
  '+' : { precedence: 12, associativity: 'left' },
  '-' : { precedence: 12, associativity: 'left' },

  // multiplicative
  '*' : { precedence: 13, associativity: 'left' },
  '/' : { precedence: 13, associativity: 'left' },
  '%' : { precedence: 13, associativity: 'left' },

  // unary (highest)
  '!'      : { precedence: 15, associativity: 'right' },
  '~'      : { precedence: 15, associativity: 'right' },
  'typeof' : { precedence: 15, associativity: 'right' },
  'void'   : { precedence: 15, associativity: 'right' },
  'delete' : { precedence: 15, associativity: 'right' },
};

export const puncts = [
  '{', '}',
  '(', ')',
  '[', ']',
  ',', ';',
  '.', ':',
  '?'
];

