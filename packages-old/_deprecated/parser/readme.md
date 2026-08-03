# @cosmonaut/parser

## Install

## Methods

### Main Methods

spec      | spec 0    | spec 1         | spec 2
----------|-----------|----------------|-------
`at`      |           |                |
`move`    | `peek`    | `peek`         | `at`
`is`      | `check`   | `checkToken`   | `is`
`eat`     | `advance` | `advanceToken` | `eat`
`match`   | `match`   | `matchToken`   | `eatMaybe`
`expect`  | `consume` | `consumeToken` | `eatOrDie`

### Utility Parse Methods

name            | ...
----------------|----
`parseList`     | ...
`parseSequence` | ...
`parseWrapped`  | ...

### Control Flow

name       | ...
-----------|----
`dispatch` | ...
`when`     | ...

```javascript
// not working yet bc .parsePattern .toNode and .withName not implemented yet on Tokenfresser
const SignatureList = TF.parseList(rule.Parameter,          ", ()").withName('SignatureList');
const DataObject    = TF.parseList(rule.PropertyAssignment, ', {}').withName('DataObject');
const Parameter     = TF.parsePattern(`IDENTIFIER : IDENTIFIER`, '?!?').toNode('Parameter').withName('Parameter');

// without Tokenfresser
const Parameter = named(
  match('IDENTIFIER').capture('paramName')
  . then.consume(':')
  . then.match('IDENTIFIER').capture('paramType')
  . node('Parameter'),
  'Parameter'
);
const Parameter = named(
  seq(
    match('IDENTIFIER').capture('paramName'),
    consume(':'),
    match('IDENTIFIER').capture('paramType')
  ).node('Parameter'),
  'Parameter'
);
```
