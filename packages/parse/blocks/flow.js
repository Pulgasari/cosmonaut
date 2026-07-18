// flow

const decorate = c => c;

const backtrack = (parser, combinator) => {

  const pos    = parser.save();
  const result = combinator(parser);

  if (result == null) parser.restore(pos);
  
  return result;
};

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
