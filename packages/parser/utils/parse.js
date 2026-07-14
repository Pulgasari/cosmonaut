// @cosmonaut/parser/utils/parse.js
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
