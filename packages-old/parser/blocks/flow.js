// @cosmonaut/parser/blocks/flow.js

// `undefined` is the failure sentinel throughout - see ParserState.js's
// file header. optional() is the one place that explicitly converts a
// failure (undefined) into a successful null value - everything else
// here just propagates undefined-on-failure transparently.

import { backtrack, decorate } from './internals.js';

export const
lazy     = parser => decorate (state => parser()(state)),
not      = parser => decorate (state => lookAhead(parser)(state) === undefined ? true : undefined),

// The ONE place `undefined` (fail) becomes `null` (succeeded, no match) -
// this is what lets seq()/etc downstream correctly distinguish "this
// optional part legitimately matched nothing" from "something failed".
optional = parser => decorate (state => {
  const result = backtrack(state, parser);
  return result === undefined ? null : result;
}),

between = (open, inner, close) => decorate (state => {
  const position = state.save();

  if (open(state) === undefined) {
    state.restore(position);
    return undefined;
  }

  const result = inner(state);

  if (result === undefined || close(state) === undefined) {
    state.restore(position);
    return undefined;
  }

  return result;
}),

choice = (...parsers) => decorate (state => {
  for (const parser of parsers.flat()) {
    const result = backtrack(state, parser);
    if (result !== undefined) return result;
  }
  return undefined;
}),

cut = (parser, message) => decorate (state => {
  const result = parser(state);
  if (result !== undefined) return result;

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
    if (result === undefined) {
      state.restore(position);
      return undefined;
    }
    results.push(result);
  }

  return results;
}),

skip = (parser, discarded) => decorate (state => {
  const position = state.save();
  const result   = parser(state);

  if (result === undefined || discarded(state) === undefined) {
    state.restore(position);
    return undefined;
  }

  return result;
}),

then = (discarded, parser) => decorate (state => {
  const position = state.save();

  if (discarded(state) === undefined) {
    state.restore(position);
    return undefined;
  }

  const result = parser(state);

  if (result === undefined) {
    state.restore(position);
    return undefined;
  }

  return result;
});

export const commit = cut;
