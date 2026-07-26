// @cosmonaut/blocks/parser/transform.js

import { decorate } from './_internals.js';

export const

capture = (parser, name) => decorate (state => {
  const result = parser(state);
  return result === undefined ? undefined : {[name]: result};
}),

filter = (parser, predicate) => decorate (state => {
  const result = parser(state);
  return result === undefined ? undefined : predicate(result, state) ? result : undefined;
}),

map = (parser, fn) => decorate (state => {
  const result = parser(state);
  return result === undefined ? undefined : fn(result, state);
}),

tap = (parser, fn) => decorate (state => {
  const result = parser(state);
  if (result !== undefined) fn(result, state);
  return result;
}),

value = (parser, value) => decorate (state => {
  const result = parser(state);
  return result === undefined ? undefined : value;
});
