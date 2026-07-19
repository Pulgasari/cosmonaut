// @cosmonaut/parser/blocks/flow.js

import { backtrack, decorate } from './_internals.js';

export const
lazy     = fn => decorate (parser => fn()(parser)),
not      = c  => decorate (parser => lookAhead(c)(parser) ? null : true),
optional = c  => decorate (parser => backtrack(parser, c)),
  
choice = (...list) => decorate(parser => {
  for (const c of list.flat()) {
    const result = backtrack(parser, c);
    if (result != null) return result;
  }
  return null;
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

between = (open, inner, close) => decorate (parser => {
  const pos = parser.save();

  if (open(parser) == null) {
    parser.restore(pos);
    return null;
  }

  const result = inner(parser);

  if (result == null) {
    parser.restore(pos);
    return null;
  }

  if (close(parser) == null) {
    parser.restore(pos);
    return null;
  }

  return result;
}),

skip = (parser, discarded) => decorate (state => {
  const pos    = state.save();
  const result = parser(state);

  if (result == null) {
    state.restore(pos);
    return null;
  }

  if (discarded(state) == null) {
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
}),

cut = (parser, message) => decorate (state => {
  const result = parser(state);

  if (result == null) throw state.error
    ? state.error (message ?? "cut(): expected parser to succeed.")
    : new Error   (message ?? "cut(): expected parser to succeed.");

  return result;
});

export const commit = cut;

