// @cosmonaut/lsd/sections.js

// Splits raw LSD source into its top-level areas (META / TKN / RULE / HL)
// plus the "#### Name" blocks nested inside the RULE area.
//
// Block boundaries are marked by a bare "META <Name>" line (NOT
// "META PROP/LIST/TABLE ..." - those are vocabulary definitions, handled
// separately by meta.js). A "#### FullName" line, if present, is pure
// documentation: it always immediately precedes the "META <Name>" line
// that actually starts the block, and is attached to that block as
// `fullName` - useful for later error messages / debugging ("error in
// block ValDeclOp (ValDeclarationOperator)"), but has no effect on
// where the block actually begins or ends.

const BARE_META_NAME = /^META\s+([A-Za-z_][A-Za-z0-9_]*)$/;
const META_VOCAB     = /^META\s+(PROP|LIST|TABLE)\b/;

export function splitSections (source) {
  const sections = { META: [], TKN: [], RULE: [], HL: [] };
  const blocks   = [];

  let mode         = null; // 'META' | 'TKN' | 'RULE' | 'HL'
  let currentBlock = null;
  let pendingLabel = null;

  const closeBlock = () => {
    if (currentBlock) blocks.push(currentBlock);
    currentBlock = null;
  };

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();

    if (line === '' || isPlainComment(line)) continue;

    if (isLabelLine(line)) {
      pendingLabel = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    if (META_VOCAB.test(line)) { mode = 'META'; closeBlock(); sections.META.push(rawLine); continue; }
    if (line.startsWith('TKN ')) { mode = 'TKN'; closeBlock(); sections.TKN.push(rawLine); continue; }
    if (line.startsWith('HL '))  { mode = 'HL';  closeBlock(); sections.HL.push(rawLine); continue; }

    if (mode !== 'RULE' && (line.startsWith('RULE ') || BARE_META_NAME.test(line))) {
      mode = 'RULE';
    }

    if (mode === 'RULE') {
      const bareMeta = line.match(BARE_META_NAME);

      if (bareMeta) {
        closeBlock();
        currentBlock = { fullName: pendingLabel, name: bareMeta[1], lines: [] };
        pendingLabel = null;
        continue;
      }

      if (currentBlock) currentBlock.lines.push(rawLine);
      else sections.RULE.push(rawLine); // top-level "RULE == Name == Expr"
      continue;
    }

    if (mode === 'META') sections.META.push(rawLine);
  }

  closeBlock();

  return { ...sections, BLOCKS: blocks };
}

// Any "#"-comment that ISN'T a "####" label - decorative banners like
// "# ////// META //////" or "# ------------ Declarations ----" included.
function isPlainComment (line) {
  return line.startsWith('#') && !line.startsWith('####');
}

function isLabelLine (line) {
  return line.startsWith('####');
}

