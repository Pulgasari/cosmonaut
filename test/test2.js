// suite 2 - the grammar layer: one AST, many frontends.
//
// Nothing here imports @cosmonaut/lsd or @cosmonaut/ebnf. That is the point:
// if a format can produce these nodes, it needs to know nothing else about
// the toolkit.

import { Parser, TokenStream, grammar } from '@cosmonaut/compiler';

import { check, show, suite, throws } from './harness.js';

const {
  literal, reference, sequence, choice, optional, repeat, group, list,
  compileExpr, compileGrammar,
} = grammar;


// :::::: helpers

const tk     = (type, value) => ({ type, value, line: 1, column: 1 });
const stream = (...tokens)   => new TokenStream([...tokens, tk('EOF', '')]);

// runs a node against a token list, returns the raw result
const run = (node, tokens, options) => compileExpr(node, options)(stream(...tokens));

// flattens a match result down to a comparable string
const flat = result => {
  if (result === undefined)    return 'undefined';
  if (result === null)         return 'null';
  if (Array.isArray(result))   return '[' + result.map(flat).join(' ') + ']';
  if (result?.value !== undefined) return result.value;
  return String(result);
};


// ==============================================================================

suite('1 · node constructors', () => {

  check('literal',   JSON.stringify(literal('val')),      '{"type":"literal","value":"val"}');
  check('reference', JSON.stringify(reference('Block')),  '{"type":"reference","name":"Block"}');

  check('repeat carries atLeastOne',
        JSON.stringify(repeat(literal('a'), true).atLeastOne), 'true');

  check('list defaults',
        JSON.stringify(list(reference('Item'))),
        '{"type":"list","item":{"type":"reference","name":"Item"},"separator":null,' +
        '"atLeastOne":false,"separatorOptional":false}');

  // constructors are convenience, not a requirement - a frontend may emit
  // plain object literals and must produce the identical tree
  const built  = sequence(literal('if'), group(choice(reference('A'), reference('B'))));
  const manual = {
    type: 'sequence',
    factors: [
      { type: 'literal', value: 'if' },
      { type: 'group', expr: {
        type: 'choice',
        alternatives: [
          { type: 'reference', name: 'A' },
          { type: 'reference', name: 'B' },
        ],
      }},
    ],
  };

  check('constructors === object literals',
        JSON.stringify(built), JSON.stringify(manual));
});


// ==============================================================================

suite('2 · compileExpr · basic shapes', () => {

  check('literal matches by value',
        flat(run(literal('val'), [tk('KEYWORD', 'val')])), 'val');

  check('literal fails as undefined',
        flat(run(literal('val'), [tk('KEYWORD', 'let')])), 'undefined');

  check('sequence',
        flat(run(sequence(literal('a'), literal('b')),
                 [tk('PUNCT', 'a'), tk('PUNCT', 'b')])), '[a b]');

  check('sequence fails on a missing factor',
        flat(run(sequence(literal('a'), literal('b')), [tk('PUNCT', 'a')])), 'undefined');

  check('choice takes the first match',
        flat(run(choice(literal('x'), literal('a')), [tk('PUNCT', 'a')])), 'a');

  check('group is transparent',
        flat(run(group(literal('a')), [tk('PUNCT', 'a')])), 'a');
});


// ==============================================================================

suite('3 · compileExpr · quantifiers', () => {

  check('optional matching nothing yields null, not undefined',
        flat(run(optional(literal('a')), [tk('PUNCT', 'b')])), 'null');

  check('optional inside a sequence does not abort it',
        flat(run(sequence(optional(literal('a')), literal('b')), [tk('PUNCT', 'b')])),
        '[null b]');

  check('repeat * accepts zero',
        flat(run(repeat(literal('a')), [tk('PUNCT', 'b')])), '[]');

  check('repeat * collects',
        flat(run(repeat(literal('a')), [tk('PUNCT', 'a'), tk('PUNCT', 'a')])), '[a a]');

  check('repeat + requires one',
        flat(run(repeat(literal('a'), true), [tk('PUNCT', 'b')])), 'undefined');
});


// ==============================================================================

