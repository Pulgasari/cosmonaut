// @cosmonaut/parser/blocks/chain.js

import { decorate } from './_internals.js';

export const chain = (parser, fn) => decorate(state => {
  const pos = state.save();
  const result = parser(state);

  if (result == null) {
    state.restore(pos);
    return null;
  }

  const next = fn(result, state)(state);

  if (next == null) {
    state.restore(pos);
    return null;
  }

  return next;
});

export const chain1 = (parser, fn) => decorate(state => {
  const start = state.save();
  const first = parser(state);

  if (first == null) {
    state.restore(start);
    return null;
  }

  const results = [first];
  let current = first;

  while (true) {
    const pos  = state.save();
    const next = fn(current, state)(state);

    if (next == null) {
      state.restore(pos);
      break;
    }

    if (state.index === pos) throw new Error("chain1(): parser consumed no input.");

    results.push(next);
    current = next;
  }

  return results;
});

export const chainl1 = (operand, operator, build) => decorate(state => {
  let left = operand(state);
  if (left == null) return null;

  while (true) {
    const pos = state.save();
    const op  = operator(state);

    if (op == null) {
      state.restore(pos);
      break;
    }

    const right = operand(state);

    if (right == null) {
      state.restore(pos);
      break;
    }

    left = build(left, op, right);
  }

  return left;
});

export const chainr1 = (operand, operator, build) => decorate(state => {
  const left = operand(state);
  if (left == null) return null;

  const pos = state.save();
  const op  = operator(state);

  if (op == null) {
    state.restore(pos);
    return left;
  }

  const right = chainr1(operand, operator, build)(state);

  if (right == null) {
    state.restore(pos);
    return left;
  }

  return build(left, op, right);
});
