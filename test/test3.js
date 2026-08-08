// suite 3 - the two grammar frontends, end to end.
//
// Suite 2 proved the grammar AST works. This one proves a text format can
// reach it. EBNF is checked exhaustively; LSD is a probe - it exercises
// sections -> meta -> tokens -> grammar -> spec in order, so the first
// section that fails tells you where the chain breaks.

import Cosmonaut, { Lexer, buildTokenTypes } from '@cosmonaut/compiler';
import { readEBNF, compileEBNF }             from '@cosmonaut/ebnf';
import { readDocument, readLSD, splitSections } from '@cosmonaut/lsd';

import { check, show, suite, throws } from './harness.js';


// ==============================================================================
// EBNF
// ==============================================================================

const EBNF_SOURCE = `
# a tiny language: val declarations and bare expressions

program              ::= { statement } ;
statement            ::= var-declaration | expression-statement ;
var-declaration      ::= "val" IDENTIFIER "=" expression ";" ;
expression-statement ::= expression ";" ;
expression           ::= NUMBER | IDENTIFIER ;
`;

const EBNF_INPUT = 'val x = 1; val y = 2; y;';


suite('1 · readEBNF · source -> grammar AST', () => {
  const rules = readEBNF(EBNF_SOURCE);

  check('rule names are PascalCased',
        Object.keys(rules).sort().join(','),
        'ExpressionStatement,Program,Statement,VarDeclaration');

  check('{ x } is a zero-or-more repeat',
        `${rules.Program.type}:${rules.Program.atLeastOne}`, 'repeat:false');

  check('| is an ordered choice', rules.Statement.type, 'choice');

  check('references are PascalCased too',
        rules.Statement.alternatives.map(a => a.name).join(','),
        'VarDeclaration,ExpressionStatement');

  check('quoted terminals become literals',
        `${rules.VarDeclaration.factors[0].type}:${rules.VarDeclaration.factors[0].value}`,
        'literal:val');

  check('bare names stay references',
        rules.VarDeclaration.factors[1].name, 'IDENTIFIER');

  throws('a malformed grammar fails loudly', () => readEBNF('program ::= ;'));
});


suite('2 · compileEBNF -> Parser', () => {

  // EBNF describes syntax only, so the lexer stays our job. That asymmetry
  // is exactly why readEBNF returns grammar and not a full spec.
  const tokenTypes = buildTokenTypes(['IDENTIFIER', 'KEYWORD', 'NUMBER', 'OPERATOR', 'PUNCT', 'EOF']);

  const lexer = {
    tokenTypes,
    keywords  : ['val'],
    operators : ['='],
    puncts    : [';'],
    rules     : [
      { id: 'number',     type: tokenTypes.NUMBER,     regex: /\d+/ },
      { id: 'identifier', type: tokenTypes.IDENTIFIER, regex: /[A-Za-z_$][A-Za-z0-9_$]*/ },
    ],
  };

  // token types are declared out of band, so compileEBNF has to be told
  // which references are terminals rather than rule names
  const methods = compileEBNF(EBNF_SOURCE, { tokens: ['IDENTIFIER', 'NUMBER'] });

  const cosmo  = new Cosmonaut({ lexer, parser: { methods, entry: 'Program' } });
  const result = cosmo.parse(EBNF_INPUT);

  check('three statements matched', result.length, 3);
  check('a var declaration has five factors', result[0].length, 5);
  check('its name binds', result[0][1].value, 'x');
  check('an expression statement has two', result[2].length, 2);
  check('its expression binds', result[2][0].value, 'y');

  // compiled and hand-written rules share one dispatch surface
  const mixed = new Cosmonaut({
    lexer,
    parser : {
      entry   : 'Program',
      methods : {
        ...methods,
        parseVarDeclaration (p) {
          const raw = methods.VarDeclaration(p);
          return raw === undefined
            ? undefined
            : { type: 'VarDecl', name: raw[1].value, value: raw[3].value };
        },
      },
    },
  });

  const nodes = mixed.parse(EBNF_INPUT);
  show('with one rule overridden', JSON.stringify(nodes[0], null, 2));

  check('override produces a node', nodes[0].type, 'VarDecl');
  check('override kept its value',  nodes[1].name, 'y');
});


// ==============================================================================
// LSD
// ==============================================================================

const LSD_SOURCE = await fetch('../examples/poo/poo.lsd').then(r => {
  if (!r.ok) throw new Error(`poo.lsd not found (${r.status}) - expected at /examples/poo/poo.lsd`);
  return r.text();
});


