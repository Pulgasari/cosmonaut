// @cosmonaut/lexer/presets.js

export const puncts = '()[]{}?!.:,;';
export const tokens = ['COMMENT','EOF','IDENTIFIER','KEYWORD','NUMBER','OPERATOR','PUNCT','STRING'];

export const TokenType     = Object.freeze(Object.fromEntries(tokens.map(k => [k,k])));
export const TokenTypeList = Object.freeze(tokens);
export const TokenTypeSet  = new Set(TokenTypeList);

export const      cStyleComments = [{ type: 'line', start: '//' }, { type: 'block', start: '/*', end: '*/' }];
export const   hashStyleComments = [{ type: 'line', start: '#' }];
export const   dashStyleComments = [{ type: 'line', start: '--' }];
export const pythonStyleComments = [{ type: 'line', start: '#' }, { type: 'block', start: "'''", end: "'''" }, { type: 'block', start: '"""', end: '"""' }];
export const commonStyleComments = [{ type: 'line', start: '//' }, { type: 'line', start: '#' }, { type: 'block', start: '/*', end: '*/' }];
