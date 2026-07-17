// @cosmonaut/combinators

// :::::: HELPERS

const isNullish = (v) => v === null || v === undefined;
const isFn      = (v) => typeof v === 'function';
const isArray   = Array.isArray;
const isObject  = (v) => v !== null && typeof v === 'object';

function runWithBacktrack (p, combinator) {
  const startPos = p.index;
  const result   = combinator(p);
  if (isNullish(result) || p.failed) {
    p.index = startPos;
    return null;
  }
  return result;
}

/****************
c = combinator(s)
p = parser
*****************/

// ==================================
// LAYER 1: CORE PRIMITIVES ("ATOMS")
// ==================================

const consume = (expected) => decorateCombinator(p => {
  if (isFn(p.consume)) return p.consume(expected);
  // fallback for simple stream
  const token = p.peek?.();
  if (token && (token.type === expected || token.value === expected)) return p.next();
  return null;
});

const match = (expected) => decorateCombinator(p => {
  if (isFn(p.match)) return p.match(expected);
  // fallback for simple stream
  const token = p.peek?.();
  return token && (token.type === expected || token.value === expected) ? token : null;
});

const check = (expected) => decorateCombinator(p => {
  if (isFn(p.is)) return p.is(expected);
  const token = p.peek?.();
  return !!(token && (token.type === expected || token.value === expected));
});

const call = (combinator) => decorateCombinator(p => combinator(p));

const choice = (...combinators) => {
  const flat = combinators.flat();
  return decorateCombinator(p => {
    for (const combinator of flat) {
      const result = runWithBacktrack(p, combinator);
      if (!isNullish(result)) return result;
    }
    return null;
  });
};

const seq = (...combinators) => {
  const flat = combinators.flat();
  return decorateCombinator(p => {
    const start   = p.index;
    const results = [];
    for (const combinator of flat) {
      const result = combinator(p);
      if (isNullish(result) || p.failed) {
        p.index = start;
        return null;
      }
      results.push(result);
    }
    return results;
  });
};

const optional = (combinator) => decorateCombinator(p => {
  return runWithBacktrack(p, combinator) ?? null;
});

const not = (combinator) => decorateCombinator(p => {
  const res = runWithBacktrack(p, combinator);
  return res === null ? true : null;
});

const lookahead = (combinator) => decorateCombinator(p => {
  const start = p.index;
  const res   = runWithBacktrack(p, combinator);
  p.index = start;
  return res ?? null;
});

// ==========================================
// SCHICHT 2: ITERATION & FLOW (Die Schleifen)
// ==========================================

const repeat = (combinator, n) => decorateCombinator(p => {
  const start   = p.index;
  const results = [];
  for (let i = 0; i < n; i++) {
    const result = combinator(p);
    if (isNullish(result) || p.failed) {
      p.index = start;
      return null;
    }
    results.push(result);
  }
  return results;
});

const many  = combinator => repeat (combinator, 0);
const many1 = combinator => repeat (combinator, 1);

