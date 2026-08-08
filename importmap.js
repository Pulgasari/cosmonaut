// @cosmonaut/importmap.js
(() => {

const pkg = [
  'compiler',
  'parsers',
];

const map = { imports: {
  "@cosmonaut/blocks"      : "./packages/parser/blocks/index.js",
  "@cosmonaut/doc"         : "./packages/generator/doc/index.js",     
  "@cosmonaut/doc-printer" : "./packages/generator/doc-printer/index.js",   
  "@cosmonaut/generator"   : "./packages/generator/index.js",     
  "@cosmonaut/internals"   : "./packages/internals/index.js",
  "@cosmonaut/lexer"       : "./packages/lexer/index.js",
  "@cosmonaut/lsd"         : "./packages/lsd/index.js",
  "@cosmonaut/parser"      : "./packages/parser/index.js",
  "@cosmonaut/presets"     : "./packages/presets/index.js",
  "@cosmonaut/utils"       : "./packages/utils/index.js",
  "@cosmonaut/utils/internals" : "./packages/utils/internals.js",
}};

  const mapURL = document.currentScript?.src;
  if (!mapURL) throw new Error('[cosmonaut] importmap injector must be a classic script');

  // rebase relative urls against this file, not the host page
  const rebase = m => { for (const k in m) m[k] = new URL(m[k], mapURL).href; return m; };
  rebase(map.imports);
  for (const s in map.scopes ?? {}) rebase(map.scopes[s]);

  document.currentScript.after(
    Object.assign(
      document.createElement('script'), {
        type: 'importmap', 
        textContent: JSON.stringify(map)
      }
    )
  );

})();
