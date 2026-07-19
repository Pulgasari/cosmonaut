// @cosmonaut/parser/blocks/flow.js

import { backtrack, decorate } from './_internals.js';

export const
lazy     = parser => decorate (state => parser()(state)),
not      = parser => decorate (state => lookAhead(parser)(state) ? null : true),
optional = parser => decorate (state => backtrack(state, parser)),

between = (open, inner, close) => decorate (state => {
  const position = state.save();

  if (open(state) == null) {
    state.restore(position);
    return null;
  }

  const result = inner(state);

  if (result == null || close(state) == null) {
    state.restore(position);
    return null;
  }

  return result;
}),

choice = (...parsers) => decorate (state => {
  for (const parser of parsers.flat()) {
    const result = backtrack(state, parser);
    if (result != null) return result;
  }
  return null;
}),

cut = (parser, message) => decorate (state => {
  const result = parser(state);
  if (result != null) return result;

  message ??= "cut(): expected parser to succeed.";

  throw state.error
    ? state.error(message)
    : new Error(message);
}),

lookAhead = parser => decorate (state => {
  const position = state.save();
  const result   = parser(state);
  state.restore(position);
  return result;
}),

seq = (...parsers) => decorate (state => {
  const position = state.save();
  const results  = [];

  for (const parser of parsers.flat()) {
    const result = parser(state);
    if (result == null) {
      state.restore(position);
      return null;
    }
    results.push(result);
  }

  return results;
}),

skip = (parser, discarded) => decorate (state => {
  const position = state.save();
  const result   = parser(state);

  if (result == null || discarded(state) == null) {
    state.restore(position);
    return null;
  }

  return result;
}),

then = (discarded, parser) => decorate (state => {
  const position = state.save();

  if (discarded(state) == null) {
    state.restore(position);
    return null;
  }

  const result = parser(state);

  if (result == null) {
    state.restore(position);
    return null;
  }

  return result;
});

export const commit = cut;

