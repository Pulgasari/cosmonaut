/**
 * @cosmonaut/combinators
 * Eine funktionale JavaScript-DSL zum Komponieren von Parsern.
 */

// Hilfsfunktion: Führt einen Kombinator aus und setzt bei Fehlern/Exceptions den Index zurück.
function runWithBacktrack(ctx, combinator) {
  const startPos = ctx.index;
  try {
    const res = combinator(ctx);
    if (res === null || res === undefined || ctx.failed) {
      ctx.index = startPos;
      return null;
    }
    return res;
  } catch (err) {
    ctx.index = startPos;
    return null;
  }
}

// Dekoriert eine nackte ParserFn mit den DSL-Methoden
function decorateCombinator(fn) {
  const combinator = function (ctx) {
    return fn(ctx);
  };

  // Standard-Kombinatormethoden (Modifikatoren)
  combinator.many     = ()      => many     (combinator);
  combinator.many1    = ()      => many1    (combinator);
  combinator.optional = ()      => optional (combinator);
  combinator.repeat   = (n)     => repeat   (combinator, n);
  combinator.map      = (mapFn) => map      (combinator, mapFn);
  combinator.capture  = (name)  => capture  (combinator, name);
  combinator.node     = (type)  => node     (combinator, type);

  return combinator;
}

// ==========================================
// Das magische "rule" Proxy (Referenzen auf Regeln)
// ==========================================
const rule = new Proxy({}, {
  get(target, prop) {
    // 1. Definition für parametrisierte Aufrufe: rule.MyRule(arg1, arg2)
    const ruleBuilder = (...args) => {
      return decorateCombinator((ctx) => {
        if (typeof ctx[prop] === 'function') {
          return ctx[prop](...args);
        }
        if (typeof ctx.parse === 'function') {
          return ctx.parse(prop, ...args);
        }
        throw new Error(`Regel "${prop}" existiert nicht auf dem Parser-Kontext.`);
      });
    };

    // 2. Definition für direkte Verwendung: rule.MyRule
    const defaultCombinator = decorateCombinator((ctx) => {
      if (typeof ctx[prop] === 'function') {
        return ctx[prop]();
      }
      if (typeof ctx.parse === 'function') {
        return ctx.parse(prop);
      }
      throw new Error(`Regel "${prop}" existiert nicht auf dem Parser-Kontext.`);
    });

    // Wir machen den defaultCombinator selbst callable via Proxy,
    // damit rule.Expression sowohl direkt als Kombinator als auch als Funktion
    // rule.Expression(arg) genutzt werden kann!
    return new Proxy(defaultCombinator, {
      apply(target, thisArg, args) {
        return ruleBuilder(...args);
      }
    });
  }
});

// ==========================================
// Primitiven
// ==========================================

const consume = (value) => decorateCombinator((ctx) => ctx.consume(value));
const match = (pattern) => decorateCombinator((ctx) => ctx.match(pattern));
const check = (pattern) => decorateCombinator((ctx) => ctx.check(pattern) ? ctx.peek() : null);

// Fallback für dynamische Strings: parse('Expression')
const parse = (ruleName, ...args) => decorateCombinator((ctx) => {
  if (typeof ctx[ruleName] === 'function') {
    return ctx[ruleName](...args);
  }
  if (typeof ctx.parse === 'function') {
    return ctx.parse(ruleName, ...args);
  }
  throw new Error(`Regel "${ruleName}" existiert nicht auf dem Parser-Kontext.`);
});

const call = (fn) => decorateCombinator((ctx) => fn(ctx));
const custom = call;

// ==========================================
// Flusssteuerung (Flow)
// ==========================================

