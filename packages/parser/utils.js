// @cosmonaut/parser/utils.js

export function createNodeFactory (nodeDefs) {
  return new Proxy({}, {
    get (_, type) {
      const def = nodeDefs[type];
      if (!def) throw new Error(`Unknown node type: ${type}`);
      return (args = {}) => buildNode(def, args);
    }
  });
}

// :::::: Wrapper

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

export function parseBinaryExpression (p, { operators, excluded = new Set(), parseOperand, buildNode }, minPrecedence = 0) {
  let left = parseOperand();
  while (true) {
    const match = matchOperator(p, operators, excluded, minPrecedence);
    if (!match) break;
    const right = parseBinaryExpression(p, { operators, excluded, parseOperand, buildNode }, match.precedence + 1);
    left = buildNode(match.operator, left, right);
  }
  return left;
}

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

export function parseUntil (p, parseElement, stopToken) {
  const elements = [];
  while (!p.isToken(stopToken) && !p.isEOF()) elements.push(parseElement());
  return elements;
}

export function parseWrapped (p, wrapper, fn) {
  const [open, close] = resolveWrapper(p._wrappers, wrapper);
  p.consumeToken(open);
  const result = fn();
  p.consumeToken(close);
  return result;
}
