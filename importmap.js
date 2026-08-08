// @cosmonaut/importmap.js
(() => {

const pkg = [
  'compiler',
  'parsers',
];

const map = { imports: {
  "@cosmonaut/blocks"      : "https://pulgasari.github.io/cosmonaut/packages/parser/blocks/index.js",
  "@cosmonaut/doc"         : "https://pulgasari.github.io/cosmonaut/packages/generator/doc/index.js",     
  "@cosmonaut/doc-printer" : "https://pulgasari.github.io/cosmonaut/packages/generator/doc-printer/index.js",   
  "@cosmonaut/generator"   : "https://pulgasari.github.io/cosmonaut/packages/generator/index.js",     
  "@cosmonaut/internals"   : "https://pulgasari.github.io/cosmonaut/packages/internals/index.js",
  "@cosmonaut/lexer"       : "https://pulgasari.github.io/cosmonaut/packages/lexer/index.js",
  "@cosmonaut/lsd"         : "https://pulgasari.github.io/cosmonaut/packages/lsd/index.js",
  "@cosmonaut/parser"      : "https://pulgasari.github.io/cosmonaut/packages/parser/index.js",
  "@cosmonaut/presets"     : "https://pulgasari.github.io/cosmonaut/packages/presets/index.js",
  "@cosmonaut/utils"       : "https://pulgasari.github.io/cosmonaut/packages/utils/index.js",
  "@cosmonaut/utils/internals" : "https://pulgasari.github.io/cosmonaut/packages/utils/internals.js",
}};

  const mapURL = document.currentScript?.src;
  if (!mapURL) throw new Error('[aufbau] importmap injector must be a classic script');

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
