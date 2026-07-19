// _internal.js

export const 

decorate = parser => parser,

backtrack = (state, parser) => {
    const position = state.save();
    const result   = parser(state);
    if (result == null) state.restore(position);
    return result;
};
