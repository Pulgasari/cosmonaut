export function makeRulesFromStringList (stringList, tokenType) {
  return ensureArray(stringList).map(
    value => ({ id: `${type}:${value}`, type, value, regex: makeStickyRegex(RegExp.escape(String(value))) })
  );
}


import Cursor   from '@cosmonaut/cursor';
import Streamer from '@cosmonaut/streamer';
import {
  makeRulesFromStringList,
};

export const Tokenizer {
  
  constructor (inputCode, config = {
    operators : [],
    puncts    : [],
  }) {
    let { operators, puncts } = config;
    if (config.operators) {
      makeRulesFromStringList (operators, 'OPERATOR');
    }
    if (config.operators) {
      makeRulesFromStringList (puncts, 'PUNCT);
    }
    this.inputCode = inputCode;
    this.rules     = [];
    this.tokens    = [];

    return walk();
  }

  //
  walk () {
    let tkn = inputCode
            . split ('')
            . reverse ()
    
    this.tokens = tkn;
  }

  //
  next () { return this.tokens.pop() ?? 'EOF' }
  peek () {  }
}


export const Lexer {
  
}