const seq = (...combinators) => decorateCombinator((ctx) => {
  const flat = combinators.flat();
  const start = ctx.index;
  const results = [];
  for (const c of flat) {
    const res = c(ctx);
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
  for (const c of flat) {
    const res = runWithBacktrack(ctx, c);
    if (res !== null && res !== undefined) {
      return res;
    }
  }
  return null;
});

const optional = (combinator) => decorateCombinator((ctx) => {
  const res = runWithBacktrack(ctx, combinator);
  return res !== null ? res : null;
});

const repeat = (combinator, n) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const results = [];
  for (let i = 0; i < n; i++) {
    const res = combinator(ctx);
    if (res === null || res === undefined || ctx.failed) {
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
    if (res === null || res === undefined) break;
    results.push(res);
  }
  return results;
});

const many1 = (combinator) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const first = combinator(ctx);
  if (first === null || first === undefined || ctx.failed) {
    ctx.index = start;
    return null;
  }
  const results = [first];
  while (true) {
    const res = runWithBacktrack(ctx, combinator);
    if (res === null || res === undefined) break;
    results.push(res);
  }
  return results;
});

const whileLoop = (cond) => decorateCombinator((ctx) => {
  const results = [];
  const isPlainFn = typeof cond === 'function' && !cond.many;
  while (true) {
    if (isPlainFn) {
      if (!cond(ctx)) break;
      results.push(ctx.next());
    } else {
      const res = runWithBacktrack(ctx, cond);
      if (res === null || res === undefined) break;
      results.push(res);
    }
  }
  return results;
});

const untilLoop = (cond) => decorateCombinator((ctx) => {
  const results = [];
  const isPlainFn = typeof cond === 'function' && !cond.many;
  while (true) {
    if (isPlainFn) {
      if (cond(ctx)) break;
      results.push(ctx.next());
    } else {
      const res = runWithBacktrack(ctx, cond);
      if (res !== null && res !== undefined) break;
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
  const res = runWithBacktrack(ctx, combinator);
  ctx.index = start;
  return res !== null ? res : null;
});

const peek = lookahead;

// ==========================================
// Parser-Helfer
// ==========================================

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
  if (first === null || first === undefined) return results;
  results.push(first);

  while (true) {
    const start = ctx.index;
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

// ==========================================
// Transformation
// ==========================================

const map = (combinator, fn) => decorateCombinator((ctx) => {
  const res = combinator(ctx);
  if (res === null || res === undefined) return null;
  return fn(res, ctx);
});

const capture = (combinator, name) => decorateCombinator((ctx) => {
  const res = combinator(ctx);
  if (res === null || res === undefined) return null;
  return { [name]: res };
});

const node = (combinator, type) => decorateCombinator((ctx) => {
  const start = ctx.index;
  const res = combinator(ctx);
  if (res === null || res === undefined) return null;

  const nodeObj = {
    type,
    start,
    end: ctx.index
  };

  if (Array.isArray(res)) {
    let hasObjects = false;
    const merged = {};
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

// ==========================================
// Utilities
// ==========================================

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
    const index = ctx.index;

    if (instanceCache.has(index)) {
      const entry = instanceCache.get(index);
      if (entry.success) {
        ctx.index = entry.endPos;
        return entry.result;
      }
      return null;
    }

    const res = runWithBacktrack(ctx, combinator);
    if (res !== null && res !== undefined) {
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
  const res = combinator(ctx);
  if (res !== null && res !== undefined) {
    console.log(`[DEBUG] ✓ Success: "${name}" von ${start} bis ${ctx.index}. Ergebnis:`, res);
  } else {
    console.log(`[DEBUG] ✗ Failed: "${name}" bei Index ${start}`);
  }
  return res;
});

// Exporte
export {
  rule,
  consume,
  match,
  check,
  parse,
  call,
  custom,
  seq,
  choice,
  optional,
  repeat,
  many,
  many1,
  whileLoop as while,
  untilLoop as until,
  not,
  lookahead,
  peek,
  wrapped,
  separated,
  map,
  capture,
  node,
  lazy,
  memo,
  named,
  debug
};
