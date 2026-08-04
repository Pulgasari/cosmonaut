// suite 1 - phase 2 smoke test: every package standalone, then the pipeline.

import Cosmonaut, {
  buildTokenTypes, CharStream, Generator, Lexer, Parser, TokenStream,
} from '@cosmonaut/cosmonaut';


import * as layouter from '@cosmonaut/layouter';
import * as parsers  from '@cosmonaut/parsers';

import { check, show, suite, throws } from './harness.js';


// ==============================================================================

suite('1 · @cosmonaut/parsers', () => {
  const { seq, token, optional, sepBy, choice } = parsers;

  const tokens = [
    { type: 'NUMBER', value: '1' },
    { type: 'PUNCT',  value: ',' },
    { type: 'NUMBER', value: '2' },
    { type: 'PUNCT',  value: ',' },
    { type: 'NUMBER', value: '3' },
    { type: 'EOF',    value: ''  },
  ];

  const list = sepBy(token('NUMBER'), token(','));

  check('sepBy collects three numbers',
        list(new TokenStream(tokens)).map(t => t.value).join('|'), '1|2|3');

  // the sentinel contract: optional() matching nothing must not abort seq()
  const s2  = new TokenStream([{ type: 'NUMBER', value: '7' }, { type: 'EOF', value: '' }]);
  const got = seq(token('NUMBER'), optional(token('PUNCT')))(s2);

  check('optional() matching nothing survives seq()',
        Array.isArray(got) && got.length === 2 && got[1] === null, 'true');

  // check() must fail as undefined, not succeed as false
  const s3 = new TokenStream([{ type: 'NUMBER', value: '9' }, { type: 'EOF', value: '' }]);
  check('choice() skips a failing check()',
        choice(parsers.check('STRING'), token('NUMBER'))(s3)?.value, '9');
});


// ==============================================================================

suite('2 · @cosmonaut/layouter', () => {
  const { text, concat, group, indent, softline, line, joinMap, print } = layouter;

  const args = items => group(concat(
    text('('),
    indent(concat(softline, joinMap(items, concat(text(','), line), text))),
    softline,
    text(')'),
  ));

  const doc = concat(text('greet'), args(['alice', 'bob', 'charlie']));

  check('fits flat at width 80', print(doc, { width: 80 }), 'greet(alice, bob, charlie)');
  show('broken at width 10', print(doc, { width: 10 }));
});


// ==============================================================================

