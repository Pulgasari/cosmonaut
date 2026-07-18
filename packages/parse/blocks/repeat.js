// @cosmonaut/parser/blocks/repeat.js

const decorate = c => c;

const backtrack = (parser, combinator) => {
    const pos = parser.save();

    const result = combinator(parser);

    if (result == null) {
        parser.restore(pos);
    }

    return result;
};

export const many = combinator => decorate(parser => {
  const results = [];

  while (true) {
    const pos    = parser.save();
    const result = combinator(parser);

    if (result == null) {
      parser.restore(pos);
      break;
    }

    // infinite loop guard
    if (parser.index === pos) throw new Error("many(): parser consumed no input.");

    results.push(result);
  }

  return results;
});

export const many1 = combinator => decorate(parser => {
  const first = combinator(parser);
  if (first == null) return null;
  return [first, ...many(combinator)(parser)];
});

export const repeat = (combinator, count) => decorate(parser => {
  const start = parser.save();
  const results = [];
  for (let i = 0; i < count; i++) {
    const result = combinator(parser);
    if (result == null) {
      parser.restore(start);
      return null;
    }
    results.push(result);
  }
  return results;
});

export const sepBy = (item, separator) => decorate(parser => {
  const results = [];
  const first   = backtrack(parser, item);

  if (first == null) return results;
  results.push(first);

  while (true) {
    const pos = parser.save();
    if (backtrack(parser, separator) == null) {
      parser.restore(pos);
      break;
    }

    const next = item(parser);

    if (next == null) {
      parser.restore(pos);
      break;
    }

    results.push(next);
  }

  return results;
});




