// @cosmonaut/parser/blocks/chain.js

import { decorate } from './_internals.js';

export const

chain = (parser, fn) => decorate (state => {
  const position = state.save();
  const result   = parser(state);

  if (result == null) {
    state.restore(position);
    return null;
  }

  const next = fn(result, state)(state);

  if (next == null) {
    state.restore(position);
    return null;
  }

  return next;
}),

chain1 = (parser, fn) => decorate (state => {
  const position = state.save();
  const first    = parser(state);

  if (first == null) {
    state.restore(position);
    return null;
  }

  const results = [first];
  let current   = first;

  while (true) {
    const position = state.save();
    const next     = fn(current, state)(state);

    if (next == null) {
      state.restore(position);
      break;
    }

    // infinite loop guard
    if (state.index === position) {
      throw new Error("chain1(): parser consumed no input.");
    }

    results.push(next);
    current = next;
  }

  return results;
}),

chainl1 = (operand, operator, build) => decorate (state => {
  let left = operand(state);

  if (left == null) return null;

  while (true) {
    const position = state.save();
    const op       = operator(state);

    if (op == null) {
      state.restore(position);
      break;
    }

    const right = operand(state);

    if (right == null) {
      state.restore(position);
      break;
    }

    left = build(left, op, right);
  }

  return left;
}),

chainr1 = (operand, operator, build) => decorate (state => {
  const left = operand(state);

  if (left == null) return null;

  const position = state.save();
  const op       = operator(state);

  if (op == null) {
    state.restore(position);
    return left;
  }

  const right = chainr1(operand, operator, build)(state);

  if (right == null) {
    state.restore(position);
    return left;
  }

  return build(left, op, right);
});
