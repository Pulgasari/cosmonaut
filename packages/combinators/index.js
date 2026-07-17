const combinator of flat) {
      const result = runWithBacktrack(p, combinator);
      if (!isNullish(res)) return result;
    }
    return null;
  });
};

const seq = (...combinators) => {
  const flat = combinators.flat();
  return decorateCombinator(p => {
    const start   = p.index;
    const results = [];
    const len     = flat.length;
    for (let i = 0; i < len; i++) {
      const result = flat[i](p);
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

const untilLoop = (cond) => decorateCombinator(p => {
  const results = [];
  
  if (isFn(cond) && !cond.many) {
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


// ::: Parser Helpers

const separated = (inner, seperator) => decorateCombinator(p => {
  const results = [];
  const first   = runWithBacktrack(p, inner);
  if (isNullish(first)) return results;
  results.push(first);

  while (true) {
    const start     = p.index;
    const sepResult = runWithBacktrack(p, seperator);
    if (sepResult === null) break;

    const nextResult = runWithBacktrack(p, inner);
    if (nextResult === null) {
      p.index = start;
      break;
    }
    results.push(nextResult);
  }
  
  return results;
});

const wrapped = (open, inner, close) => decorateCombinator(p => {
  const start = p.index;
  if (open(p) === null) return null;
  const result = inner(p);
  if (result === null || p.failed) {
    p.index = start;
    return null;
  }
  if (close(p) === null) {
    p.index = start;
    return null;
  }
  return result;
});

// ::: Transformation

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

const memo = (combinator) => decorateCombinator(p => {
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











const doWhile = (body, condition) => call(p => {
  const results = [];
  let keepGoing;
  do {
    const result = body(p);
    if (result === null || p.failed) return null;
    results.push(result);
    keepGoing = condition(p) === true; // condition is a combinator returning true/false
  } while (keepGoing);
  return results;
});

const listLoop = (inner, separator, close, trailing) => call(p => {
  const elements = [];
    
  if (p.is(close)) return elements;
  do {
    if (p.is(close)) break; // trailing comma erlaubt

    const element = inner(p);
    if (element === null || p.failed) return null;
    elements.push(element);

    if (!p.match(separator)) break;
    if (!trailing && p.is(close)) throw new Error('Trailing separator nicht erlaubt');
  } 
  while (!p.is(close));

  return elements;
});

function resolveWrapper (p, wrapper) {
  if (!wrapper) return [null, null];
  const pair = p._wrappers?.[wrapper];
  if (!pair) throw new Error(`Wrapper "${wrapper}" nicht gefunden.`);
  return pair; // [openToken, closeToken]
}

const listWithWrapper = (inner, wrapper, seperator, trailing) => call(p => {
  const [open, close] = resolveWrapper(p, wrapper);

  // opening token
  if (open && close) p.consume(open);

  // parse list body
  const elements = listLoop(inner, separator, close, trailing)(p);
  if (elements === null) return null;

  // closening token
  if (open && close) p.consume(close);

  // done!
  return elements;
});

const withWrapper = (inner, wrapper) => call(p => {
  const [open, close] = resolveWrapper(p, wrapper);

  // opening token
  if (open && close) p.consume(open);

  // parse body
  const result = inner(p);
  if (result === null || p.failed) return null;

  // closening token
  if (open && close) p.consume(close);

  // done
  return result;
});






// for implementation in the other one

export function parseList (inner, options = {}) {
  const { wrapper = null, closeToken = null, separatorToken = ',', trailing = true } = options;
  return listWithWrapper (inner, wrapper, closeToken, separatorToken, trailing);
}

export function parseList2 (inner, options = {}) {
  const { wrapper = null, close = null, separator = ',', trailing = true } = options;
  // with wrapper
  return withWrapper(
    listLoop (inner, separator, close, trailing), 
    wrapper
  )(p);
  // without wrapper
  return listLoop (inner, separator, close, trailing);
}


