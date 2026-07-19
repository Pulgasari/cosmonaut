// @cosmonaut/parser/blocks/flow.js

import { backtrack, decorate } from './_internals.js';

export const
lazy     = fn => decorate (parser => fn()(parser)),
not      = c  => decorate (parser => lookAhead(c)(parser) ? null : true),
optional = c  => decorate (parser => backtrack(parser, c)),

between = (open, inner, close) => decorate (state => {
  const pos = state.save();

  if (open(state) == null) {
    state.restore(pos);
    return null;
  }

  const result = inner(state);

  if (result == null || close(state) == null) {
    state.restore(pos);
    return null;
  }

  return result;
}),

choice = (...list) => decorate (parser => {
  for (const c of list.flat()) {
    const result = backtrack(parser, c);
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

lookAhead = c => decorate (parser => {
  const pos    = parser.save();
  const result = c(parser);
  parser.restore(pos);
  return result;
}),

seq = (...list) => decorate (parser => {
  const pos     = parser.save();
  const results = [];

  for (const c of list.flat()) {
    const result = c(parser);
    if (result == null) {
      parser.restore(pos);
      return null;
    }
    results.push(result);
  }

  return results;
}),

skip = (parser, discarded) => decorate (state => {
  const pos    = state.save();
  const result = parser(state);

  if (result == null || discarded(state) == null) {
    state.restore(pos);
    return null;
  }

  return result;
}),

then = (discarded, parser) => decorate (state => {
  const pos = state.save();

  if (discarded(state) == null) {
    state.restore(pos);
    return null;
  }

  const result = parser(state);

  if (result == null) {
    state.restore(pos);
    return null;
  }

  return result;
});

export const commit = cut;

