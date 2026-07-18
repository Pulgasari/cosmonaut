// @cosmonaut/blocks/parser/transform.js

import { backtrack, decorate } from './_internals.js';

export const map = (parser, fn) => decorate(state => {

    const result = parser(state);

    return result == null
        ? null
        : fn(result, state);

});

export const value = (parser, value) => decorate(state => {

    const result = parser(state);

    return result == null
        ? null
        : value;

});

export const capture = (parser, name) => decorate(state => {

    const result = parser(state);

    if (result == null) {
        return null;
    }

    return {
        [name]: result
    };

});

export const tap = (parser, fn) => decorate(state => {

    const result = parser(state);

    if (result != null) {
        fn(result, state);
    }

    return result;

});

export const filter = (parser, predicate) => decorate(state => {

    const result = parser(state);

    if (result == null) {
        return null;
    }

    return predicate(result, state)
        ? result
        : null;

});

