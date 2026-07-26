// @cosmonaut/parser/classes/ParserState.js

// Convention: `undefined` is the ONLY "this parser failed to match"
// sentinel throughout @cosmonaut/parser/blocks. `null` is a legitimate,
// real matched VALUE (most importantly: optional()'s "matched nothing"
// result) and must be able to pass through seq()/choice()/etc without
// being mistaken for failure - see flow.js's optional() and the bug this
// fixes: previously `null` meant BOTH "failed" and "optional successfully
// matched nothing", which are indistinguishable to a caller, causing e.g.
// seq(token('('), optional(x), token(')')) to incorrectly abort entirely
// whenever the optional part legitimately matched nothing.

export default class ParserState {
  constructor (tokens = []) { this.setTokens(tokens); }
  setTokens (tokens) { this.tokens = tokens; this.index = 0; }
  isEOF () { return this.peek()?.type === "EOF"; }
  reset () { this.index = 0; }
  save  () { return this.index; }

  restore (position)   { this.index = position; }
  peek    (offset = 0) { return this.tokens[this.index + offset] ?? null; }

  next () {
    if (!this.eof()) this.index++;
    return this.peek(-1);
  }

  eof () { return this.isEOF(); }

  check (typeOrValue) {
    const token = this.peek();
    if (!token) return false;
    return token.type === typeOrValue || token.value === typeOrValue;
  }

  match (typeOrValue) {
    return !this.check(typeOrValue) ? undefined : this.next();
  }

  consume (typeOrValue) {
    const token = this.match(typeOrValue);
    if (token === undefined) throw new SyntaxError(`Expected '${typeOrValue}'`);
    return token;
  }
}

