// @cosmonaut/parser/blocks/repeat.js

import { backtrack, decorate } from './_internals.js';

export const
atLeast = (parser, min) => times(parser, min, Infinity),
atMost  = (parser, max) => times(parser, 0, max),

many = parser => decorate (state => {
  const results = [];

  while (true) {
    const position = state.save();
    const result   = parser(state);

    if (result == null) {
      state.restore(position);
      break;
    }

    // infinite loop guard
    if (state.index === position) {
      throw new Error("many(): parser consumed no input.");
    }

    results.push(result);
  }

  return results;
}),

many1 = parser => decorate (state => {
  const first = parser(state);
  if (first == null) return null;

  const results = many(parser)(state);
  results.unshift(first);

  return results;
}),

repeat = (parser, count) => decorate (state => {
  const position = state.save();
  const results  = [];

  for (let i = 0; i < count; i++) {
    const result = parser(state);

    if (result == null) {
      state.restore(position);
      return null;
    }

    results.push(result);
  }

  return results;
}),

manyTill = (item, end) => decorate (state => {
  const results = [];

  while (true) {
    const position = state.save();
    if (end(state) != null) break;

    state.restore(position);

    const result = item(state);
    if (result == null) return null;

    // infinite loop guard
    if (state.index === position) {
      throw new Error("manyTill(): parser consumed no input.");
    }

    results.push(result);
  }

  return results;
}),

many1Till = (item, end) => decorate (state => {
  const first = item(state);
  if (first == null) return null;

  const results = manyTill(item, end)(state);
  results.unshift(first);

  return results;
}),

// sepBy/sepBy1 share a continuation loop (sepByRest) instead of sepBy1
// delegating to sepBy wholesale. Delegating "wholesale" would make sepBy
// re-attempt to match a FIRST item at whatever position sepBy1 already
// advanced past its own first item to (i.e. sitting on the SEPARATOR,
// not an item) - which fails immediately, silently truncating the result
// to just the first element. sepByRest never assumes anything about how
// its caller obtained `results`'s initial contents, so both variants can
// safely share it regardless of who matched the first item.
sepBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first == null) return [];
  return sepByRest(state, item, separator, [first]);
}),

sepBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;
  return sepByRest(state, item, separator, [first]);
}),

// sepEndBy/sepEndBy1 - same shared-continuation fix as sepBy/sepBy1 above.
sepEndBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first == null) return [];
  return sepEndByRest(state, item, separator, [first]);
}),

sepEndBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;
  return sepEndByRest(state, item, separator, [first]);
}),

// sepByLoose/sepBy1Loose - like sepBy/sepBy1, but the separator between
// elements is OPTIONAL rather than required (any gap may or may not have
// one). Same shared-continuation pattern as above, so sepBy1Loose doesn't
// repeat the sepBy1/sepEndBy1 bug from the start.
sepByLoose = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first == null) return [];
  return sepByLooseRest(state, item, separator, [first]);
}),

sepBy1Loose = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;
  return sepByLooseRest(state, item, separator, [first]);
}),

times = (parser, min, max = Infinity) => decorate (state => {
  const position = state.save();
  const results  = [];

  for (let i = 0; i < min; i++) {
    const result = parser(state);

    if (result == null) {
      state.restore(position);
      return null;
    }

    results.push(result);
  }

  while (results.length < max) {
    const position = state.save();
    const result   = parser(state);

    if (result == null) {
      state.restore(position);
      break;
    }

    // infinite loop guard
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
    if (backtrack(state, separator) == null) {
      state.restore(position);
      break;
    }
    const next = item(state);
    if (next == null) {
      state.restore(position);
      break;
    }
    results.push(next);
  }
  return results;
}

function sepEndByRest (state, item, separator, results) {
  while (true) {
    if (backtrack(state, separator) == null) break;
    const next = backtrack(state, item);
    if (next == null) break; // trailing separator allowed
    results.push(next);
  }
  return results;
}

function sepByLooseRest (state, item, separator, results) {
  while (true) {
    const position = state.save();
    backtrack(state, separator); // optional: consume if present, no-op otherwise
    const next = backtrack(state, item);
    if (next == null) {
      state.restore(position); // no item followed - undo any separator consumed speculatively
      break;
    }
    if (state.index === position) {
      throw new Error("sepByLoose(): parser consumed no input.");
    }
    results.push(next);
  }
  return results;
}
