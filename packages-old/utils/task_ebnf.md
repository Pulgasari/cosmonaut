# task: EBNF

at `packages/utils/ebnf.js` an "parseMethods-from-EBNF-grammar-generator" is located which now should be refactored:

to be build from `packages/lexer` and `packages/parser` and finally become a public utility mainly to be used as `makeRules/MethodsFromEBNFFile`.

Ich denke es wäre sinnvoll Teile davon vorher (oder erst hinterher?) als kleine wiederverwendbare Logiken auszulagern 

1. Zum Beispiel als `parser/block`-Blöcke, sodass es da vllt. fortan auch Böcke wie `ebnfExpression` oder `ebnfPattern` gibt oder so ähnlich. Also nicht um damit ganze Sprachen zu parsen, sondern auch mal kurzerhand eine Abfolge via EBNF-Notation zu definieren.

2. Die CosmonautParser-Class könnte direkt ne EBNF als Config-Input mit bekommen können, sodass die Regeln dann als parseMethoden verfügbar sind.

Und ähnliches. Hier sollten wir mal gründlich überlegen/planen/konzipieren.
