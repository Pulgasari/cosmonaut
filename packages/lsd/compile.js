// @cosmonaut/lsd/compile.js

// WIP. Plan for turning a parsed LSD document into the four target
// artifacts. Each function below is a placeholder describing exactly
// which existing package/API it will eventually call into - filled in
// once grammar.js's open questions are resolved.

// TKN entries -> a @cosmonaut/lexer options object (comments, puncts,
// rules), roughly mirroring what packages/ebnf/lexer.js already does by
// hand for the (much smaller) EBNF token set. TKN entries with kind
// 'ref' resolve against meta.lists (keywords/literals/etc) or
// meta.tables (operators) - see makeRulesFromPuncts/makeRulesFromOperators
// in packages/lexer/utils.js, which already do almost exactly this.
export function compileTokenizer (lsd) {
  throw new Error('[lsd] compileTokenizer() not implemented yet.');
}

// Top-level productions + #### block alternatives -> an object of
// parseMethods, shaped exactly like @cosmonaut/ebnf's makeRulesFromEBNF()
// output, ready for `new Parser(tokens, { methods })`. #### blocks whose
// alternatives are pure "OPERATOR"-shaped (see BinaryExpression above)
// should be special-cased to call generator.parseBinaryExpr() with
// meta.tables.operators instead of being compiled generically.
export function compileParserMethods (lsd) {
  throw new Error('[lsd] compileParserMethods() not implemented yet.');
}

// #### block CODE templates -> an object of genMethods for
// @cosmonaut/generator, each building a Doc from ${field} / ${field,
// "sep"} placeholders via generator.genNode() / generator.genList().
// The BinaryExpression block again special-cases to genBinaryExpr()
// fed by meta.tables.operators, rather than a literal CODE template.
export function compileGeneratorMethods (lsd) {
  throw new Error('[lsd] compileGeneratorMethods() not implemented yet.');
}

// HL section -> as-is, just the parsed { tokenName: scope } map.
// No further compilation needed - already usable directly.
export function compileHighlighting (lsd) {
  return lsd.highlighting;
}
