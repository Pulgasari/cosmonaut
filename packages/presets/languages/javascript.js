// @cosmonaut/presets/languages/javascript.js

import { cStyleComments } from './../index.js';

export const builtins = [
  'Array', 'BigInt', 'Boolean', 'Date', 'Error', 'Function', 'Map', 'Number',
  'Object', 'Promise', 'RegExp', 'Set', 'String', 'Symbol',
];

export const comments = cStyleComments;

export const globals = [
  'clearInterval', 'clearTimeout', 'console', 'document', 'globalThis',
  'process', 'setInterval', 'setTimeout', 'window',
];

export const keywords = [
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'cond', 'const',
  'continue', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'is', 'let', 'match',
  'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try',
  'typeof', 'use', 'var', 'void', 'while', 'yield',
];

export const literals = ['false', 'null', 'true', 'undefined', 'Infinity', 'NaN'];

export const operators = {
  '='          : { precedence:  1, associativity: 'right' },
  '+='         : { precedence:  1, associativity: 'right' },
  '-='         : { precedence:  1, associativity: 'right' },
  '*='         : { precedence:  1, associativity: 'right' },
  '/='         : { precedence:  1, associativity: 'right' },
  '%='         : { precedence:  1, associativity: 'right' },
  '<<='        : { precedence:  1, associativity: 'right' },
  '>>='        : { precedence:  1, associativity: 'right' },
  '>>>='       : { precedence:  1, associativity: 'right' },
  '&='         : { precedence:  1, associativity: 'right' },
  '^='         : { precedence:  1, associativity: 'right' },
  '|='         : { precedence:  1, associativity: 'right' },
  '||'         : { precedence:  4, associativity: 'left'  },
  '&&'         : { precedence:  5, associativity: 'left'  },
  '??'         : { precedence:  6, associativity: 'left'  },
  '==='        : { precedence:  7, associativity: 'left'  },
  '!=='        : { precedence:  7, associativity: 'left'  },
  '=='         : { precedence:  7, associativity: 'left'  },
  '!='         : { precedence:  7, associativity: 'left'  },
  '<'          : { precedence:  8, associativity: 'left'  },
  '>'          : { precedence:  8, associativity: 'left'  },
  '<='         : { precedence:  8, associativity: 'left'  },
  '>='         : { precedence:  8, associativity: 'left'  },
  'in'         : { precedence:  8, associativity: 'left'  },
  'instanceof' : { precedence:  8, associativity: 'left'  },
  '<<'         : { precedence:  9, associativity: 'left'  },
  '>>'         : { precedence:  9, associativity: 'left'  },
  '>>>'        : { precedence:  9, associativity: 'left'  },
  '+'          : { precedence: 12, associativity: 'left'  },
  '-'          : { precedence: 12, associativity: 'left'  },
  '*'          : { precedence: 13, associativity: 'left'  },
  '/'          : { precedence: 13, associativity: 'left'  },
  '%'          : { precedence: 13, associativity: 'left'  },
  '!'          : { precedence: 15, associativity: 'right' },
  '~'          : { precedence: 15, associativity: 'right' },
  'typeof'     : { precedence: 15, associativity: 'right' },
  'void'       : { precedence: 15, associativity: 'right' },
  'delete'     : { precedence: 15, associativity: 'right' },
};

export const puncts = ['{', '}', '(', ')', '[', ']', ',', ';', '.', ':', '?'];

default export {
  builtins,
  comments,
  globals,
  keywords,
  literals,
  operators,
  puncts
}
