
import Cursor   from '@cosmonaut/cursor';
import Streamer from '@cosmonaut/streamer';

export const Tokenizer {
  
  constructor (inputCode) {
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
  next () { this.tokens.pop(); }
  peek () {  }
}


export const Lexer {
  
}