suite('4 · compileExpr · lists', () => {

  const items = [tk('NUM', '1'), tk('PUNCT', ','), tk('NUM', '2'), tk('PUNCT', ','), tk('NUM', '3')];
  const item  = reference('NUM');
  const opts  = { tokens: ['NUM'] };

  check('separated list',
        flat(run(list(item, literal(',')), items, opts)), '[1 2 3]');

  check('list without a separator',
        flat(run(list(item), [tk('NUM', '1'), tk('NUM', '2')], opts)), '[1 2]');

  check('empty list is [] , not undefined',
        flat(run(list(item, literal(',')), [tk('PUNCT', ';')], opts)), '[]');

  check('list+ requires one item',
        flat(run(list(item, literal(','), { atLeastOne: true }), [tk('PUNCT', ';')], opts)),
        'undefined');

  check('optional separator',
        flat(run(list(item, literal(','), { separatorOptional: true }),
                 [tk('NUM', '1'), tk('NUM', '2'), tk('PUNCT', ','), tk('NUM', '3')], opts)),
        '[1 2 3]');
});


// ==============================================================================

suite('5 · reference disambiguation', () => {

  // with a token registry: a known name matches a token of that type
  check('known name matches a token type',
        flat(run(reference('NUMBER'), [tk('NUMBER', '42')], { tokens: ['NUMBER'] })), '42');

  // without one: every reference is a rule reference, resolved through the
  // stream's back-reference to its parser. That is plain EBNF's behaviour.
  const p = new Parser({ methods: { parseThing: () => 'from-rule' } });
  p.stream.setTokens([tk('NUMBER', '42'), tk('EOF', '')]);

  check('unknown name recurses into a rule',
        compileExpr(reference('Thing'))(p.stream), 'from-rule');

  check('a Set works as a registry',
        flat(run(reference('NUMBER'), [tk('NUMBER', '7')], { tokens: new Set(['NUMBER']) })), '7');

  throws('unknown node type is rejected',
         () => compileExpr({ type: 'nonterminal', name: 'Legacy' }));
});


// ==============================================================================

suite('6 · compileGrammar -> Parser', () => {

  // val x = 1; val y = 2;
  const tokens = [
    tk('KEYWORD', 'val'), tk('IDENTIFIER', 'x'), tk('OPERATOR', '='), tk('NUMBER', '1'), tk('PUNCT', ';'),
    tk('KEYWORD', 'val'), tk('IDENTIFIER', 'y'), tk('OPERATOR', '='), tk('NUMBER', '2'), tk('PUNCT', ';'),
    tk('EOF', ''),
  ];

  const rules = {
    Program : repeat(reference('Statement'), true),
    Statement : sequence(
      literal('val'),
      reference('IDENTIFIER'),
      literal('='),
      reference('NUMBER'),
      literal(';'),
    ),
  };

  const methods = compileGrammar(rules, { tokens: ['IDENTIFIER', 'NUMBER'] });

  check('compileGrammar keys mirror the rule names',
        Object.keys(methods).sort().join(','), 'Program,Statement');

  const parser = new Parser({ methods, entry: 'Program' });
  const result = parser.run(tokens);

  show('raw match tree', flat(result));

  check('two statements matched', result.length, 2);
  check('second statement binds its name', result[1][1].value, 'y');

  // the compiled methods land on the same dispatch surface as hand-written ones
  check('p.parse.Statement exists', typeof parser.parse.Statement, 'function');

  // a grammar rule may be overridden after the fact, without touching the grammar
  parser.addMethod('Statement', p => {
    const [, name, , value] = p.$.seq(
      p.$.token('val'), p.$.token('IDENTIFIER'), p.$.token('='), p.$.token('NUMBER'), p.$.token(';'),
    )(p.stream);
    return { type: 'VarDecl', name: name.value, value: value.value };
  });

  const overridden = new Parser({ methods, entry: 'Program' });
  overridden.addMethod('Statement', p => {
    const raw = methods.Statement(p);
    return raw === undefined ? undefined : { type: 'VarDecl', name: raw[1].value, value: raw[3].value };
  });

  const nodes = overridden.run(tokens);
  show('after override', JSON.stringify(nodes, null, 2));

  check('override produces real nodes', nodes[0].type, 'VarDecl');
  check('override kept the values',     nodes[1].name, 'y');
});
