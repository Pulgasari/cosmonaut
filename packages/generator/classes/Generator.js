// @cosmonaut/generator/classes/Generator.js

import { print } from '@cosmonaut/doc-printer';
import * as docBlocks from '@cosmonaut/doc';

import genBinaryExprMethod from '../methods/genBinaryExpr.js';
import genUnaryExprMethod  from '../methods/genUnaryExpr.js';
import genListMethod       from '../methods/genList.js';

import { isTitleCase } from '@cosmonaut/utils/internals';

// :::::: Helpers

function normalizeMethodName (key) {
  if (key.startsWith('gen') && key.length > 3 && isTitleCase(key.slice(3))) return key.slice(3);
  if (isTitleCase(key)) return key;
  throw new Error(`[Generator] Invalid method name "${key}" (expected "genMethodName" or "MethodName").`);
}

const defaultOptions = {
  methods      : {},
  printOptions : {},
};

export default class Generator {

  // :::::: init

  constructor (options = {}) {
    this.options = { ...defaultOptions, ...options };
    this.$       = docBlocks;

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

  // :::::: Higher-Level Generating Methods

  genBinaryExpr (node, config, parentPrecedence = 0) {
    return genBinaryExprMethod(this, node, config, parentPrecedence);
  }

  genUnaryExpr (node, config) {
    return genUnaryExprMethod(this, node, config);
  }

  genList (items, config) {
    return genListMethod(this, items, config);
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

      const name  = normalizeMethodName(key);
      const bound = (...args) => fn(this, ...args);

      this._methods[name]  = fn;
      this[name]            = bound; // g.MethodName()
      this['gen' + name]    = bound; // g.genMethodName()
      this.gen[name]        = bound; // g.gen['MethodName'](), g.gen.MethodName()
    }
  }

}
