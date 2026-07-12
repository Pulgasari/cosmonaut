// @cosmonaut/utils

// :::::: POLYFILLS

// RegExp.escape
if (!RegExp.escape) {
  RegExp.escape = function (s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
}

// ::::::

export const ensureArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split('');
  if (value && typeof value === 'object') return Object.keys(value);
  return [];
};

export const escapedRegExp = (str, flags = '') => {
  return new RegExp(RegExp.escape(String(str)), flags);
};

export const makeStickyRegex = (pattern, flags = '') => {
  const f = flags.includes('y') ? flags : flags + 'y';
  return (pattern instanceof RegExp)
    ? new RegExp(pattern.source, Array.from(new Set((pattern.flags || '') + f)).join(''))
    : new RegExp(pattern, f);
};

export const mergeOptions = (user = {}, defaults = {}) => {
  const merged = { ...defaults, ...user };
  for (const key of Object.keys(defaults)) {
    if (user[key] === undefined) merged[key] = defaults[key];
  }
  return merged;
};

// :::::: Namespaced Lazy-Getter/Callable-Factory
//
// Baut aus einem oder mehreren Quell-Modulen ein Objekt, bei dem jeder Export mit
// gegebenem 'prefix' (z.B. 'parse'/'generate') unter seinem entprefixten Namen
// verfügbar wird:
//   - Nullary-Funktionen (.length === 0) -> Getter, sofort ausgeführt bei Zugriff
//   - Funktionen mit Parametern          -> normale Methode, muss aufgerufen werden
//
// Wird vom Parser für 'parsed.X'/'parsed.X(args)' genutzt, ist aber bewusst generisch
// gehalten -> Generator/Transformer können exakt dasselbe Muster für ihre eigenen
// Dispatch-Namespaces nutzen (z.B. 'generated.X').

export function createEvilFactory ({ prefix, source, applyCaller = true }) {
  const sources   = Array.isArray(source) ? source : [source];
  const targetObj = {};

  sources.forEach(sourceObj => {
    for (const [key, body] of Object.entries(sourceObj)) {
      if (typeof body !== 'function' || !key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length);

      if (body.length === 0) {
        Object.defineProperty(targetObj, name, {
          get () { return body(); },
          enumerable: true,
        });
      } else {
        targetObj[name] = (...args) => body(...args);
      }
    }
  });

  if (applyCaller) targetObj.call = name => targetObj[name];

  return targetObj;
}
