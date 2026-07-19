// @cosmonaut/parser/methods/parsePattern.js

import { expect, map, seq, token } from '@cosmonaut/blocks';
import { isTitleCase }             from '@cosmonaut/utils/internals';

export default function (parser, pattern, strategies, capture = null) {

  const parts = pattern.trim().split(/\s+/);
  const flags = strategies.trim().split('');

  if (parts.length !== flags.length) {
    throw new Error(`Pattern has ${parts.length} parts but ${flags.length} strategy flags.`);
  }

  const compiled = parts.map((part, i) => {
    switch (flags[i]) {
      case '!' : return expect(part);
      case '?' : return (parser.rules?.has(part) || isTitleCase(part)) ? state => state[part]() : token(part);
      default  : throw new Error(`Unknown strategy "${flags[i]}".`);
    }
  });

  let patternParser = seq(...compiled);

  if (capture) {
    patternParser = map(patternParser, result => {
      const obj = {};
  
      for (const [key, index] of Object.entries(capture)) {
        obj[key] = result[index];
      }
      return obj;
    });
  }

  return patternParser(parser);
}
