// @cosmonaut/blocks/parser/transform.js

export const

capture = (parser, name) => decorate (state => {
  const result = parser(state);
  return result == null ? null : {[name]: result};
}),

filter = (parser, predicate) => decorate (state => {
  const result = parser(state);
  return result == null ? null : predicate(result, state) ? result : null;
}),

map = (parser, fn) => decorate (state => {
  const result = parser(state);
  return result == null ? null : fn(result, state);
}),

tap = (parser, fn) => decorate (state => {
  const result = parser(state);
  if (result != null) fn(result, state);
  return result;
}),

value = (parser, value) => decorate (state => {
  const result = parser(state);
  return result == null ? null : value;
});