const many = (combinator) => decorateCombinator((p) => {
  const results = [];
  while (true) {
    const res = runWithBacktrack(p, combinator);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const many1 = (combinator) => decorateCombinator((p) => {
  const start = p.index;
  const first = combinator(p);
  if (isNullish(first) || p.failed) {
    p.index = start;
    return null;
  }
  const results = [first];
  while (true) {
    const res = runWithBacktrack(p, combinator);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const doWhile = (body, condition) => decorateCombinator(p => {
  const results = [];
  while (true) {
    const result = body(p);
    if (isNullish(result) || p.failed) return null;
    results.push(result);
    if (runWithBacktrack(p, condition) === null) break;
  }
  return results;
});

const untilLoop = (cond) => decorateCombinator(p => {
  const results = [];
  if (isFn(cond) && !cond.many) { // Schneller Pfad für Prädikate
    while (!cond(p)) results.push(p.next());
    return results;
  }
  while (true) {
    const result = runWithBacktrack(p, cond);
    if (!isNullish(result)) break;
    results.push(p.next());
  }
  return results;
});

const whileLoop = (cond) => decorateCombinator((p) => {
  const results = [];
  if (isFn(cond) && !cond.many) {
    while (cond(p)) results.push(p.next());
    return results;
  }
  while (true) {
    const res = runWithBacktrack(p, cond);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

// ==========================================
// SCHICHT 3: HIGH-LEVEL (Der Komfort)
// ==========================================

const wrapped = (open, inner, close) => decorateCombinator(p => {
  const start = p.index;
  if (open(p) === null || p.failed) return null;
  const result = inner(p);
  if (isNullish(result) || p.failed) { p.index = start; return null; }
  if (close(p) === null || p.failed) { p.index = start; return null; }
  return result;
});

const separated = (inner, separator) => decorateCombinator(p => {
  const results = [];
  const first   = runWithBacktrack(p, inner);
  if (isNullish(first)) return results;
  results.push(first);

  while (true) {
    const start = p.index;
    if (runWithBacktrack(p, separator) === null) break;
    
    const nextResult = runWithBacktrack(p, inner);
    if (isNullish(nextResult)) {
      p.index = start; // Zurücksetzen vor den Separator
      break;
    }
    results.push(nextResult);
  }
  return results;
});

/**
 * Der ultimative, universelle List-Kombinator.
 * Ersetzt listLoop, listWithWrapper und parseList komplett und arbeitet rein deklarativ!
 */
const list = (inner, separator, options = {}) => {
  const { open = null, close = null, trailing = true, allowEmpty = true } = options;

  const listBody = decorateCombinator(p => {
    const results = [];
    
    // Falls leerer Inhalt erlaubt ist und wir direkt das Schließ-Token sehen
    if (allowEmpty && close && lookahead(close)(p)) return results;

    const first = inner(p);
    if (isNullish(first) || p.failed) return allowEmpty ? results : null;
    results.push(first);

    while (true) {
      if (close && lookahead(close)(p)) break;

      const sepStart = p.index;
      if (runWithBacktrack(p, separator) === null) break;

      // Check auf Trailing Separator direkt vor dem Schließen
      if (close && lookahead(close)(p)) {
        if (!trailing) {
          p.index = sepStart; // Separator skippen, da nicht erlaubt
          return null;
        }
        break;
      }

      const next = inner(p);
      if (isNullish(next) || p.failed) {
        p.index = sepStart; // Rollback hinter das letzte valide Element
        break;
      }
      results.push(next);
    }
    return results;
  });

  return open && close ? wrapped(open, listBody, close) : listBody;
};

// ::: Transformationen

const map = (combinator, fn) => decorateCombinator(p => {
  const result = combinator(p);
  return isNullish(result) ? null : fn(result, p);
});

const capture = (combinator, name) => decorateCombinator(p => {
  const res = combinator(p);
  return isNullish(res) ? null : { [name]: res };
});

const node = (combinator, type) => decorateCombinator(p => {
  const start = p.index;
  const res   = combinator(p); // Bugfix: ctx -> p
  if (isNullish(res)) return null;

  const nodeObj = { type, start, end: p.index };

  if (isArray(res)) {
    let hasObjects = false;
    let merged     = {};
    for (const item of res) {
      if (item && isObject(item)) {
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

// ::: Utilities & Lazy Rules

const lazy = (fn) => decorateCombinator((p) => fn()(p));

const memo = (combinator) => decorateCombinator(p => {
  p.memoCache ??= new Map();
  let ruleCache = p.memoCache.get(combinator);
  if (!ruleCache) {
    ruleCache = new Map();
    p.memoCache.set(combinator, ruleCache);
  }

  const index = p.index;
  const entry = ruleCache.get(index);
  if (entry !== undefined) {
    if (entry.success) { p.index = entry.endPos; return entry.result; }
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
  const namedCombinator = decorateCombinator(p => combinator(p));
  namedCombinator.displayName = name;
  return namedCombinator;
};

const debug = (combinator, message = '') => decorateCombinator((ctx) => {
  const name = message || combinator.displayName || 'unnamed';
  console.log(`[DEBUG] → Enter: "${name}" bei Index ${ctx.index}`);
  const start = ctx.index;
  const res   = combinator(ctx);
  !isNullish(res) ? console.log(`[DEBUG] ✓ Success: "${name}" von ${start} bis ${ctx.index}.`, res)
                  : console.log(`[DEBUG] ✗ Failed: "${name}" bei Index ${start}`);
  return res;
});

function createLazyRule (name) {
  const runRule = (p, args = []) => {
    if (isFn(p[name])) return p[name](...args);
    if (isFn(p.parse)) return p.parse(name, ...args);
    throw new Error(`Regel "${name}" existiert nicht auf dem Parser-Kontext.`);
  };
  const defaultCombinator =              decorateCombinator((p) => runRule(p));
  const ruleBuilder       = (...args) => decorateCombinator((p) => runRule(p, args));

  return new Proxy(defaultCombinator, {
    apply: (target, thisArg, args) => ruleBuilder(...args)
  });
}

// ==========================================
// FLUENT API SYNTAX-SUGAR PROTOTYPE
// ==========================================

const combinatorPrototype = {
  capture  (name) { return capture  (this, name); },
  many     ()     { return many     (this);       },
  many1    ()     { return many1    (this);       },
  map      (fn)   { return map      (this, fn);   },
  node     (type) { return node     (this, type); },
  optional ()     { return optional (this);       },
  repeat   (n)    { return repeat   (this, n);    },

  // Das Herzstück des Chaining-Comforts
  get then () {
    const self = this;
    return new Proxy({}, {
      get(_, prop) {
        // Kern-Kombinatoren direkt als verkettete Funktion bereitstellen
        const builders = { capture, check, choice, consume, list, node, many, many1, map, match, optional, separated, seq, wrapped };
        if (prop in builders) return (...args) => seq(self, builders[prop](...args));

        // Lazy Rules dynamisch routen (z.B. .then.Statement)
        const lazyRule = createLazyRule(prop);
        const chain    = (...args) => seq(self, args.length ? lazyRule(...args) : lazyRule);

        // Der Rückgabewert ist sowohl ein ausführbarer Kombinator als auch als Funktion aufrufbar
        return new Proxy(decorateCombinator(p => chain()(p)), {
          apply(target, thisArg, args) { return chain(...args); },
          get(target, subProp) { return chain()[subProp]; }
        });
      }
    });
  }
};

function decorateCombinator (fn) {
  Object.setPrototypeOf(fn, combinatorPrototype);
  return fn;
}

// ::: Aliase & Exports
const custom = call; const expect = match; const is = check; const peek = lookahead;
const rule = createLazyRule; // Alias für einfachen Rule-Bezug im Root-Scope

export {
  call, capture, check, choice, consume, custom, debug, expect, is, lazy, lookahead,
  many, many1, map, match, memo, named, node, not, optional, peek, repeat, rule,
  separated, seq, untilLoop as until, whileLoop as while, wrapped, list, doWhile
};
