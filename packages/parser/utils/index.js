// @cosmonaut/parser/utils.js

// :::::: IMPORTS & RE-EXPORTS

import * from '@cosmonaut/utils/internals';

export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';
export * from './chain.js';
export * from './parse.js';

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
      if (isString(candidate) && !isUpperCase(candidate)) {
        return p.parse(candidate);
      }
      if (p.check(candidate)) return p.consume(candidate).value;
    }
    throw p.error(`Erwarte eines von [${candidates.join(', ')}]`);
  };
}

const TYPE_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;
export function resolveTokenSpec (spec, tokenMap) {
  if (isString(spec)) {
    const eq = spec.indexOf('=');
    if (eq > 0 && TYPE_NAME_RE.test(spec.slice(0, eq))) {
      return { type: spec.slice(0, eq), value: spec.slice(eq + 1) };
    }

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