suite('3 · splitSections', () => {
  const sections = splitSections(LSD_SOURCE);

  show('section sizes', Object.entries(sections)
    .map(([k, v]) => `${k.padEnd(7)} ${v.length}`).join('\n'));

  check('META lines found',       sections.META.length > 0, 'true');
  check('TKN lines found',        sections.TKN.length,      9);
  check('top-level RULE lines',   sections.RULE.length,     10);
  check('blocks found',           sections.BLOCKS.length,   11);

  const names = sections.BLOCKS.map(b => b.name);
  check('block names come from "META :: X"',
        names.includes('FnDecl') && names.includes('BinaryExpr'), 'true');

  check('"#### Label" is kept as fullName',
        sections.BLOCKS.find(b => b.name === 'FnDecl')?.fullName, 'FunctionDeclaration');

  check('plain # comments are dropped',
        sections.RULE.some(l => l.trim().startsWith('#')), 'false');
});


suite('4 · readDocument', () => {
  const doc = readDocument(LSD_SOURCE);

  show('token declarations', doc.tokens
    .map(t => `${t.name.padEnd(11)} ${t.kind}${t.ref ? ' @' + t.ref : ''}`).join('\n'));

  check('META LIST parsed',  doc.meta.lists.keywords?.includes('fn'), 'true');
  check('META TABLE parsed', doc.meta.tables.operators?.rows.length,  7);

  check('regex tokens',    doc.tokens.filter(t => t.kind === 'regex').length, 5);
  check('ref tokens',      doc.tokens.filter(t => t.kind === 'ref').length,   4);

  check('top-level productions', doc.grammar.productions.length, 10);
  check('blocks',                doc.grammar.blocks.length,      11);

  // "RULE :: Block == `{` Statement* `}` => 2" extracts factor 2
  const block = doc.grammar.productions.find(p => p.name === 'Block');
  check('=> N is read as an extract index', block?.extractIndex, 2);

  // "RULE :: IdentList == [ IDENTIFIER+ `,`? ]" is a list node
  const identList = doc.grammar.productions.find(p => p.name === 'IdentList');
  check('[ x+ sep? ] is a list',
        `${identList?.expr.type}:${identList?.expr.atLeastOne}:${identList?.expr.separatorOptional}`,
        'list:true:true');

  // patterns reach the shared grammar AST
  const statement = doc.grammar.productions.find(p => p.name === 'Statement');
  check('| in a production is a choice', statement?.expr.type, 'choice');

  const fnDecl = doc.grammar.blocks.find(b => b.name === 'FnDecl');
  check('a block keeps its alternatives', fnDecl?.alternatives.length, 2);
  check('named mapping resolves fields',
        Object.keys(fnDecl?.alternatives[0].bindings ?? {}).sort().join(','),
        'args,body,identifier');
});


suite('5 · readLSD -> Cosmonaut', () => {
  const spec = readLSD(LSD_SOURCE);

  show('lexer config', [
    `tokenTypes  ${Object.keys(spec.lexer.tokenTypes).length}`,
    `rules       ${spec.lexer.rules.length}`,
    `comments    ${JSON.stringify(spec.lexer.comments)}`,
    `keywords    ${spec.lexer.keywords.length}`,
  ].join('\n'));

  check('COMMENT became a comment scanner, not a rule',
        spec.lexer.comments[0]?.start, '//');

  check('WHITESPACE produced no rule',
        spec.lexer.rules.some(r => r.id === 'tkn:WHITESPACE'), 'false');

  check('keywords feed the lexer reclassification',
        spec.lexer.keywords.includes('val'), 'true');

  check('operator table became per-symbol rules',
        spec.lexer.rules.some(r => r.id === 'tkn:OPERATOR:>>>'), 'true');

  check('parser methods cover productions and blocks',
        Object.keys(spec.parser.methods).length, 21);

  check('highlighting survives', spec.highlighting.KEYWORD, 'keyword.control');

  // ---- the whole way
  const cosmo  = new Cosmonaut({ ...spec, parser: { ...spec.parser, entry: 'Program' } });
  const source = 'val x = 1;';

  const tokens = cosmo.tokenize(source);
  show('tokens', tokens.map(t => `${t.type.padEnd(11)} ${JSON.stringify(t.value)}`).join('\n'));

  check('val is a KEYWORD', tokens[0].type, 'KEYWORD');

  const ast = cosmo.parse(source);
  show('ast', JSON.stringify(ast, null, 2));

  check('one statement',        ast.length,     1);
  check('it is a ValDecl node', ast[0].type,    'ValDecl');
  check('its name binds',       ast[0].name?.value ?? ast[0].name, 'x');
});
