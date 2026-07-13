// @cosmonaut/lexer

// :::::: Export Lexer Utils

export {
  buildCommentScanners,
  buildTokenTypes,
  buildWhitespaceScanner,
  isKeyword,
  makeRulesFromPuncts,
  makeRulesFromOperators,
  resolveRules,
} from './utils.js';

// :::::: Convenience Re-Exports

export * from '@cosmonaut/presets';
export * from '@cosmonaut/utils';

// :::::: Main Export

const defaultOptions = {
  comments       : [],
  keywords       : [],
  puncts         : [],
  operators      : {},
  tokenTypes     : null,
  
  rules          : { use: [], override: {}, add: [] },
  scanners       : [],
  
  skipComments   : true,
  skipWhitespace : true,
};

export class Lexer {
  
  // init
  constructor (source = '', options = {}) {
    this.options = mergeOptions(options, defaultOptions);
    if (!this.options.tokenTypes) throw new Error('[Lexer] options.tokenTypes fehlt -> siehe buildTokenTypes() aus @cosmonaut/lexer.');
    
    this.source      = String(source);
    this._peeked     = null;
    this._keywordSet = new Set(this.options.keywords || []);
    
    this._buildScanners();
    this._buildRules();
    this.reset();
  }

  // main

  next () { return this._nextToken(); }

  peek () {
    if (!this._peeked) this._peeked = this._nextToken();
    return this._peeked;
  }
  
  reset () {
    this.cursor  = 0;
    this.line    = 1;
    this.column  = 1;
    this._peeked = null;
  }
  
  tokenize () {
    this.reset();
    const tokens = [];
    while (true) {
      const token = this.next();
      tokens.push(token);
      if (token.type === this._tokenTypes.EOF) break;
    }
    return tokens;
  }

  tokenizeSubSource (subSource) {
    // Rekursive Sub-Tokenisierung für Scanner (Template-Strings, JSX, ...) ->
    // nutzt this.constructor + this.options, NICHT einen hartkodierten Klassennamen. 
    // Dadurch funktioniert das transparent auch für 'class MyLexer extends Lexer {}'.
    return new this.constructor(subSource, this.options).tokenize();
  }

  // add + set

  addRule (rule, atStart = false) {
    const normalized = rule.regex.sticky ? rule : { ...rule, regex: new RegExp(rule.regex.source, rule.regex.flags + 'y') };
    if (atStart) this._rules.unshift(normalized);
    else this._rules.push(normalized);
  }
  
  addScanner (scanner, atStart = false) {
    if (atStart) this._scanners.unshift(scanner);
    else this._scanners.push(scanner);
  }

  setSource (src) {
    this.source = String(src);
    this.reset();
  }

  // internal

  _buildRules () {
    const { tokenTypes } = this.options;
    
    const operatorKeys = Array.from(
      Array.isArray(this.options.operators) ? this.options.operators : Object.keys(this.options.operators)
    ).sort((a, b) => b.length - a.length);

    const  contentRules = resolveRules(this.options.rules);
    const operatorRules = makeRulesFromOperators(operatorKeys, tokenTypes);
    const    punctRules = makeRulesFromPuncts(this.options.puncts, tokenTypes);
    
    this._rules = [...operatorRules, ...punctRules, ...contentRules];
  }

  _buildScanners () {
    const { tokenTypes } = this.options;
    const scanners = [];

    if (this.options.skipWhitespace) scanners.push(buildWhitespaceScanner());
    if (this.options.skipComments)   scanners.push(...buildCommentScanners(this.options.comments));
    scanners.push(...(this.options.scanners || []));

    this._scanners   = scanners;
    this._tokenTypes = tokenTypes;
  }

  _advancePosition (consumed) {
    const lines = consumed.split('\n');
    if (lines.length > 1) {
      this.line += lines.length - 1;
      this.column = lines[lines.length - 1].length + 1;
    } else {
      this.column += consumed.length;
    }
  }
  
  _nextToken () {
    if (this._peeked) {
      const t = this._peeked;
      this._peeked = null;
      return t;
    }

    while (true) {
      if (this.cursor >= this.source.length) {
        return { type: this._tokenTypes.EOF, value: '', line: this.line, column: this.column };
      }

      const startLine   = this.line;
      const startColumn = this.column;
      const scanner     = this._scanners.find(s => s.test(this.source, this.cursor));
      
      if (scanner) {
        const ctx = { tokenize: subSource => this.tokenizeSubSource(subSource) };
        const { token, endCursor } = scanner.scan(this.source, this.cursor, ctx);
        const consumed = this.source.slice(this.cursor, endCursor);

        this.cursor = endCursor;
        this._advancePosition(consumed);

        if (token === null) continue; // konsumiert (Whitespace/Kommentar), kein Token -> nächste Iteration
        return { ...token, line: token.line ?? startLine, column: token.column ?? startColumn };
      }

      // Rules (generische Regex-Regeln)
      let matchedRule = null;
      for (const rule of this._rules) {
        rule.regex.lastIndex = this.cursor;
        const match = rule.regex.exec(this.source);
        if (match) { matchedRule = { rule, raw: match[0] }; break; }
      }

      if (!matchedRule) throw new SyntaxError(`[Lexer] Invalid char '${this.source[this.cursor]}' at Position ${this.line}:${this.column}`);

      const { rule, raw } = matchedRule;
      let type = rule.type;
      if (type === this._tokenTypes.IDENTIFIER && isKeyword(this._keywordSet, raw)) {
        type = this._tokenTypes.KEYWORD;
      }

      this.cursor += rawlength;
      this._advancePosition(raw);

      return { type, value: raw, line: startLine, column: startColumn };
    }
  }
  
}

export default Lexer;
