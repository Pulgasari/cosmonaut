// @cosmonaut/parser

const defaultOptions = {
  grammar     : [],   // Module mit parseXxx-Regeln, s.u.
  keywords    : [],
  nodeFactory : null, // s.u. (ASTNode-Proxy)
  puncts      : [],
  operators   : {},
  tokenTypes  : null, // z.B. via buildTokenTypes() aus @cosmonaut/lexer
  wrappers    : {},   // custom open/close-Paare, s.u.
};

export class Parser {

  // init
  constructor (tokens = [], options = {}) {
    this.options = mergeOptions(options, defaultOptions);
    if (!this.options.nodeFactory) throw new Error('[Parser] options.nodeFactory fehlt.');

    this._tokenMap = buildTokenValueMap(this.options);
    this._wrappers = buildWrapperMap(this.options.wrappers);
    this.node      = this.options.nodeFactory;
    this._stack    = [];
    
    this.setTokens(tokens);
    this._buildDispatch();
  }

  // navigate + match
  peek (offset = 0) { return this.tokens[this.cursor + offset]; }

  check (tokenSpec, offset = 0) {
    const { type, value } = resolveTokenSpec (tokenSpec);
    const token = this.peek();
    return token.type  === type
        && token.value === value;
  }
  match (tokenSpec, offset = 0) {
    return this.check(tokenSpec, offset)
      ? (this.advance(), true)
      : false;
  }
  consume (tokenSpec, message) {
    const matched = this.match(tokenSpec);
    if (matched) return matched;
    if (!matched) {
      const token = peek();
      throw new SyntaxError(`[Parser ${token.line}:${token.column}]: ${message || `Erwarte '${.value}'`} (Gefunden: '${token.value}')`);
    }
  }
  
  checkAny (...specs) {
    return specs.some(spec => this.check(spec));
  }
  matchAny (...specs) {
    if (!this.checkAny(...specs)) return false;
    this.advance();
    return true;
  }
  consumeAny (...specs) {
    if (this.checkAny(...specs)) return this.advance();
    throw this._unexpected(specs);
  }
  consumeAnyOrMessage (specsList, message) {
    if (this.checkAny(...specsList)) return this.advance();
    throw this._unexpected(specsList, message);
  }
  
  

  // navigate extras for dx
  checkNext (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue,  1); }
  checkPrev (typeOrValue, maybeValue) { return this.check(typeOrValue, maybeValue, -1); }
  checkSequence (...specs) { return specs.every((spec, i) => this.check(...normalizeSpec(spec), i)); }
  isEOF    () { return this.check('EOF'); }
  peekNext () { return this.peek( 1); }
  peekPrev () { return this.peek(-1); }
  
  // aliases for dx
  at           = this.peek;
  consumeToken = this.consume;
  isToken      = this.check;
  matchToken   = this.match;
  previous () { return this.at(-1); }

  // navigation
  advance  () { if (!this.isEOF()) this.cursor++; return this.previous(); }
  

  //
  error (message) {
    const t = this.peek();
    return new SyntaxError(`[Parser ${t.line}:${t.column}]: ${message} (Gefunden: '${t.value}')`);
  }

  // Sub-Parsing auf anderem Token-Stream (Template-Expr, JSX-Islands, ...)
  setTokens (tokens) { this.tokens = tokens; this.cursor = 0; }

  withTokens (tokens, fn) {
    this._stack.push({ tokens: this.tokens, cursor: this.cursor });
    this.setTokens(tokens);
    try { return fn(); }
    finally { ({ tokens: this.tokens, cursor: this.cursor } = this._stack.pop()); }
  }

  // from utils
  parseList             (...args) { return parseList             (this, ...args); } // parseElement, options
  parseWrapped          (...args) { return parseWrapped          (this, ...args); } // wrapper, fn
  parseUntil            (...args) { return parseUntil            (this, ...args); } // parseElement, stop
  parseBinaryExpression (...args) { return parseBinaryExpression (this, ...args); } // options, min

  // internal
  _buildDispatch () { /* s.u. Punkt 4 */ }
  
}

default export Parser;

// :::::: HELPERS

/ Spec-Normalisierung: ein Element ist entweder ein String (Wert/Typ, über TOKEN_MAP aufgelöst)
// oder ein [type, value]-Paar für den expliziten Fall
function normalizeSpec (spec) {
  return Array.isArray(spec) ? spec : [spec, undefined];
}

function resolveTokenQuery (typeOrValue, maybeValue) {
  return (maybeValue !== undefined)
    ? { type: typeOrValue, value: maybeValue }
    : TOKEN_MAP.get(typeOrValue) ?? null;
}

function resolveSpec (spec) {
  if (Array.isArray(spec) {
    let [type, value] = spec;
    return { type, value };
  }

  else {
    return TOKEN_MAP.get(spec) ?? null;
  }
}

function resolveTokenSpec (spec) {
  (typeof spec === 'object' && spec !== null)
    ? { return spec; }
    : Array.isArray(spec)
      ? { let [type, value] = spec; return { type, value }; }
      : { return TOKEN_MAP.get(spec) ?? null; }
}





// packages/parser/utils.js

export function resolveTokenSpec (spec, tokenMap) {
  if (typeof spec === 'string') {
    const resolved = tokenMap.get(spec);
    if (!resolved) throw new Error(`[Parser] Unknown token spec: "${spec}"`);
    return resolved;
  }

  if (Array.isArray(spec)) {
    const [type, value] = spec;
    return { type, value };
  }

  if (spec && typeof spec === 'object') {
    if ('type'  in spec && 'value' in spec) return { type: spec.type, value: spec.value };
    if ('type'  in spec)                    return { type: spec.type, value: undefined };
    if ('value' in spec)                    return resolveTokenSpec(spec.value, tokenMap);
  }

  throw new Error(`[Parser] Invalid token spec: ${JSON.stringify(spec)}`);
}

export function describeTokenSpec (spec) {
  if (typeof spec === 'string') return `'${spec}'`;
  if (Array.isArray(spec))      return `'${spec[1] ?? spec[0]}'`;
  if (spec?.value !== undefined) return `'${spec.value}'`;
  if (spec?.type  !== undefined) return spec.type;
  return JSON.stringify(spec);
}
