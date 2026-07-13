// @cosmonaut/parser/utils.js

export function buildWrapperMap (custom = {}) {
  return {
    braces   : ['{', '}'],
    brackets : ['[', ']'],
    parens   : ['(', ')'],
    ...custom,
  };
}

export function resolveWrapper (wrapperMap, wrapper) {
  if (!wrapper)               return [null, null];
  if (Array.isArray(wrapper)) return wrapper;
  if (wrapperMap[wrapper])    return wrapperMap[wrapper];
  if (typeof wrapper === 'string' && wrapper.length === 2) return [wrapper[0], wrapper[1]];
  throw new Error(`[Parser] Unknown Wrapper: "${wrapper}"`);
}

// :::::: Parsing Methods

export function parseList (p, parseElement, options = {}) {
  const { wrapper = null, closeToken = null, separatorToken = ',', trailing = true } = options;

  const [openToken, wrapperClose] = resolveWrapper(p._wrappers, wrapper);
  const actualClose = wrapperClose ?? closeToken;
  if (!actualClose) throw new Error('[Parser] parseList braucht "wrapper" oder "closeToken".');

  if (openToken) p.consumeToken(openToken);

  const elements = [];
  if (!p.isToken(actualClose)) {
    do {
      if (p.isToken(actualClose)) break; // trailing comma erlaubt
      elements.push(parseElement());
      if (!p.matchToken(separatorToken)) break;
      if (!trailing && p.isToken(actualClose)) throw p.error('Trailing separator nicht erlaubt');
    } while (!p.isToken(actualClose));
  }

  if (openToken) p.consumeToken(wrapperClose);
  return elements;
}
