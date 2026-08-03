// internals.js

export const

decorate = parser => parser,

backtrack = (state, parser) => {
    const position = state.save();
    const result   = parser(state);
    if (result === undefined) state.restore(position);
    return result;
};
