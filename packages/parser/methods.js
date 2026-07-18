// @cosmonaut/parser/methods.js

import { list, map, seq } from '@cosmonaut/combinators';
import { isTitleCase }    from '@cosmonaut/utils/internals';
import { createChain, resolveElementSpec, resolveWrapper } from './utils.js';

// ::::::

export function parsePattern (p, patternStr, strategyStr, captureObj = null) {
  const parts      =  patternStr.trim().split(/\s+/);
  const strategies = strategyStr.trim().split('');

  if (parts.length !== strategies.length) {
    throw new Error(`Parser-Fehler: Pattern-Elemente (${parts.length}) und Strategie-Flags (${strategies.length}) stimmen nicht überein.`);
  }

  // Transformiere jedes Text-Fragment in ein träges Atom, das die EIGENEN Parser-Methoden aufruft
  const combinators = parts.map((part, i) => {
    const strategy = strategies[i];

    if (strategy === '!') {
      // Nutzt die native consume-Methode des übergebenen Parser-Kontexts
      return (ctx) => ctx.consume(part);
    } 
    else if (strategy === '?') {
      // Wenn die Regel existiert oder PascalCase ist, via Proxy auflösen
      if (p.rules.has(part) || isTitleCase(part)) {
        return (ctx) => p[part](ctx);
      }
      // Ansonsten nutzen wir die native match-Methode des Parser-Kontexts
      return (ctx) => ctx.match(part);
    }
    throw new Error(`Parser-Fehler: Unbekanntes Strategie-Flag "${strategy}". Erwartet wird '?' oder '!'.`);
  });

  // Führe die Atome zu einer Sequenz zusammen
  let compiled = seq(...combinators);

  // Falls ein positionales Mapping gewünscht ist, falte das flache seq-Ergebnis-Array zusammen
  if (captureObj) {
    compiled = map(compiled, (results) => {
      if (!results) return null; // Fehlschlag nach oben durchreichen
      
      const captured = {};
      for (const [key, index] of Object.entries(captureObj)) {
        captured[key] = results[index];
      }
      return captured;
    });
  }

  return createChain(compiled, p);
}

export function parseListPattern (p, inner, configStr = ", {}") {
  // Wenn 'inner' ein String ist, lösen wir die Regel lazy über den Proxy auf
  const innerCombinator = typeof inner === 'string' ? ((ctx) => p[inner](ctx)) : inner;

  // Konfiguration zerlegen (z.B. ", ()")
  const parts      = configStr.trim().split(/\s+/);
  const separator  = parts[0] || ',';
  const wrapperStr = parts[1] || null;

  let  openChar = null;
  let closeChar = null;
  if (wrapperStr && wrapperStr.length >= 2) {
     openChar = wrapperStr[0];
    closeChar = wrapperStr[1];
  }

  // Nutzt das strukturelle Core-list-Atom, befeuert mit den NATIVEN Parser-Methoden
  const compiled = list (innerCombinator, {
    separator  : separator ? (ctx => ctx.consume(separator)) : null,
    open       :  openChar ? (ctx => ctx.consume(openChar )) : null,
    close      : closeChar ? (ctx => ctx.consume(closeChar)) : null,
    trailing   : true,
    allowEmpty : true
  });

  return createChain(compiled, p);
}

// :::::: Pratt Methods

export function parseBinaryExpr (p, { operators, excluded = new Set(), parseOperand, buildNode }, minPrecedence = 0) {
  let left = parseOperand();
  while (true) {
    const match = matchOperator(p, operators, excluded, minPrecedence);
    if (!match) break;
    const right = parseBinaryExpr(p, { operators, excluded, parseOperand, buildNode }, match.precedence + 1);
    left = buildNode(match.operator, left, right);
  }
  return left;
}

export function parseUnaryExpr (p, { operators, parseOperand, buildNode, specialCases = [] }) {
  for (const special of specialCases) {
    if (special.test(p)) return special.parse(p);
  }
  for (const [token, operator] of Object.entries(operators)) {
    if (p.check(token)) {
      p.advance();
      const argument = parseUnaryExpr(p, { operators, parseOperand, buildNode, specialCases });
      return buildNode(operator, argument);
    }
  }
  return parseOperand();
}







// :::::: DEPRECATED
// these methods will be refactored or deleted

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

// like parseList, but for the common "optional keyword, then a bare comma-separated
// list with no wrapper and no fixed end token" shape (e.g. 'use A, B'). parseList can't
// express this - it always needs a wrapper or a closeToken to know where to stop; here
// the only stop condition is "no more commas".
export function parseListWhen (p, spec, elementSpec) {
  if (!p.matchAny(spec)) return [];
  const parseElement = resolveElementSpec(elementSpec);
  const elements = [parseElement(p)];
  while (p.match(',')) elements.push(parseElement(p));
  return elements;
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