suite('3 · Cosmonaut · source -> tokens -> AST -> string', () => {

  const source = `val x = 1;
val greeting = x;
y;`;

  const tokenTypes = buildTokenTypes(['IDENTIFIER', 'KEYWORD', 'NUMBER', 'OPERATOR', 'PUNCT', 'EOF']);

  const lexer = {
    tokenTypes,
    keywords  : ['val'],
    operators : ['='],
    puncts    : [';'],
    comments  : [{ type: 'line', start: '//' }],
    rules     : [
      { id: 'number',     type: tokenTypes.NUMBER,     regex: /\d+/ },
      { id: 'identifier', type: tokenTypes.IDENTIFIER, regex: /[A-Za-z_$][A-Za-z0-9_$]*/ },
    ],
  };

  const parser = {
    entry   : 'Program',
    methods : {

      parseProgram (p) {
        const body = [];
        while (!p.eof()) body.push(p.parse('Statement'));
        return { type: 'Program', body };
      },

      parseStatement (p) {
        return p.dispatch({ 'val': 'VarDecl' }).or('ExprStatement');
      },

      parseVarDecl (p) {
        p.expect('val');
        const name = p.expect(tokenTypes.IDENTIFIER);
        p.expect('=');
        const value = p.parse('Expression');
        p.expect(';');
        return { type: 'VarDecl', name: name.value, value };
      },

      parseExprStatement (p) {
        const expression = p.parse('Expression');
        p.expect(';');
        return { type: 'ExprStatement', expression };
      },

      parseExpression (p) {
        return p.parse('Primary');
      },

      parsePrimary (p) {
        const t = p.advance();
        if (t.type === tokenTypes.NUMBER)     return { type: 'NumberLiteral', value: t.value };
        if (t.type === tokenTypes.IDENTIFIER) return { type: 'Identifier',    name:  t.value };
        throw p.stream.error(`Unexpected token '${t.value}'`);
      },

    },
  };

  const generator = {
    methods : {
      genProgram       : (g, n) => g.$.join(n.body.map(s => g.genNode(s)), g.$.hardline),
      genVarDecl       : (g, n) => g.$.concat(g.$.text('const '), g.$.text(n.name), g.$.text(' = '), g.genNode(n.value), g.$.text(';')),
      genExprStatement : (g, n) => g.$.concat(g.genNode(n.expression), g.$.text(';')),
      genNumberLiteral : (g, n) => g.$.text(n.value),
      genIdentifier    : (g, n) => g.$.text(n.name),
    },
  };

  const cosmo = new Cosmonaut({ lexer, parser, generator, layout: { width: 80 } });

  // ---- stage by stage
  const tokens = cosmo.tokenize(source);
  show('tokens', tokens.map(t =>
    `${t.type.padEnd(11)} ${JSON.stringify(t.value).padEnd(12)} ${t.line}:${t.column}`).join('\n'));

  check('keyword reclassified from IDENTIFIER', tokens[0].type, 'KEYWORD');
  //check('positions tracked across lines',       `${tokens[6].line}:${tokens[6].column}`, '2:1');
  
  const [, secondVal] = tokens.filter (t => t.value === 'val');
  const y             = tokens.find   (t => t.value ===   'y');

  check('line 2 starts at column 1', `${secondVal.line}:${secondVal.column}`, '2:1');
  check('column within line 2',      `${tokens[6].line}:${tokens[6].column}`, '2:5');
  check('line 3 starts at column 1', `${y.line}:${y.column}`,                 '3:1');

  const ast = cosmo.parse(source);
  show('ast', JSON.stringify(ast, null, 2));

  check('three statements parsed',        ast.body.length,  3);
  check('dispatch picked VarDecl',        ast.body[0].type, 'VarDecl');
  check('fallback picked ExprStatement',  ast.body[2].type, 'ExprStatement');

  const code = cosmo.compile(source);
  show('output', code);

  check('full pipeline', code, 'const x = 1;\nconst greeting = x;\ny;');
});


// ==============================================================================

suite('4 · Machine', () => {
  const tokenTypes = buildTokenTypes(['IDENTIFIER', 'EOF']);

  const p = new Parser({ methods: { parseThing: () => 'thing!' } });

  check('p.parse(name)',   p.parse('Thing'), 'thing!');
  check('p.parseThing()',  p.parseThing(),   'thing!');
  check('p.Thing()',       p.Thing(),        'thing!');
  check('p.parse.Thing()', p.parse.Thing(),  'thing!');

  // reserved-name guard, derived from the instance rather than a hand list
  throws(
    'registering "Dispatch" collides with p.dispatch',
    () => new Parser({ methods: { parseDispatch: () => 0 } })
  );

  // a node type named "Node" would overwrite g.genNode - the dispatch entry point
  throws(
    '"Node" collides with g.genNode',
    () => new Generator({ methods: { genNode: () => 0 } })
  );

  // lowercase keys are almost always a helper that slipped into the methods object
  throws(
    'lowercase method names are rejected',
    () => new Parser({ methods: { thing: () => 0 } })
  );

  // the old Lexer mutated its shared defaults object
  new Lexer('', { tokenTypes, puncts: [';'] });
  const second = new Lexer('', { tokenTypes });
  check('lexer options do not leak between instances', second.options.puncts.length, 0);

  // stream contract: an opaque checkpoint compares by ===
  const cs = new CharStream('abc');
  const at = cs.save();
  cs.next();
  cs.next();
  cs.restore(at);
  check('CharStream restore', cs.peek() + ':' + cs.column, 'a:1');
});
