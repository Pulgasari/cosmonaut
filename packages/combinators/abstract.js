import { consume, match, choice, list, rule, named } from '@cosmonaut/combinators';

// ::: Basis-Atome (Token-Matcher)
const ident     = match('IDENTIFIER');
const stringLit = match('STRING');
const intLit    = match('INT');

// ::: Grammatik-Definition via Fluent-DSL

// 1. Ein einzelner Parameter in der Signatur, z.B. "precedence: int"
const Parameter = named(
  ident.capture('paramName')
    .then.consume(':')
    .then.ident.capture('paramType')
    .node('Parameter'),
  'Parameter'
);

// 2. Die komplette Signatur-Liste: "(precedence: int, associativity: string)"
const SignatureList = named(
  list(rule.Parameter, consume(','), {
    open: consume('('),
    close: consume(')')
  }),
  'SignatureList'
);

// 3. Eine Zuweisung innerhalb eines Datenobjekts, z.B. "precedence: 1"
const PropertyAssignment = named(
  ident.capture('key')
    .then.consume(':')
    .then.choice(intLit, stringLit).capture('value')
    .node('Property'),
  'PropertyAssignment'
);

// 4. Ein anonymes Datenobjekt: "{ precedence: 1, associativity: 'right' }"
const DataObject = named(
  list(rule.PropertyAssignment, consume(','), {
    open: consume('{'),
    close: consume('}')
  }),
  'DataObject'
);

// 5. Ein Eintrag im Body, z.B. "'=' : { ... }"
const Entry = named(
  stringLit.capture('operatorToken')
    .then.consume(':')
    .then.rule.DataObject.capture('properties')
    .node('Entry'),
  'Entry'
);

// 6. Das gesamte Root-Konstrukt der DSL: "def operators : (...) { ... }"
const DataDefinition = named(
  consume('def')
    .then.ident.capture('dslName')
    .then.consume(':')
    .then.rule.SignatureList.capture('signature')
    // Kommas im Body sind optional (Whitespaces/Newlines trennen die Einträge)
    .then.list(rule.Entry, consume(',').optional(), {
      open: consume('{'),
      close: consume('}')
    }).capture('entries')
    .node('DataDefinition'),
  'DataDefinition'
);

export { DataDefinition };


// an experimental class using combinators
// to create a much more higher abstraction
// of often used patterns

// helpers

const wrappersMap = {
  '()' : ['(', ')'],
  '[]' : ['[', ']'],
  '{}' : ['{', '}'],
  '<>' : ['<', '>'],
};

function resolveWrapper (input) {
  // it is already resolved
  isArray (input) return input;

  // it is pre-defined in map
  let find = wrappersMap(input);
  if (find) return find;

  // 
  if (isString(input)) {
    const [open, close] = input;
    // add to map
    Object.assign(wrappersMap, { [input], [open, close] });
    // done!
    return [open, close];
  }
}

function resolvePattern (name, input) {
  let obj;
  
  // "<separator> <wrapper>"
  if ('listConfigPattern') {
    let splitted = input.split(' ');
    obj = { seperator: splitted[0], wrapper: splitted[1] };
  }

  return obj;
}

const parseList = (xxx, config = {}) => {
  
  if (isString(config)) {
    const { separator, wrapper } = config;
    const [open, close] = resolveWrapper(wrapper);
  } else {
    const { separator, wrapper } = resolvePattern(config);
  }
  
  const { separator, wrapper } = isString(config) ? config : resolvePattern('listConfigPattern', config); 
  const [open, close] = resolveWrapper(wrapper);
  
  return list (
    rule.Parameter, 
    consume(separator), 
    {open: consume(open), close: consume(close)}
  );
}

// 2. Die komplette Signatur-Liste: "(precedence: int, associativity: string)"
const SignatureList = named(
  parseList ('Parameter', ', ()')
  parseList ('Parameter', { sep: ',', wrapper: '()' })
  list(rule.Parameter, consume(','), { open: consume('('), close: consume(')') }),
  'SignatureList'
);
