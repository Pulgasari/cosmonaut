// @cosmonaut/lsd/meta.js

// Parses META PROP / META LIST / META TABLE lines into a plain data
// structure. TABLE parsing spans multiple lines (schema block + row
// block), so it consumes the full META section's raw lines rather than
// operating line-by-line like PROP/LIST.

export function parseMeta (metaLines) {
  const props  = {};
  const lists  = {};
  const tables = {};

  const source = metaLines.join('\n');

  // META PROP name == <expr text> (expr text left as a raw string for now -
  // shares the same open questions as grammar.js's RULE expressions)
  for (const match of source.matchAll(/^META PROP\s+(\S+)\s*==\s*(.+)$/gm)) {
    const [, name, exprText] = match;
    props[name] = exprText.trim();
  }

  // META LIST name == word word word ...
  for (const match of source.matchAll(/^META LIST\s+(\S+)\s*==\s*(.+)$/gm)) {
    const [, name, wordsText] = match;
    lists[name] = wordsText.trim().split(/\s+/);
  }

  // META TABLE name == ( field is Type ... ) { rows... }
  for (const match of source.matchAll(/^META TABLE\s+(\S+)\s*==\s*\(([\s\S]*?)\)\s*\{([\s\S]*?)^\}/gm)) {
    const [, name, schemaText, rowsText] = match;
    tables[name] = parseTable(schemaText, rowsText);
  }

  return { props, lists, tables };
}

function parseTable (schemaText, rowsText) {
  const fields = schemaText
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [, fieldName, fieldType] = line.match(/^(\S+)\s+is\s+(\S+)$/) ?? [];
      if (!fieldName) throw new Error(`[lsd] Malformed table field: "${line}"`);
      return { name: fieldName, type: fieldType };
    });

  const rows = rowsText
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => parseTableRow(line, fields));

  return { fields, rows };
}

function parseTableRow (line, fields) {
  // last field is assumed to be the "list of symbols" column,
  // written as "( a b c )" - everything before it is positional scalar values
  const listMatch    = line.match(/\(([^)]*)\)\s*$/);
  const scalarPart   = listMatch ? line.slice(0, listMatch.index).trim() : line;
  const scalarValues = scalarPart.split(/\s+/).filter(Boolean);

  const row = {};
  fields.slice(0, scalarValues.length).forEach((field, i) => {
    row[field.name] = scalarValues[i];
  });

  if (listMatch) {
    const lastField = fields[fields.length - 1];
    row[lastField.name] = listMatch[1].trim().split(/\s+/).filter(Boolean);
  }

  return row;
}
