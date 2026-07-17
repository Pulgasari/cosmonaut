import { consume, list, match,  map, named, node, seq } from '@cosmonaut/combinators';

/**
 * Erzeugt einen dünnen, funktionalen Wrapper um einen Kombinator,
 * um die Tokenfresser-Komfort-API bereitzustellen, ohne die
 * Core-Kombinatoren von @cosmonaut/combinators zu verändern.
 */

function createTFChain (combinatorFn, tf) {
  // Die Chain selbst ist eine stinknormale Kombinator-Funktion (p => result)
  const chain = (p) => combinatorFn(p);

  // Wandelt das Ergebnis bei Erfolg in einen AST-Node um
  chain.toNode = (type) => {
    return createTFChain(node(combinatorFn, type), tf);
  };

  // Benennt den Kombinator für Debug-Zwecke UND registriert ihn im Tokenfresser
  chain.withName = (name) => {
    const namedCombinator = named(combinatorFn, name);
    tf.register(name, namedCombinator); // Automatische Registrierung für String-Verweise!
    return createTFChain(namedCombinator, tf);
  };

  return chain;
}

// ==========================================
// DIE TOKENFRESSER KLASSE
// ==========================================
eyport default class Tokenfresser {
  constructor() {
    this.rules = new Map; // inner registry for compiled rules
  }

  /**
   * Registriert eine fertige Regel in der internen Registry
   */
  register (name, combinator) {
    this.rules.set(name, combinator);
  }
  
  // creates lazy-wrapper for RULE from REGISTRY
  // (it's recursive so order of RULE definitions doesn't matter)
  resolve (name) {
    return (p) => {
      const rule = this.rules.get(name);
      if (!rule) throw new Error(`Grammatik-Fehler: Die Regel "${name}" wurde aufgerufen, aber noch nicht definiert.`);
      return rule(p);
    };
  }

  /**
   * Der flexible Pattern-Compiler mit positionaler Strategie und Capture-Mapping.
   * @param {string} patternStr - z.B. "IDENTIFIER : IDENTIFIER"
   * @param {string} strategyStr - z.B. "?!?" (? = match, ! = consume)
   * @param {Object} captureObj - z.B. { paramName: 0, paramType: 2 }
   */
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
        // Wenn das Wort bereits eine registrierte Regel oder PascalCase ist, lösen wir es lazy auf
        if (this.rules.has(part) || /^[A-Z][a-zA-Z0-9_]*$/.test(part)) {
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

    return createTFChain(compiled, this);
  }

  /**
   * Die List-Sonderfunktion. Akzeptiert als inneres Element sowohl fertige
   * Kombinatoren als auch Strings für die Lazy-Registry.
   * @param {string|Function} inner - Der Name der Regel oder ein direkter Kombinator
   * @param {string} configStr - z.B. ", ()" (Separator und optionaler Wrapper)
   */
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
    const compiled = list(innerCombinator, consume(separator), {
      open       :  openChar ? consume (openChar) : null,
      close      : closeChar ? consume(closeChar) : null,
      trailing   : true,
      allowEmpty : true
    });

    return createTFChain (compiled, this);
  }
}

const TF = new Tokenfresser();
export { TF };

