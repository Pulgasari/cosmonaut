// @cosmonaut/combinators

// :::::: IMPORTS

import { isFn, isNullish, isSymbol } from '@cosmonaut/utils/internals';

// :::::: MAGIC EXPORTS

const rule = new Proxy({}, {
  get: (target, prop) => isSymbol(prop) ? target[prop] : createLazyRule(prop)
});

// 2. Die "parse" Basis-Funktion für dynamische Direktaufrufe: parse('Expression', 4)
const parseBase = (ruleName, ...args) => decorateCombinator((p) => {
  if (isFn(p[ruleName])) return p[ruleName](...args);
  if (isFn(p.parse))     return p.parse(ruleName, ...args);
  throw new Error(`Regel "${ruleName}" existiert nicht auf dem Parser-Kontext.`);
});

// Das "parse" Proxy (erlaubt sowohl Direktaufruf als auch Property-Zugriff!)
const parse = new Proxy (parseBase, {
  get: (target, prop) => (prop in target || isSymbol(prop)) ? target[prop] : createLazyRule(prop)
});

// ::: Primitives

const call    = (fn)      => decorateCombinator(p => fn(p));
const check   = (pattern) => decorateCombinator(p => p.check(pattern) ? p.peek() : null);
const consume = (value)   => decorateCombinator(p => p.consume(value));
const match   = (pattern) => decorateCombinator(p => p.match(pattern));

// ::: Flow

const choice = (...combinators) => {
  const flat = combinators.flat();
  decorateCombinator((p) => {
    for (const combinator of flat) {
      const result = runWithBacktrack(p, combinator);
      if (!isNullish(res)) return result;
    }
    return null;
  });
};

const seq = (...combinators) => {
  const flat = combinators.flat();
  return decorateCombinator((ctx) => {
    const start   = ctx.index;
    const results = [];
    const len     = flat.length;
    for (let i = 0; i < len; i++) { // Klassischer Loop ist schneller als for...of
      const res = flat[i](ctx);
      if (isNullsih(res) || ctx.failed) {
        ctx.index = start;
        return null;
      }
      results.push(res);
    }
    return results;
  });
};

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
  
  if (isFn(cond) && !cond.many) {
    while (!cond(ctx)) results.push(ctx.next());
    return results;
  }

  while (true) {
    const res = runWithBacktrack(ctx, cond);
    if (!isNullish(res)) break;
    results.push(ctx.next());
  }
  
  return results;
});

const not = (combinator) => decorateCombinator((p) => {
  const res = runWithBacktrack(p, combinator);
  return res === null ? true : null;
});

const lookahead = (combinator) => decorateCombinator((p) => {
  const start = p.index;
  const res   = runWithBacktrack(p, combinator);
  p.index = start;
  return res ?? null;
});


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

const capture = (combinator, name) => decorateCombinator(p => {
  const res = combinator(p);
  return isNullish(res) ? null : { [name]: res };
});

const node = (combinator, type) => decorateCombinator(p => {
  const start = p.index;
  const res   = combinator(ctx);
  if (isNullish(res)) return null;

  const nodeObj = { type, start, end: p.index };

  if (isArray(res)) {
    let hasObjects = false;
    let merged     = {};
    for (const item of res) {
      if (item && isObjectitem)) {
        Object.assign(merged, item);
        hasObjects = true;
      }
    }
    if (hasObjects) {
      Object.assign(nodeObj, merged);
    } else {
      nodeObj.children = res;
    }
  } 
  else if (isObject(res)) Object.assign(nodeObj, res);
  else                    nodeObj.value = res;

  return nodeObj;
});

// ::: Utilities

const lazy = (fn) => decorateCombinator((p) => {
  const resolved = fn();
  return resolved(p);
});

const memo = (combinator) => decorateCombinator((p) => {
  p.memoCache ??= new Map;
  
  let ruleCache = p.memoCache.get(combinator);
  if (!ruleCache) {
    ruleCache = new Map;
    p.memoCache.set(combinator, ruleCache);
  }

  const index = p.index;
  const entry = ruleCache.get(index);
  
  if (entry !== undefined) {
    if (entry.success) {
      p.index = entry.endPos;
      return entry.result;
    }
    return null;
  }

  const result = runWithBacktrack(p, combinator);
  if (!isNullish(result)) {
    ruleCache.set(index, { success: true, result, endPos: p.index });
    return result;
  } else {
    ruleCache.set(index, { success: false });
    return null;
  }
});

const named = (combinator, name) => {
  const named = decorateCombinator(p => combinator(p));
  named.displayName = name;
  return named;
};

