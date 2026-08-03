// just a test file to thing about features and syntax

// :::::: parseSequence()

// a pattern like this is a sequence
// most likely seperated by ','

const members = [p.parse('Primary')];
while (p.match('|')) members.push(p.parse('Primary'));
p.match(';');

// could be abstracted to:

function parseSequence (elementSpec, seperatorSpec = ',') (
  const arr = [];
  do { arr.push(elementSpec); } while (seperatorSpec);
  return arr;
}

// which results in:

const members = p.parseSequence('Primary', '|');
match(';');

// :::::: CHAIN ???

// but i wonder if we could make an optional
// chain logic introduced by $ on top of
// the parse- and control-flow-methods
// really kinda good old jQuery like

const members = p.$sequence('Primary', '|').$match(';');
const members = p.$.sequence('Primary', '|').match(';');

// not with the intension to write superlong chains
// but more likely short chains of logical connected operations.

// maybe as importable helper?
// looks better than the syntax examples above at least
// but maybe less efficient from performance standpoint?

const members = $(p).sequence('Primary', '|').match(';');

// :::::: KINDA CHAIN

// or maybe some of the helpers get some optional chainable stuff
// like the `switchParse()` could get an `or` for the fallback

p.switchParse({ ... }).or('Expr');
p.switchParse({ ... }).or(() => doSomething());

/*
sequence()
choice()
optional()
many()
many1()
separated()
between()
until()
lookahead()
not()
*/

// doWhile

const traits = [];
if (p.match('use')) do { traits.push(p.consume('IDENTIFIER').value); } while (p.match(','));

const traits = $(p).match('use').doWhile(',').consume('IDENTIFIER');
const traits = $(p).match('use').doWhileMatch(',').consume('IDENTIFIER');


// while

const members = [];
while (p.match('|')) members.push(p.parse('Primary'));

const members = $(p).while('|').parse('Primary');
const members = $(p).while('|', 'Primary');
const members = $(p).whileMatch('|').parse('Primary');
const members = $(p).whileMatch('|', 'Primary');

////////// NOT A CHAIN BUT OPTIONAL POSTFIX METHODS TO PARSE METHODS

// while

const members = [];
while (p.match('|')) members.push(p.parse('Primary'));

const members = parse('Primary').while('|');

// do while

const traits = [];
do { traits.push(p.consume('IDENTIFIER').value); } while (p.match(','));

const traits = p.consume('IDENTIFIER').doWhile(',').values();

// consume, match, consumeSequence and matchSequence
// get a mini chain
// - while, doWhile
// - value, values, type, types

expect, expectSequence, expectWhile

////////// PATTERNS

// parse patterns

  <statement>; <statement>; <statement>;
{ <statement>; <statement>; <statement>; }

   value   value   value       seq
   value , value , value       seq sep
 ( value , value , value )     seq sep wrap   

// logic patterns

do <block> while <expr>
while <expr> <block>




