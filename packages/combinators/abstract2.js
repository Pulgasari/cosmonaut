import { consume, list, match,  map, named, node, seq } from '@cosmonaut/combinators';
import ( isTitleCase } from '@cosmonaut/utils/internals';

function createChain (fn, tf) {
  // Die Chain selbst ist eine stinknormale Kombinator-Funktion (p => result)
  const chain = p => fn(p);
  // convert to AST
  chain.toNode = type => createChain(node(fn, type), tf);
  // Benennt den Kombinator für Debug-Zwecke UND registriert ihn im Tokenfresser
  chain.withName = name => {
    const namedCombinator = named(fn, name);
    tf.register(name, namedCombinator); // auto-register
    return createChain(namedCombinator, tf);
  };

  return chain;
}

// ==========================================
// DIE TOKENFRESSER KLASSE
// ==========================================

export default class Tokenfresser {
  constructor() {
    this.rules = new Map; // inner registry for compiled rules
  }
  
  registerRule (name, combinator) {
    this.rules.set(name, combinator);
  }
  
  // creates lazy-wrapper for RULE from REGISTRY
  // (it's recursive so order of RULE definitions doesn't matter)
  resolveRule (name) {
    return (p) => {
      const rule = this.rules.get(name);
      if (!rule) throw new Error(`Grammatik-Fehler: Die Regel "${name}" wurde aufgerufen, aber noch nicht definiert.`);
      return rule(p);
    };
  }

  parsePattern (patternStr, strategyStr, captureObj = null) {
    const parts      =  patternStr.trim().split(/\s+/);
    const strategies = strategyStr.trim().split('');

    if (parts.length !== strategies.length) {
      throw new Error(`Tokenfresser-Fehler: Pattern-Elemente (${parts.length}) und Strategie-Flags (${strategies.length}) stimmen nicht überein.`);
    }

    // Transformiere jedes Text-Fragment basierend auf Typ und Flag in ein Core-Atom
    const combinators = parts.map((part, i) => {
      const strategy = strategies[i];

      if (strategy === '!') {
        return consume(part);
      } 
      else if (strategy === '?') {
        if (this.rules.has(part) || isTitleCase(part)) {
          return this.resolve(part);
        }
        // Ansonsten ist es ein nackter Token-Typ (z.B. IDENTIFIER)
        return match(part);
      }
      throw new Error(`Tokenfresser-Fehler: Unbekanntes Strategie-Flag "${strategy}". Erwartet wird '?' oder '!'.`);
    });

    // Führe die Atome zu einer Sequenz zusammen
    let compiled = seq(...combinators);

    // Falls ein positionales Mapping gewünscht ist, falte das flache seq-Ergebnis-Array zusammen
    if (captureObj) {
      compiled = map(compiled, (results) => {
        if (!results) return null; // Fehlschlag nach oben durchreichen
        
        const captured = {};
        for (const [key, index] of Object.entries(captureObj)) {
          captured[key] = results[index];
        }
        return captured;
      });
    }

    return createChain(compiled, this);
  }
  
  parseList (inner, configStr = ", {}") {
    const innerCombinator = typeof inner === 'string' ? this.resolve(inner) : inner;

    // Konfiguration zerlegen (z.B. ", ()")
    const parts      = configStr.trim().split(/\s+/);
    const separator  = parts[0] || ',';
    const wrapperStr = parts[1] || null;

    let  openChar = null;
    let closeChar = null;
    if (wrapperStr && wrapperStr.length >= 2) {
       openChar = wrapperStr[0];
      closeChar = wrapperStr[1];
    }

    // Nutzt das unberührte, mächtige Core-list-Atom
    const compiled = list(innerCombinator, {
      separator  : separator ? consume(separator) : null,
      open       :  openChar ? consume (openChar) : null,
      close      : closeChar ? consume(closeChar) : null,
      trailing   : true,
      allowEmpty : true
    });

    return createChain (compiled, this);
  }
}

const TF = new Tokenfresser();
export { TF };



/**
* parsePattern
* Der flexible Pattern-Compiler mit positionaler Strategie und Capture-Mapping.
* @param {string} patternStr - z.B. "IDENTIFIER : IDENTIFIER"
* @param {string} strategyStr - z.B. "?!?" (? = match, ! = consume)
* @param {Object} captureObj - z.B. { paramName: 0, paramType: 2 }
*/

// -- parseList --
// inner - Der Name der Regel oder ein direkter Kombinator
// configStr - z.B. ", ()" (Separator und optionaler Wrapper)
