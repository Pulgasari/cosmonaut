// packages/generator/classes/Generator.js

import { print }       from '@cosmonaut/doc-printer';
import * as docBlocks  from '@cosmonaut/doc';
import { isTitleCase } from '@cosmonaut/internals';

import genBinaryExprMethod from '../methods/genBinaryExpr.js';
import genUnaryExprMethod  from '../methods/genUnaryExpr.js';
import genListMethod       from '../methods/genList.js';

// :::::: Helpers

function normalizeMethodName (key) {
  if (key.startsWith('gen') && key.length > 3 && isTitleCase(key.slice(3))) return key.slice(3);
  if (isTitleCase(key)) return key;
  throw new Error(`[Generator] Invalid method name "${key}" (expected "genMethodName" or "MethodName").`);
}

// core instance surface that node-type registration must never overwrite.
const RESERVED_CORE_NAMES = new Set(['$', 'addMethod', 'gen', 'generate', 'genNode', 'options', '_methods']);

const defaultOptions = {
  methods      : {},
  printOptions : {},
};

export default class Generator {

  // :::::: init

  constructor (options = {}) {
    this.options = { ...defaultOptions, ...options };

    // `g.$` mirrors @cosmonaut/parser's `p.$`: a stable toolkit namespace,
    // deliberately kept SEPARATE from the per-node-type `g.genX()` dispatch
    // methods registered below. Reusable codegen utilities (precedence-
    // climbing binary/unary expression rendering, list rendering) live
    // here - NOT as `g.genBinaryExpr`/`g.genUnaryExpr`/`g.genList` - because
    // a node type is free to be named "BinaryExpr"/"UnaryExpr"/"List" (very
    // plausible for a real grammar; poo.lsd itself has a "BinaryExpr"
    // block). Registering such a node type would otherwise silently shadow
    // the built-in utility of the same name, turning any internal call to
    // it into infinite self-recursion instead of a clear error. Routing
    // through `g.$` avoids the collision entirely, regardless of what node
    // types get registered - no manual re-importing needed.
    this.$ = {
      ...docBlocks,
      genBinaryExpr : (node, config, parentPrecedence = 0) => genBinaryExprMethod(this, node, config, parentPrecedence),
      genUnaryExpr  : (node, config)  => genUnaryExprMethod (this, node,  config),
      genList       : (items, config) => genListMethod      (this, items, config),
    };

    this._methods = {};
    this._buildGen();
    this._registerMethods(this.options.methods);
  }

  // :::::: Node Dispatch

  // Looks up a registered method by the AST node's own `type`, e.g. a
  // node `{ type: 'BinaryExpression', ... }` dispatches to whichever
  // method was registered as `genBinaryExpression` / `BinaryExpression`.
  genNode (node) {
    if (!node || typeof node.type !== 'string') {
      throw new Error('[Generator] genNode() requires a node with a string "type" property.');
    }
    return this.gen(node.type, node);
  }

  // :::::: Run

  // Renders `node` (defaulting to whatever was passed as options.root)
  // all the way down to a string, via @cosmonaut/doc-printer.
  generate (node = this.options.root, printOptions = this.options.printOptions) {
    return print(this.genNode(node), printOptions);
  }

  // :::::: Method Registration

  addMethod (key, fn) {
    this._registerMethods({ [key]: fn });
    return this;
  }

  // :::::: internal

  _buildGen () {
    const self = this;

    function gen (name, ...args) {
      const method = self._methods[name];
      if (!method) throw new Error(`[Generator] No gen method registered for "${name}".`);
      return method(self, ...args);
    }

    this.gen = gen;
  }

  _registerMethods (methods = {}) {
    for (const [key, fn] of Object.entries(methods)) {
      if (typeof fn !== 'function') continue;

      const name    = normalizeMethodName(key);
      const genName = 'gen' + name;

      if (RESERVED_CORE_NAMES.has(genName) || RESERVED_CORE_NAMES.has(name)) {
        throw new Error(
          `[Generator] Cannot register a method for node type "${name}": "${genName}" collides with a ` +
          `reserved core Generator property. Rename the node type or the registration key.`
        );
      }

      const bound = (...args) => fn(this, ...args);

      this._methods[name]  = fn;
      this[name]            = bound; // g.MethodName()
      this[genName]         = bound; // g.genMethodName()
      this.gen[name]        = bound; // g.gen['MethodName'](), g.gen.MethodName()
    }
  }

}
