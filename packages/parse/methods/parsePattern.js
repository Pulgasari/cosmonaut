// @cosmonaut/parser/methods/parsePattern.js

import { expect, map, seq, token } from '@cosmonaut/blocks;

export default function parsePattern (parser, pattern, strategies, capture = null) {

  const parts = pattern.trim().split(/\s+/);
  const flags = strategies.trim().split("");

  if (parts.length !== flags.length) {
    throw new Error(`Pattern has ${parts.length} parts but ${flags.length} strategy flags.`);
  }

  const compiled = parts.map((part, i) => {

    switch (flags[i]) {
      case "!" : return expect(part);
      case "?" : {
        if (parser.rules?.has(part) || isTitleCase(part)) {
          return state => state[part]();
        }
        return token(part);
      }
      default: throw new Error(`Unknown strategy "${flags[i]}".`);
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
