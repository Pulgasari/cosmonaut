// @cosmonaut/lexer

import { puncts, TokenType } from './presets.js';

import {
  ensureArray,
  escapedRegExp,
  makeRulesFromOperators,
  makeRulesFromPuncts,
} from './utils.js';

// :::::: UTILS

const defaultOptions = {
  comments       : [],
  keywords       : [], // ['const', 'let', 'var'],
  operators      : [],
  puncts         : puncts,
  rules          : [], // Array of { type, regex, value? })
  skipComments   : true,
  skipWhitespace : true,
};

// :::::: MAIN EXPORT

export default class Lexer {
  constructor (source = '', options = {}) {
    this.options = { ...defaultOptions, ...options };
    this.source  = String(source);
    this.column  = 1;
    this.cursor  = 0;
    this.line    = 1;
    this._peeked = null;
    this._buildRules();
    this._buildCommentMatchers();
  }

  _buildRules () {
    const base = [
      ...makeRulesFromOperators (this.options.operators || []),
      ...makeRulesFromPuncts    (this.options.puncts    || []),

      // Strings (doppelt und einfach)
      { type: TokenType.STRING, regex: /"(?:\\.|[^"\\])*"/y },
      { type: TokenType.STRING, regex: /'(?:\\.|[^'\\])*'/y },

      // Zahlen (ganzzahlig + float)
      { type: TokenType.NUMBER, regex: /\d+(?:\.\d+)?/y },

      // Identifier / Keywords
      { type: TokenType.IDENTIFIER, regex: /[a-zA-Z_$][a-zA-Z0-9_$]*/y },
    ];

    // Benutzerregeln anhängen (falls vorhanden)
    const userRules = Array.isArray(this.options.rules) ? this.options.rules.map(r => {
      // stelle sicher, dass regex sticky ist
      if (r.regex && !r.regex.sticky) {
        r.regex = new RegExp(r.regex.source, (r.regex.flags || '') + 'y');
      }
      return r;
    }) : [];

    this.RULES     = [...base, ...userRules];
    this._keywords = new Set(this.options.keywords || []);
  }

  _buildCommentMatchers () {
    const comments = Array.isArray(this.options.comments) ? this.opts.comments : [];
    this._commentMatchers = comments.map(c => {
      if (c.type === 'line') {
        // match von start bis vor newline (oder bis EOF)
        const re = new RegExp(RegExp.escape(c.start) + '.*', 'y');
        return { kind: 'line', start: c.start, regex: re };
      } else if (c.type === 'block') {
        // non-greedy match zwischen start und end, erlaubt newlines
        const re = new RegExp(RegExp.escape(c.start) + '[\\s\\S]*?' + RegExp.escape(c.end), 'y');
        return { kind: 'block', start: c.start, end: c.end, regex: re };
      } else {
        throw new Error('Unknown comment type: ' + c.type);
      }
    });

    // längere Starts zuerst prüfen (z. B. '///' vor '//')
    this._commentMatchers.sort((a, b) => (b.start.length - a.start.length));
  }

  setSource (src) {
    this.source = String(src);
    this.reset();
  }

  reset () {
    this.column  = 1;
    this.cursor  = 0;
    this.line    = 1;
    this._peeked = null;
  }

  _updatePosition (value) {
    const lines = value.split('\n');
    if (lines.length > 1) {
      this.line += lines.length - 1;
      this.column = lines[lines.length - 1].length + 1;
    } else {
      this.column += value.length;
    }
  }

  _skipWhitespaceAndComments () {
    while (this.cursor < this.source.length) {
      const ch = this.source[this.cursor];

      // newline
      if (ch === '\n') {
        this.column = 1;
        this.cursor++;
        this.line++;
        continue;
      }

      // whitespace
      if (this.options.skipWhitespace && /\s/.test(ch)) {
        this.column++;
        this.cursor++;
        continue;
      }

      // comments
      if (this.options.skipComments && this._commentMatchers.length) {
        let matchedComment = false;
        for (const m of this._commentMatchers) {
          m.regex.lastIndex = this.cursor;
          const match = m.regex.exec(this.source);
          if (match) {
            const raw = match[0];
            // update position (block kann newlines enthalten)
            const lines = raw.split('\n');
            if (lines.length > 1) {
              this.line += lines.length - 1;
              this.column = lines[lines.length - 1].length + 1;
            } else {
              this.column += raw.length;
            }
            this.cursor += raw.length;
            matchedComment = true;
            break;
          }
        }
        if (matchedComment) continue;
      }

      break;
    }
  }

  _matchRules () {
    for (const rule of this.RULES) {
      rule.regex.lastIndex = this.cursor;
      const match = rule.regex.exec(this.source);
      if (match) {
        const raw = match[0];
        let tokenType = rule.type;

        if (tokenType === TokenType.IDENTIFIER && this._keywords.has(raw)) {
          tokenType = TokenType.KEYWORD;
        }

        const token = {
          column : this.column,
          line   : this.line,
          type   : tokenType,
          value  : raw,
        };

        this.cursor += raw.length;
        this._updatePosition(raw);

        return token;
      }
    }
    return null;
  }

  next () {
    if (this._peeked) {
      const t = this._peeked;
      this._peeked = null;
      return t;
    }

    this._skipWhitespaceAndComments();

    if (this.cursor >= this.source.length) {
      return { type: TokenType.EOF, value: '', line: this.line, column: this.column };
    }

    const token = this._matchRules();
    if (!token) {
      const ch = this.source[this.cursor];
      throw new SyntaxError(`Ungültiges Zeichen '${ch}' an Position ${this.line}:${this.column}`);
    }
    return token;
  }

  peek () {
    if (!this._peeked) this._peeked = this.next();
    return this._peeked;
  }

  tokenize () {
    const tokens = [];
    this.reset();
    while (true) {
      const t = this.next();
      tokens.push(t);
      if (t.type === TokenType.EOF) break;
    }
    return tokens;
  }

  addRule (rule, atStart = false) {
    // ensure sticky regex
    if (rule.regex && !rule.regex.sticky) {
      rule.regex = new RegExp(rule.regex.source, (rule.regex.flags || '') + 'y');
    }
    if (atStart) this.RULES.unshift (rule);
    else         this.RULES.push    (rule);
  }
  
};
