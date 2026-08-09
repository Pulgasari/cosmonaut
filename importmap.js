// @cosmonaut/importmap.js
(() => {

const pkg = [
  'compiler',
  'parsers',
];

const map = { imports: {
  "@cosmonaut/compiler" : "./packages/compiler/index.js",
  "@cosmonaut/ebnf"     : "./packages/ebnf/index.js",
  "@cosmonaut/layouter" : "./packages/layouter/index.js",
  "@cosmonaut/lsd"      : "./packages/lsd/index.js",
  "@cosmonaut/parsers"  : "./packages/parsers/index.js",

  "@cosmonaut/parsers/"  : "./packages/parsers/",
  "@cosmonaut/layouter/" : "./packages/layouter/",
  "@cosmonaut/compiler/" : "./packages/compiler/"
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