const debug = (combinator, message = '') => decorateCombinator((ctx) => {
  const name = message || combinator.displayName || 'unnamed';
  console.log(`[DEBUG] → Enter: "${name}" bei Index ${ctx.index}`);
  const start = ctx.index;
  const res   = combinator(ctx);
  !isNullish(res) ? console.log(`[DEBUG] ✓ Success: "${name}" von ${start} bis ${ctx.index}. Ergebnis:`, res)
                  : console.log(`[DEBUG] ✗ Failed: "${name}" bei Index ${start}`);
  return res;
});

// ::: Aliases

const custom = call;
const expect = match;
const is     = check;
const peek   = lookahead;

// ::: Exports

export {
  call, capture, check, choice, consume, custom,
  debug,
  expect,
  is,
  lazy, lookahead,
  many, many1, map, match, memo,
  named, node, not,
  optional,
  parse, peek,
  repeat, rule,
  separated, seq,
  untilLoop as until,
  whileLoop as while, wrapped,
};

// ::: Helpers for Lazy Rules

// Erzeugt einen Kombinator, der sowohl direkt als ParserFn genutzt
// als auch als Funktion mit Argumenten aufgerufen werden kann.
function createLazyRule (name) {
  const runRule = (p, args = []) => {
    if (isFn(p[name])) return p[name](...args);
    if (isFn(p.parse)) return p.parse(name, ...args);
    throw new Error(`Regel "${name}" existiert nicht auf dem Parser-Kontext.`);
  };

  const defaultCombinator =              decorateCombinator((p) => runRule(p));
  const ruleBuilder       = (...args) => decorateCombinator((p) => runRule(p, args));

  return new Proxy (defaultCombinator, {
    apply: (target, thisArg, args) => ruleBuilder(...args)
  });
}

// Hilfsfunktion: Führt einen Kombinator aus und setzt bei Fehlern/Exceptions den Index zurück.
function runWithBacktrack (p, combinator) {
  const startPos = p.index;
  const result   = combinator(p);
  if (isNullish(result) || p.failed) {
    p.index = startPos;
    return null;
  }
  return result;
}

const combinatorPrototype = {
  capture  (name)  { return capture  (this, name);  },
  many     ()      { return many     (this);        },
  many1    ()      { return many1    (this);        },
  map      (mapFn) { return map      (this, mapFn); },
  node     (type)  { return node     (this, type);  },
  optional ()      { return optional (this);        },
  repeat   (n)     { return repeat   (this, n);     },
};

function decorateCombinator (fn) {
  Object.setPrototypeOf(fn, combinatorPrototype);
  return fn;
}











import { call } from '@cosmonaut/combinators';

function listLoop (inner, separator, closeToken, trailing) {
  return call((p) => {
    const elements = [];

    if (p.is(closeToken)) return elements;
    

    do {
      if (p.check(closeToken)) break; // trailing comma erlaubt

      const element = inner(p);
      if (element === null || p.failed) return null;

      elements.push(element);

      if (!p.match(separator)) break;

      if (!trailing && p.check(closeToken)) throw new Error('Trailing separator nicht erlaubt');
    } while (!p.check(closeToken));

    return elements;
  });
}

function resolveWrapper (ctx, wrapper) {
  if (!wrapper) return [null, null];
  const pair = p._wrappers?.[wrapper];
  if (!pair) throw new Error(`Wrapper "${wrapper}" nicht gefunden.`);
  return pair; // [openToken, closeToken]
}

import { seq, optional, consume } from '@cosmonaut/combinators';

function listWithWrapper (inner, wrapper, closeToken, separator, trailing) {
  return call(p => {
    const [open, close] = resolveWrapper(p, wrapper);
    const actualClose = close ?? closeToken;

    if (!actualClose) throw new Error('Kein schließendes Token definiert');

    // 1. Optionales öffnendes Token
    if (open) p.consume(open);

    // 2. Liste parsen
    const elements = listLoop(inner, separator, actualClose, trailing)(ctx);
    if (elements === null) return null;

    // 3. Schließendes Token konsumieren
    if (open) p.consume(close); // close ist hier definiert, weil open gesetzt war
    // (oder wenn closeToken, dann konsumiere das)

    return elements;
  });
}




// for implementatio.

export function parseList (inner, options = {}) {
  const { wrapper = null, closeToken = null, separatorToken = ',', trailing = true } = options;
  return listWithWrapper (inner, wrapper, closeToken, separatorToken, trailing);
}


