// EBNF/compiler.js

import { toPascalCase } from '@cosmonaut/utils/internals';

/**
 * Erzeugt aus einem EBNF-AST ein Objekt mit parseXxx-Funktionen.
 * Jede Funktion hat die Signatur: (p) => { ... } und nutzt die Parser-API.
 */
export function compileEBNF (ast) {
  const methods = {};

  for (const production of ast) {
    const name = production.name; // z.B. "function-declaration"
    const expr = production.expr;
    
    // Generiere eine Funktion für diese Produktion
    const fn = compileExpression(expr);
    
    // Speichere sie unter dem Namen "parseFunctionDeclaration"
    const methodName = 'parse' + toPascalCase(name);
    methods[methodName] = fn;
  }

  return methods;
}

// --------------------------------------------------------------
// Kern-Kompilierfunktion: Wandelt einen EBNF-AST in eine Funktion
// --------------------------------------------------------------
function compileExpression(expr) {
  switch (expr.type) {
    case 'literal':
      // Terminal: z.B. "function" oder ';'
      return (p) => p.consume(expr.value);
      
    case 'nonterminal':
      // Verweis auf andere Regel: z.B. expression
      return (p) => p.parse(expr.name);
      
    case 'sequence':
      // Hintereinanderausführung: expr1 expr2 expr3
      const fns = expr.factors.map(compileExpression);
      return (p) => {
        const results = [];
        for (const fn of fns) {
          results.push(fn(p));
        }
        return results; // oder ein kombiniertes Ergebnis
      };
      
    case 'choice':
      // Alternative: a | b | c
      const alternatives = expr.terms.map(compileExpression);
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
      const inner = compileExpression(expr.expr);
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
      const repeatInner = compileExpression(expr.expr);
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
      
    case 'group':
      // ( ... ) – Gruppe, wird wie Sequenz/Choice behandelt
      // Eigentlich nur zur Strukturierung, wir geben das Innere zurück
      return compileExpression(expr.expr);
      
    case 'regex':
      // ? any valid regex pattern ? – für Lexer-Regeln (wird meist ignoriert)
      // Du könntest hier einen regulären Ausdruck kompilieren
      return (p) => {
        // In der Praxis: überspringe diese Regel oder wirf einen Fehler
        throw new Error(`Regex blocks not supported in parser: ${expr.value}`);
      };
      
    case 'ellipsis':
      // ... – für Zeichenklassen (wird meist im Lexer behandelt)
      return (p) => {
        throw new Error(`Ellipsis not supported in parser: ${expr.value}`);
      };
      
    default:
      throw new Error(`Unknown expression type: ${expr.type}`);
  }
}

// --------------------------------------------------------------
// Hilfsfunktion: bindestrich-getrennt → PascalCase
// --------------------------------------------------------------
