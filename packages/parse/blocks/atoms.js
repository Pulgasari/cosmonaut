// @cosmonaut/parser/blocks/atoms.js

import { decorate } from './_internals.js';

export const 

check   = value => decorate (parser => parser.check  (value)),
expect  = value => decorate (parser => parser.consume(value)),
token   = value => decorate (parser => parser.match  (value)),
any     = ()    => decorate (parser => parser.eof() ? null : parser.next()),
eof     = ()    => decorate (parser => parser.eof() ? true : null),
succeed = value => decorate (parser => value),
fail    = ()    => decorate (parser => null);
