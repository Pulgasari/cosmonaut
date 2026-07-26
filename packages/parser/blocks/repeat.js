// @cosmonaut/parser/blocks/repeat.js

// `undefined` is the failure sentinel throughout - see ParserState.js's
// file header. The "always succeeds" combinators (many, sepBy, sepByLoose,
// sepEndBy, atMost) never return undefined themselves - worst case they
// return an empty array `[]`, which is a real, distinct value from both
// `null` and `undefined`. Only the "requires at least one" variants
// (many1, sepBy1, sepBy1Loose, sepEndBy1, many1Till) can return undefined,
// when even the first required match fails.

import { backtrack, decorate } from './_internals.js';

export const
atLeast = (parser, min) => times(parser, min, Infinity),
atMost  = (parser, max) => times(parser, 0, max),

many = parser => decorate (state => {
  const results = [];

  while (true) {
    const position = state.save();
    const result   = parser(state);

    if (result === undefined) {
      state.restore(position);
      break;
    }

    if (state.index === position) {
      throw new Error("many(): parser consumed no input.");
    }

    results.push(result);
  }

  return results;
}),

many1 = parser => decorate (state => {
  const first = parser(state);
  if (first === undefined) return undefined;

  const results = many(parser)(state);
  results.unshift(first);

  return results;
}),

repeat = (parser, count) => decorate (state => {
  const position = state.save();
  const results  = [];

  for (let i = 0; i < count; i++) {
    const result = parser(state);

    if (result === undefined) {
      state.restore(position);
      return undefined;
    }

    results.push(result);
  }

  return results;
}),

sepBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first === undefined) return [];
  return sepByRest(state, item, separator, [first]);
}),

sepBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first === undefined) return undefined;
  return sepByRest(state, item, separator, [first]);
}),

sepEndBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first === undefined) return [];
  return sepEndByRest(state, item, separator, [first]);
}),

sepEndBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first === undefined) return undefined;
  return sepEndByRest(state, item, separator, [first]);
}),

sepByLoose = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first === undefined) return [];
  return sepByLooseRest(state, item, separator, [first]);
}),

sepBy1Loose = (item, separator) => decorate (state => {
  const first = item(state);
  if (first === undefined) return undefined;
  return sepByLooseRest(state, item, separator, [first]);
}),

manyTill = (item, end) => decorate (state => {
  const results = [];

  while (true) {
    const position = state.save();
    if (end(state) !== undefined) break;

    state.restore(position);

    const result = item(state);
    if (result === undefined) return undefined;

    if (state.index === position) {
      throw new Error("manyTill(): parser consumed no input.");
    }

    results.push(result);
  }

  return results;
}),

many1Till = (item, end) => decorate (state => {
  const first = item(state);
  if (first === undefined) return undefined;

  const results = manyTill(item, end)(state);
  results.unshift(first);

  return results;
}),

times = (parser, min, max = Infinity) => decorate (state => {
  const position = state.save();
  const results  = [];

  for (let i = 0; i < min; i++) {
    const result = parser(state);

    if (result === undefined) {
      state.restore(position);
      return undefined;
    }

    results.push(result);
  }

  while (results.length < max) {
    const position = state.save();
    const result   = parser(state);

    if (result === undefined) {
      state.restore(position);
      break;
    }

    if (state.index === position) {
      throw new Error("times(): parser consumed no input.");
    }

    results.push(result);
  }

  return results;
});

// :::::: internal continuation helpers - not exported

function sepByRest (state, item, separator, results) {
  while (true) {
    const position = state.save();

    if (backtrack(state, separator) === undefined) {
      state.restore(position);
      break;
    }

    const next = item(state);

    if (next === undefined) {
      state.restore(position);
      break;
    }

    results.push(next);
  }

  return results;
}

function sepEndByRest (state, item, separator, results) {
  while (true) {
    if (backtrack(state, separator) === undefined) break;

    const next = backtrack(state, item);
    if (next === undefined) break; // trailing separator allowed

    results.push(next);
  }

  return results;
}

function sepByLooseRest (state, item, separator, results) {
  while (true) {
    const position = state.save();

    backtrack(state, separator); // optional: consume if present, no-op otherwise

    const next = backtrack(state, item);

    if (next === undefined) {
      state.restore(position);
      break;
    }

    if (state.index === position) {
      throw new Error("sepByLoose(): parser consumed no input.");
    }

    results.push(next);
  }

  return results;
}
