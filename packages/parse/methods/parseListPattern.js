// @cosmonaut/parser/methods/parseListPattern.js

import { expect, sepEndBy, seq, token } from '@cosmonaut/blocks;


export default (parser, inner, config = ", {}") {

  const [separator = ",", wrapper = "{}"] = config.trim().split(/\s+/);

  const open  = wrapper?.[0];
  const close = wrapper?.[1];
  const item  = typeof inner === "string" ? state => state[inner]() : inner;
  const list  = sepEndBy (item, expect(separator));

  if (!open || !close) return list(parser);

  return seq(
    expect(open),
    list,
    expect(close)
  )(parser)[1];
  
}
