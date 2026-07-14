#

## Expressions

### Overview

name          | examples
--------------|---------
binary        | `a + b`
literal       | `42` `"hello"` `true` `null`
unary         | `!x`
unary  prefix | `!x` `-x` `++x`
unary postfix | `x++``x--`

#### binary

```ast
BinaryExpression
 |
 +-- left: 1
 |
 +-- operator: "+"
 |
 +-- right: 2
```

#### unary

```
UnaryExpression
 |
 +-- operator: "-"
 |
 +-- argument: x
```

#### identifier

```ast
Identifier
 name:"foo"
```

#### call

#### conditional

#### member

## Operators
