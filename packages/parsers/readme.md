## Contract

Two rules govern every block in this package.

**1. `undefined` is the only failure value.** Every other result - including
`null` - is a successful match. `optional()` returns `null` when it matched
nothing, and that has to survive `seq()` / `choice()` untouched.

**2. Blocks take a *stream*, not a parser.** Any object implementing
`save()`, `restore(position)`, `peek(offset)`, `next()`, `eof()`, `check(t)`,
`match(t)` and `consume(t)` will do. `@cosmonaut/cosmonaut` hands its own
`TokenStream` to these blocks; a standalone user can pass anything with the
same shape.
