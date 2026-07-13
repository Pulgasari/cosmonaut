// @cosmonaut/parser/utils.js

// :::::: RE-EXPORTS

export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';

// :::::: Internals

const arrayfied = sth => Array.isArray(sth) ? sth : [sth];

const isArray     = sth => Array.isArray(sth);
const isDefined   = sth => sth !== undefined;
const isFalsy     = sth => !sth;
const isFn        = sth => typeof sth === 'function';
const isFunction  = sth => typeof sth === 'function';
const isNullish   = sth => sth == null;
const isObject    = sth => typeof sth === 'object' && typeof sth !== 'null';
const isTruthy    = sth => !!sth;
const isUndefined = sth => sth === undefined;

const isString = (sth, length) => {
  return length
    ? typeof sth === 'string' && sth.length === length
    : typeof sth === 'string';
}

// ::::::

export function createNodeFactory (nodeDefs) {
  return new Proxy({}, {
    get (_, type) {
      const def = nodeDefs[type];
      if (!def) throw new Error(`Unknown node type: ${type}`);
      return (args = {}) => buildNode(def, args);
    }
  });
}

export function describeTokenSpec (spec) {
  return isString  (spec)        ? `'${spec}'`
       : isArray   (spec)        ? `'${spec[1] ?? spec[0]}'`
       : isDefined (spec?.value) ? `'${spec.value}'`
       : isDefined (spec?.type)  ? spec.type
       : JSON.stringify(spec);
}

function resolveElementSpec (spec) {
  if (isFunction(spec)) return p => spec(p);

  // tokenSpec | array of tokenSpec
  const candidates = arrayfied(spec);
  return p => {
    for (const candidate of candidates) {
      if (p.check(candidate)) return p.consume(candidate).value;
    }
    throw p.error(`Erwarte eines von [${candidates.join(', ')}]`);
  };
}

export function resolveTokenSpec (spec, tokenMap) {
  if (isString(spec)) {
    const resolved = tokenMap.get(spec);
    if (!resolved) throw new Error(`[Parser] Unknown token spec: "${spec}"`);
    return resolved;
  }

  if (isArray(spec)) {
    const [type, value] = spec;
    return { type, value };
  }

  if (spec && isObject(spec)) {
    if ('type'  in spec && 'value' in spec) return { type: spec.type, value: spec.value };
    if ('type'  in spec)                    return { type: spec.type, value: undefined };
    if ('value' in spec)                    return resolveTokenSpec(spec.value, tokenMap);
  }

  throw new Error(`[Parser] Invalid token spec: ${JSON.stringify(spec)}`);
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
  if (!wrapper)             return [null, null];
  if (isArray(wrapper))     return wrapper;
  if (wrapperMap[wrapper])  return wrapperMap[wrapper];
  if (isString(wrapper, 2)) return [wrapper[0], wrapper[1]];
  throw new Error(`[Parser] Unknown Wrapper: "${wrapper}"`);

  /*
  if (wrapper is falsy)      return [null, null];
  if (wrapper is Array)      return wrapper;
  if (wrapper in wrapperMap) return wrapperMap[wrapper];
  if (wrapper is String(2))  return [wrapper[0], wrapper[1]];
  throw new Error(`[Parser] Unknown Wrapper: "${wrapper}"`);

  return match (wrapper) {
    is falsy      : [null, null];
    is Array      : wrapper;
    in wrapperMap : wrapperMap[wrapper];
    is String (2) : [wrapper[0], wrapper[1]];
    default       : throw new Error(`[Parser] Unknown Wrapper: "${wrapper}"`);
  }
  */
}

// :::::: Parsing Methods (need ctx-binding)

export function parseBinaryExpression (ctx, { operators, excluded = new Set(), parseOperand, buildNode }, minPrecedence = 0) {
  let left = parseOperand();
  while (true) {
    const match = matchOperator(ctx, operators, excluded, minPrecedence);
    if (!match) break;
    const right = parseBinaryExpression(ctx, { operators, excluded, parseOperand, buildNode }, match.precedence + 1);
    left = buildNode(match.operator, left, right);
  }
  return left;
}

export function parseList (ctx, elementSpec, options = {}) {
  const parseElement = resolveElementSpec(elementSpec);
  const { wrapper = null, closeToken = null, separatorToken = ',', trailing = true } = options;

  const [openToken, wrapperClose] = resolveWrapper(ctx._wrappers, wrapper);
  const actualClose = wrapperClose ?? closeToken;
  if (!actualClose) throw new Error('[Parser] parseList braucht "wrapper" oder "closeToken".');

  if (openToken) ctx.consumeToken(openToken);

  const elements = [];
  if (!ctx.check(actualClose)) {
    do {
      if (ctx.check(actualClose)) break; // trailing comma erlaubt
      elements.push(parseElement());
      if (!ctx.match(separatorToken)) break;
      if (!trailing && ctx.check(actualClose)) throw ctx.error('Trailing separator nicht erlaubt');
    } while (!ctx.check(actualClose));
  }

  if (openToken) ctx.consume(wrapperClose);
  return elements;
}

export function parseUnaryExpression (ctx, { operators, parseOperand, buildNode, specialCases = [] }) {
  for (const special of specialCases) {
    if (special.test(ctx)) return special.parse(ctx);
  }
  for (const [token, operator] of Object.entries(operators)) {
    if (ctx.check(token)) {
      ctx.advance();
      const argument = parseUnaryExpression(ctx, { operators, parseOperand, buildNode, specialCases });
      return buildNode(operator, argument);
    }
  }
  return parseOperand();
}

export function parseUntil (ctx, elementSpec, stopToken) {
  const parseElement = resolveElementSpec(elementSpec);
  const elements     = [];
  while (!ctx.checkAny(stopToken, 'EOF')) elements.push(parseElement());
  return elements;
}

export function parseWrapped (ctx, wrapper, elementSpec) {
  const [open, close] = resolveWrapper(ctx._wrappers, wrapper);
  const parseElement  = resolveElementSpec(elementSpec);
  ctx.consume(open);
  const result = parseElement();
  ctx.consume(close);
  return result;
}
