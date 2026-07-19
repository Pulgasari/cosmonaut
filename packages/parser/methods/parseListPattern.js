// @cosmonaut/parser/methods/parseListPattern.js

import { expect, sepEndBy, seq, token } from '@cosmonaut/blocks';


export default function (ctx, element, config = ", {}") {

  const [separator = ",", wrapper = "{}"] = config.trim().split(/\s+/);
  const open  = wrapper?.[0];
  const close = wrapper?.[1];
  const item  = typeof element === "string" ? state => state[element]() : element;  
  const list  = sepEndBy (item, expect(separator));

  if (!open || !close) return list(ctx);

  return seq(
    expect(open),
    list,
    expect(close)
  )(ctx)[1];
  
}
