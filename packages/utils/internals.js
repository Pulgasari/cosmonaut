// @cosmonaut/utils/internals

export const arrayfied = sth => Array.isArray(sth) ? sth : [sth];

export const isArray     = sth => Array.isArray(sth);
export const isDefined   = sth => sth !== undefined;
export const isFalsy     = sth => !sth;
export const isFn        = sth => typeof sth === 'function';
export const isFunction  = sth => typeof sth === 'function';
export const isNullish   = sth => sth == null;
export const isObject    = sth => typeof sth === 'object' && typeof sth !== 'null';
export const isTruthy    = sth => !!sth;
export const isUndefined = sth => sth === undefined;

export const isString = (sth, length) => {
  return length
    ? typeof sth === 'string' && sth.length === length
    : typeof sth === 'string';
}
