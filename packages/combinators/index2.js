// @cosmonaut/combinators

// :::::: HELPERS

const isArray   = Array.isArray;
const isFn      = (v) => typeof v === 'function';
const isNullish = (v) => v === null || v === undefined;
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

// ==================================
// LAYER 1: CORE PRIMITIVES ("ATOMS")
// ==================================

const call     = c => decorate(c);
const not      = c => decorate(p => runWithBacktrack(p,c) == null ? true : null);
const optional = c => decorate(p => runWithBacktrack(p,c) ?? null);

const consume = (expected) => decorate(p => {
  if (isFn(p.consume)) return p.consume(expected);
  // fallback for simple stream
  const token = p.peek?.();
  if (token && (token.type === expected || token.value === expected)) return p.next();
  return null;
});

const match = (expected) => decorate(p => {
  if (isFn(p.match)) return p.match(expected);
  // fallback for simple stream
  const token = p.peek?.();
  return token && (token.type === expected || token.value === expected) ? token : null;
});

const check = (expected) => decorate(p => {
  if (isFn(p.is)) return p.is(expected);
  const token = p.peek?.();
  return !!(token && (token.type === expected || token.value === expected));
});

const choice = (...combinators) => {
  const flat = combinators.flat();
  return decorate (p => {
    for (const combinator of flat) {
      const result = runWithBacktrack(p, combinator);
      if (!isNullish(result)) return result;
    }
    return null;
  });
};

const seq = (...combinators) => {
  const flat = combinators.flat();
  return decorate(p => {
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

const lookahead = c => decorate(p => {
  const start  = p.index;
  const result = runWithBacktrack(p,c);
  p.index = start;
  return result ?? null;
});

// :::::: FLOW & LOOPS

const repeat = (c,n) => decorate(p => {
  const start   = p.index;
  const results = [];
  for (let i = 0; i < n; i++) {
    const result = c(p);
    if (isNullish(result) || p.failed) {
      p.index = start;
      return null;
    }
    results.push(result);
  }
  return results;
});

const many  = c => repeat (c, 0);
const many1 = c => repeat (c, 1);

const many = c => decorate((p) => {
  const results = [];
  while (true) {
    const res = runWithBacktrack(p,c);
    if (isNullish(res)) break;
    results.push(res);
  }
  return results;
});

const many1 = c => decorate((p) => {
  const start = p.index;
  const first = c(p);
  if (isNullish(first) || p.failed) {
    p.index = start;
    return null;
  }
  const results = [first];
  while (true) {
    const result = runWithBacktrack(p,c);
    if (isNullish(result)) break;
    results.push(result);
  }
  return results;
});

const doWhile = (body, condition) => decorate(p => {
  const results = [];
  while (true) {
    const result = body(p);
    if (isNullish(result) || p.failed) return null;
    results.push(result);
    if (runWithBacktrack(p, condition) === null) break;
  }
  return results;
});

const untilLoop = (cond) => decorate(p => {
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

const whileLoop = (cond) => decorate(p => {
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

const wrapped = (open, inner, close) => decorate(p => {
  const start = p.index;
  if (open(p) === null || p.failed) return null;
  const result = inner(p);
  if (isNullish(result) || p.failed) { p.index = start; return null; }
  if (close(p) === null || p.failed) { p.index = start; return null; }
  return result;
});

const separated = (inner, separator) => decorate(p => {
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
const list = (inner, options = {}) => {
  const { open = null, close = null, separator = ',', trailing = true, allowEmpty = true } = options;

  const listBody = decorate(p => {
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
        if (!trailing) { p.index = sepStart; return null; } // Separator skippen, da nicht erlaubt
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

const map = (c, fn) => decorate (p => {
  const result = c(p);
  return isNullish(result) ? null : fn(result, p);
});

const capture = (c, name) => decorate (p => {
  const result = c(p);
  return isNullish(result) ? null : { [name]: result };
});

const node = (c, type) => decorate (p => {
  const start = p.index;
  const res   = c(p);
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
    if (hasObjects) Object.assign(nodeObj, merged);
    else            nodeObj.children = res;
  } 
  else if (isObject(res)) Object.assign(nodeObj, res);
  else                    nodeObj.value = res;

  return nodeObj;
});

// ::: Utilities & Lazy Rules

const lazy = fn => decorate(p => fn()(p));

const memo = c => decorate (p => {
  p.memoCache ??= new Map;
  let ruleCache = p.memoCache.get(c);
  if (!ruleCache) {
    ruleCache = new Map;
    p.memoCache.set(c, ruleCache);
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

  const result = runWithBacktrack(p,c);
  if (!isNullish(result)) {
    ruleCache.set(index, { success: true, result, endPos: p.index });
    return result;
  } else {
    ruleCache.set(index, { success: false });
    return null;
  }
});

const named = (c, name) => {
  const namedCombinator = decorate(p => c(p));
  namedCombinator.displayName = name;
  return namedCombinator;
};

const debug = (c, message = '') => decorate (p => {
  const name = message || c.displayName || 'unnamed';
  console.log(`[DEBUG] → Enter: "${name}" bei Index ${p.index}`);
  const start  = p.index;
  const result = c(p);
  !isNullish(result) ? console.log(`[DEBUG] ✓ Success: "${name}" von ${start} bis ${p.index}.`, result)
                     : console.log(`[DEBUG] ✗ Failed: "${name}" bei Index ${start}`);
  return res;
});

function createLazyRule (name) {
  const runRule = (p, args = []) => {
    if (isFn(p[name])) return p[name](...args);
    if (isFn(p.parse)) return p.parse(name, ...args);
    throw new Error(`Regel "${name}" existiert nicht auf dem Parser-Kontext.`);
  };
  const defaultCombinator =              decorate(p => runRule(p));
  const ruleBuilder       = (...args) => decorate(p => runRule(p, args));

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
        return new Proxy(decorate( p => chain()(p) ), {
          apply (target, thisArg, args) { return chain(...args); },
          get   (target, subProp)       { return chain()[subProp]; }
        });
      }
    });
  }
};

function decorate (c) {
  Object.setPrototypeOf(c, combinatorPrototype);
  return c;
}

// ::: Aliase & Exports
const custom = call; 
const expect = match; 
const is     = check;
const peek   = lookahead;
const rule   = createLazyRule;

export {
  call, capture, check, choice, consume, custom,
  debug, doWhile,
  expect, 
  is, 
  lazy, list, lookahead,
  many, many1, map, match, memo, 
  named, node, not, 
  optional, 
  peek, 
  repeat, rule,
  separated, seq, 
  untilLoop as until, 
  whileLoop as while, wrapped,
};
