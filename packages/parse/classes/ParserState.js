// @cosmonaut/parser/classes/ParserState.js

export default class ParserState {

  constructor (tokens = []) {
    this.setTokens(tokens);
  }

  setTokens (tokens) {
    this.tokens = tokens;
    this.index  = 0;
  }

  isEOF () { return this.peek()?.type === "EOF"; }
  reset () { this.index = 0; }
  save  () { return this.index; }

  restore (position)   { this.index = position; }
  peek    (offset = 0) { return this.tokens[this.index + offset] ?? null; }

  next () {
    if (!this.eof()) this.index++;
    return this.peek(-1);
  }
  
  check (typeOrValue) {
    const token = this.peek();
    if (!token) return false;

    return token.type === typeOrValue
        || token.value === typeOrValue;
  }

  match (typeOrValue) {
    return !this.check(typeOrValue) ? null : this.next();
  }

  consume (typeOrValue) {
    const token = this.match(typeOrValue);
    if (token == null) throw new SyntaxError(`Expected '${typeOrValue}'`);
    return token;
  }

}
