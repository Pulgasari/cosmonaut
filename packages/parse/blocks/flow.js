// @cosmonaut/parser/blocks/flow.js

import { backtrack, decorate } from './_internals.js';

export const choice = (...list) => decorate(parser => {
  for (const c of list.flat()) {
    const result = backtrack(parser, c);
    if (result != null) return result;
  }
  return null;
});

export const lazy = fn => decorate(parser => {
  return fn()(parser);
});

export const lookAhead = c => decorate(parser => {
  const pos = parser.save();
  const result = c(parser);
  parser.restore(pos);
  return result;
});

export const not = c => decorate(parser => {
  return lookAhead(c)(parser) ? null : true;
});

export const optional = c => decorate(parser => {
    return backtrack(parser, c);
});

export const seq = (...list) => decorate(parser => {
  const pos = parser.save();
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
});

export const between = (open, inner, close) => decorate(parser => {
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
});

export const skip = (parser, discarded) => decorate(state => {
  const pos = state.save();
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
});

export const then = (discarded, parser) => decorate(state => {
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

// cut / commit ::: wraps a combinator such that a failure becomes a hard
// error (thrown) instead of a soft `null` (backtrackable). Since `choice`
// and `optional` only ever check for `null`, a thrown error propagates
// straight through them uncaught — exactly the "no more alternatives,
// this is a real syntax error now" semantics.

export const cut = (parser, message) => decorate(state => {
  const result = parser(state);

  if (result == null) {
    throw state.error
      ? state.error(message ?? "cut(): expected parser to succeed.")
      : new Error(message ?? "cut(): expected parser to succeed.");
  }

  return result;
});

export const commit = cut;
