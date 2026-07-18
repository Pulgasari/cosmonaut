// _internal.js

export const decorate = c => c;

export const backtrack = (parser, combinator) => {
    const pos = parser.save();
    const result = combinator(parser);
    if (result == null) parser.restore(pos);
    return result;
};
