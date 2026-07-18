pkg cosmonaut::parser::blocks // flow

fn decorate = c => c;

fn backtrack = (p, combinator) => {
  return p.save() |> (combinator(p) ?? p.restore(@));   
};

fn backtrack = (p, combinator) => {
  return combinator(p) ?? p.save() |> p.restore(@);
};

fn backtrack = (p, combinator) => {
  return combinator(p) ?? p.save() |> p.restore;
};

fn choice = (...list |> @.flat as f) => decorate(p => {
  return loop (f as c) do backtrack(p,c) ?? null      
});

fn choice = (...list |> @.flat as f) => decorate (
  p => loop (f as c) do backtrack(p,c) ?? null
);

//
fn backtrack = (p, combinator) => combinator(p) ?? p.save() |> p.restore;
fn choice = (...list |> @.flat as f) => decorate p => loop (f as c) do backtrack(p,c) ?? null;  

// minified
fn backtrack=p,c=>c??p.save()|>p.restore;
fn choice=...list|>@.flat as f=>decorate p=>loop(f as c)do backtrack(p,c)??null;  


const backtrack = (p, combinator) => {
  return combinator(p) ?? p.restore(p.save());
};

export const choice = (...list) => decorate(p => {
  for (const c of list.flat()) {
    const result = backtrack(p,c);
    if (result != null) return result;
  }
  return null;
});

export const lazy = fn => decorate(parser => {
  return fn()(parser);
});

export const lookAhead = c => decorate(parser => {
  const pos = parser.save();
  const result = c(parser);
  parser.restore(pos);
  return result;
});

export const not = c => decorate(parser => {
  return lookAhead(c)(parser) ? null : true;
});

export const optional = c => decorate(parser => {
    return backtrack(parser, c);
});

export const seq = (...list) => decorate(parser => {
  const pos = parser.save();
  const results = [];

  for (const c of list.flat()) {
    const result = c(parser);
    if (result == null) {
      parser.restore(pos);
      return null;
    }
    results.push(result);
  }

  return results;
});

