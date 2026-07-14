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
