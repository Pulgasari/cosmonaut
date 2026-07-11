// @cosmonaut/lexer/presets.js

export const      cStyleComments = [{ type: 'line', start: '//' }, { type: 'block', start: '/*', end: '*/' }];
export const   hashStyleComments = [{ type: 'line', start: '#' }];
export const   dashStyleComments = [{ type: 'line', start: '--' }];
export const pythonStyleComments = [{ type: 'line', start: '#' }, { type: 'block', start: "'''", end: "'''" }, { type: 'block', start: '"""', end: '"""' }];
export const commonStyleComments = [{ type: 'line', start: '//' }, { type: 'line', start: '#' }, { type: 'block', start: '/*', end: '*/' }];
