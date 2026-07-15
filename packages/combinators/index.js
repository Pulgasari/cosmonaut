// @cosmonaut/combinators

// :::::: IMPORTS

import { isFn } from '@cosmonaut/utils/internals';

// :::::: MAGIC EXPORTS

const rule = new Proxy({}, {
  get: (target, prop) => isSymbol(prop) ? target[prop] : createLazyRule(prop)
});

// 2. Die "parse" Basis-Funktion für dynamische Direktaufrufe: parse('Expression', 4)
const parseBase = (ruleName, ...args) => decorateCombinator((ctx) => {
  if (isFn(ctx[ruleName])) return ctx[ruleName](...args);
  if (isFn(ctx.parse))     return ctx.parse(ruleName, ...args);
  throw new Error(`Regel "${ruleName}" existiert nicht auf dem Parser-Kontext.`);
});

// Das "parse" Proxy (erlaubt sowohl Direktaufruf als auch Property-Zugriff!)
const parse = new Proxy (parseBase, {
  get: (target, prop) => (prop in target || isSymbol(prop)) ? target[prop] : createLazyRule(prop)
});

// ::: Primitives

const consume = (value)   => decorateCombinator((ctx) => ctx.consume(value));
const match   = (pattern) => decorateCombinator((ctx) => ctx.match(pattern));
const check   = (pattern) => decorateCombinator((ctx) => ctx.check(pattern) ? ctx.peek() : null);
const call    = (fn)      => decorateCombinator((ctx) => fn(ctx));
const custom  = call;

// ::: Flow

const seq = (...combinators) => decorateCombinator((ctx) => {
  const flat    = combinators.flat();
  const start   = ctx.index;
  const results = [];
  for (const combinator of flat) {
    const res = combinator(ctx);
    if (res === null || res === undefined || ctx.failed) {
      ctx.index = start;
      return null;
    }
    results.push(res);
  }
  return results;
});

const choice = (...combinators) => decorateCombinator((ctx) => {
  const flat = combinators.flat();
  for (const combinator of flat) {
    const res = runWithBacktrack(ctx, combinator);
    if (!isNullish(res)) return res;
  }
  return null;
});

const optional = (combinator) => decorateCombinator((ctx) => {
  return runWithBacktrack(ctx, combinator) ?? null;
});

const repeat = (combinator, n) => decorateCombinator((ctx) => {
  const start   = ctx.index;
  const results = [];
  for (let i = 0; i < n; i++) {
    const res = combinator(ctx);
    if (isNullish(res) || ctx.failed) {
      ctx.index = start;
      return null;
    }
    results.push(res);
  }
  return results;
});

