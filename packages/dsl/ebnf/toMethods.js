// EBNF/toMethods.js

import { toPascalCase } from '@cosmonaut/utils/internals';

// :::::: toMethods <> convert AST into parseMethods

/**
 * Erzeugt aus einem EBNF-AST ein Objekt mit parseXxx-Funktionen.
 * Jede Funktion hat die Signatur: (p) => { ... } und nutzt die Parser-API.
 */
export default function toMethods (ast) {
  const methods = {};

  for (const production of ast) {
    const name = production.name; // z.B. "function-declaration"
    const expr = production.expr;
    
    // Generiere eine Funktion für diese Produktion
    const fn = compileExpr(expr);
    
    // Speichere sie unter dem Namen "parseFunctionDeclaration"
    const methodName = 'parse' + toPascalCase(name);
    methods[methodName] = fn;
  }

  return methods;
}

// ::: CORE: convert EBNF-AST into function

function compileExpr (expr) {
  switch (expr.type) {
    case 'literal'     : return (p) => p.consume(expr.value); // Terminal: z.B. "function" oder ';'
    case 'nonterminal' : return (p) => p.parse(expr.name); // Verweis auf andere Regel: z.B. expression
      
    case 'sequence': // Hintereinanderausführung: expr1 expr2 expr3
      const fns = expr.factors.map(compileExpr);
      return (p) => {
        const results = [];
        for (const fn of fns) {
          results.push(fn(p));
        }
        return results; // oder ein kombiniertes Ergebnis
      };
      
    case 'choice':
      // Alternative: a | b | c
      const alternatives = expr.terms.map(compileExpr);
      return (p) => {
        // Speicherposition, um zurückzusetzen, wenn eine Alternative fehlschlägt
        const pos = p._current;
        const errors = [];
        for (const alt of alternatives) {
          try {
            return alt(p);
          } catch (e) {
            errors.push(e);
            p._current = pos; // Zurücksetzen für nächste Alternative
          }
        }
        // Alle Alternativen fehlgeschlagen
        throw new Error(`No alternative matched: ${errors.map(e => e.message).join(' | ')}`);
      };
      
    case 'optional':
      // [ ... ] → 0 oder 1 mal
      const inner = compileExpr(expr.expr);
      return (p) => {
        const pos = p._current;
        try {
          return inner(p);
        } catch (_) {
          p._current = pos;
          return null; // Optional gibt null zurück
        }
      };
      
    case 'repeat':
      // { ... } → 0 oder mehr mal
      const repeatInner = compileExpr(expr.expr);
      return (p) => {
        const results = [];
        while (true) {
          const pos = p._current;
          try {
            results.push(repeatInner(p));
          } catch (_) {
            p._current = pos;
            break;
          }
        }
        return results;
      };

    // ( ... ) – Gruppe, wird wie Sequenz/Choice behandelt
    // Eigentlich nur zur Strukturierung, wir geben das Innere zurück
    case 'group' : return compileExpression(expr.expr);
    // ? any valid regex pattern ? – für Lexer-Regeln (wird meist ignoriert)
    // Du könntest hier einen regulären Ausdruck kompilieren
    // In der Praxis: überspringe diese Regel oder wirf einen Fehler
    case 'regex' : return (p) => { throw new Error(`Regex blocks not supported in parser: ${expr.value}`); };
    // ... – für Zeichenklassen (wird meist im Lexer behandelt)
    case 'ellipsis' : return (p) => { throw new Error(`Ellipsis not supported in parser: ${expr.value}`); };
    default : throw new Error(`Unknown expression type: ${expr.type}`);
  }
}
