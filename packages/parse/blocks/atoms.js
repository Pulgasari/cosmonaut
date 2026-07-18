// @cosmonaut/parser/blocks/atoms.js

const decorate = c => c;

export const 

check = expected => decorate(parser => {
  return parser.check(expected);
}),
  
token = expected => decorate(parser => {
  return parser.match(expected);
}),

expect = expected => decorate(parser => {
  return parser.consume(expected);
}),

any = () => decorate(parser => {
  return parser.eof() ? null : parser.next();
}),

eof = () => decorate(parser => {
  return parser.eof() ? true : null;
});