const many = (combinator) => decorateCombinator((ctx) => {
  const results = [];
  while (true) {
    const res = runWithBacktrack(ctx, combinator);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const many1 = (combinator) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const first = combinator(ctx);
  
  if (isNullish(first) || ctx.failed) {
    ctx.index = start;
    return null;
  }

  const results = [first];
  while (true) {
    const res = runWithBacktrack(ctx, combinator);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const whileLoop = (cond) => decorateCombinator((ctx) => {
  const results = [];
  // Schneller Pfad für einfache Prädikat-Funktionen
  if (isFn(cond) && !cond.many) {
    while (cond(ctx)) results.push(ctx.next());
    return results;
  }
  // Pfad für vollwertige Kombinatoren mit Backtracking
  while (true) {
    const res = runWithBacktrack(ctx, cond);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const untilLoop = (cond) => decorateCombinator((ctx) => {
  const results = [];
  const isPlainFn = isFn(cond) && !cond.many;
  while (true) {
    if (isPlainFn) {
      if (cond(ctx)) break;
      results.push(ctx.next());
    } else {
      const res = runWithBacktrack(ctx, cond);
      if (!isNullish(res)) break;
      results.push(ctx.next());
    }
  }
  return results;
});

const not = (combinator) => decorateCombinator((ctx) => {
  const res = runWithBacktrack(ctx, combinator);
  return res === null ? true : null;
});

const lookahead = (combinator) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const res   = runWithBacktrack(ctx, combinator);
  ctx.index = start;
  return res !== null ? res : null;
});

const peek = lookahead;

// ::: Parser Helpers

const wrapped = (open, inner, close) => decorateCombinator((ctx) => {
  const start = ctx.index;
  if (open(ctx) === null) return null;
  const res = inner(ctx);
  if (res === null || ctx.failed) {
    ctx.index = start;
    return null;
  }
  if (close(ctx) === null) {
    ctx.index = start;
    return null;
  }
  return res;
});

const separated = (inner, separator) => decorateCombinator((ctx) => {
  const results = [];
  const first = runWithBacktrack(ctx, inner);
  if (isNullish(first)) return results;
  results.push(first);

  while (true) {
    const start  = ctx.index;
    const sepRes = runWithBacktrack(ctx, separator);
    if (sepRes === null) break;

    const nextRes = runWithBacktrack(ctx, inner);
    if (nextRes === null) {
      ctx.index = start;
      break;
    }
    results.push(nextRes);
  }
  return results;
});

// ::: Transformation

const map = (combinator, fn) => decorateCombinator((ctx) => {
  const res = combinator(ctx);
  return isNullish(res) ? null : fn(res, ctx);
});

const capture = (combinator, name) => decorateCombinator((ctx) => {
  const res = combinator(ctx);
  return isNullish(res) ? null : { [name]: res };
});

const node = (combinator, type) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const res   = combinator(ctx);
  if (isNullish(res)) return null;

  const nodeObj = {
    type,
    start,
    end: ctx.index
  };

  if (isArray(res)) {
    let hasObjects = false;
    let merged     = {};
    for (const item of res) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.assign(merged, item);
        hasObjects = true;
      }
    }
    if (hasObjects) {
      Object.assign(nodeObj, merged);
    } else {
      nodeObj.children = res;
    }
  } else if (res && typeof res === 'object') {
    Object.assign(nodeObj, res);
  } else {
    nodeObj.value = res;
  }

  return nodeObj;
});

// ::: Utilities

const lazy = (fn) => decorateCombinator((ctx) => {
  const resolved = fn();
  return resolved(ctx);
});

const memo = (combinator) => {
  const memoCache = new WeakMap();
  return decorateCombinator((ctx) => {
    if (!memoCache.has(ctx)) {
      memoCache.set(ctx, new Map());
    }
    const instanceCache = memoCache.get(ctx);
    const index         = ctx.index;

    if (instanceCache.has(index)) {
      const entry = instanceCache.get(index);
      if (entry.success) {
        ctx.index = entry.endPos;
        return entry.result;
      }
      return null;
    }

    const res = runWithBacktrack(ctx, combinator);
    if (!isNullish(res)) {
      instanceCache.set(index, { success: true, result: res, endPos: ctx.index });
      return res;
    } else {
      instanceCache.set(index, { success: false });
      return null;
    }
  });
};

const named = (combinator, name) => {
  const namedComb = decorateCombinator((ctx) => combinator(ctx));
  namedComb.displayName = name;
  return namedComb;
};

const debug = (combinator, message = '') => decorateCombinator((ctx) => {
  const name = message || combinator.displayName || 'unnamed';
  console.log(`[DEBUG] → Enter: "${name}" bei Index ${ctx.index}`);
  const start = ctx.index;
  const res   = combinator(ctx);
  !isNullish(res) ? console.log(`[DEBUG] ✓ Success: "${name}" von ${start} bis ${ctx.index}. Ergebnis:`, res)
                    console.log(`[DEBUG] ✗ Failed: "${name}" bei Index ${start}`);
  return res;
});

// Exporte
export {
  rule,
  call, capture, check, choice, consume, custom,
  debug,
  lazy, lookahead,
  many, many1, map, match, memo,
  named, node, not,
  optional,
  parse, peek,
  repeat,
  separated, seq,
  untilLoop as until,
  whileLoop as while, wrapped,
};

// ==========================================
// Gemeinsamer Helper für Lazy-Regeln
// ==========================================

// Erzeugt einen Kombinator, der sowohl direkt als ParserFn genutzt
// als auch als Funktion mit Argumenten aufgerufen werden kann.
function createLazyRule (ruleName) {
  const defaultCombinator = decorateCombinator((ctx) => {
    if (isFn(ctx[ruleName])) return ctx[ruleName]();
    if (isFn(ctx.parse))     return ctx.parse(ruleName);
    throw new Error(`Regel "${ruleName}" existiert nicht auf dem Parser-Kontext.`);
  });

  const ruleBuilder = (...args) => {
    return decorateCombinator((ctx) => {
      if (isFn(ctx[ruleName])) return ctx[ruleName](...args);
      if (isFn(ctx.parse))     return ctx.parse(ruleName, ...args);
      throw new Error(`Regel "${ruleName}" existiert nicht auf dem Parser-Kontext.`);
    });
  };

  // Wir verpassen dem defaultCombinator einen apply-Trap.
  // Dadurch wird er selbst "callable" und verhält sich wie ruleBuilder, wenn man Argumente übergibt.
  return new Proxy(defaultCombinator, {
    apply: (target, thisArg, args) => ruleBuilder(...args)
  });
}

// Hilfsfunktion: Führt einen Kombinator aus und setzt bei Fehlern/Exceptions den Index zurück.
function runWithBacktrack (ctx, combinator) {
  const startPos = ctx.index;
  const res      = combinator(ctx);
  if (isNullish(res) || ctx.failed) {
    ctx.index = startPos;
    return null;
  }
  return res;
}

// Dekoriert eine nackte ParserFn mit den DSL-Methoden
function decorateCombinator (fn) {
  const combinator = function (ctx) { return fn(ctx); };

  // Standard-Kombinatormethoden (Modifikatoren)
  combinator.capture  = (name)  => capture  (combinator, name);
  combinator.many     = ()      => many     (combinator);
  combinator.many1    = ()      => many1    (combinator);
  combinator.map      = (mapFn) => map      (combinator, mapFn);
  combinator.node     = (type)  => node     (combinator, type);
  combinator.optional = ()      => optional (combinator);
  combinator.repeat   = (n)     => repeat   (combinator, n);

  return combinator;
}
