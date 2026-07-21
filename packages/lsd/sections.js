// @cosmonaut/lsd/sections.js
//
// Splits raw LSD source into its top-level sections. Pure line
// classification, no expression parsing - deliberately kept independent
// of how META/TKN/RULE/HL bodies are eventually parsed, since that part
// of the syntax is still in flux.

const SECTION_KEYWORDS = ['META', 'TKN', 'RULE', 'HL'];

export function splitSections (source) {
  const lines    = source.split('\n');
  const sections = { META: [], TKN: [], RULE: [], HL: [], BLOCKS: [] };

  let currentBlock = null; // accumulates a "#### Name" ... block until the next section/block starts

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '' || isDecorativeCommentLine(line)) continue;

    if (line.startsWith('####')) {
      if (currentBlock) sections.BLOCKS.push(currentBlock);
      currentBlock = { header: line.replace(/^#+\s*/, ''), lines: [] };
      continue;
    }

    const keyword = SECTION_KEYWORDS.find(kw => line.startsWith(kw + ' '));

    if (currentBlock && !keyword) {
      // still inside a #### block until we hit a line NOT belonging to it
      // (a bare META/TYPE/RULE/CODE line inside the block, or a blank/comment)
      currentBlock.lines.push(rawLine);
      continue;
    }

    if (currentBlock && keyword) {
      // a #### block's own META/RULE/... lines also start with these
      // keywords - only close the block once we hit a TOP-LEVEL section
      // keyword that is NOT immediately preceded by block content pointing
      // at the same block. See grammar.js for the actual disambiguation;
      // for now sections.js keeps blocks and top-level sections separate
      // by relying on the "#### Name" marker as the sole block delimiter.
      currentBlock.lines.push(rawLine);
      continue;
    }

    if (keyword) sections[keyword].push(rawLine.trim());
  }

  if (currentBlock) sections.BLOCKS.push(currentBlock);

  return sections;
}

function isDecorativeCommentLine (line) {
  // lines like "# ====...====" or "# /////...////" used purely as visual separators
  if (!line.startsWith('#')) return false;
  const body = line.replace(/^#+/, '').trim();
  return body === '' || /^[=\/]+$/.test(body);
}
