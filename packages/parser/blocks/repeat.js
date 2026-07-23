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

sepBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first == null) return [];
  const results = [first];

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
}),

sepBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;

  const results = sepBy(item, separator)(state);
  results.unshift(first);

  return results;
}),

sepBy1Loose = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;
  const results = [first];
  while (true) {
    const position = state.save();
    optional(separator)(state); // konsumieren falls vorhanden, sonst einfach weiter
    const next = item(state);
    if (next == null) { state.restore(position); break; }
    results.push(next);
  }
  return results;
}),

sepEndBy = (item, separator) => decorate (state => {
  const first = backtrack(state, item);
  if (first == null) return [];
  const results = [first];

  while (true) {
    if (backtrack(state, separator) == null) break;

    const next = backtrack(state, item);
    if (next == null) break; // trailing separator allowed

    results.push(next);
  }

  return results;
}),

sepEndBy1 = (item, separator) => decorate (state => {
  const first = item(state);
  if (first == null) return null;

  const results = sepEndBy(item, separator)(state);
  results.unshift(first);

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
