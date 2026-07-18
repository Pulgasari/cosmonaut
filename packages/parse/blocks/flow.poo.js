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

fn lookAhead = c => decorate (p =>
  do p.save() |> c(p) |> p.restore(@0) and return @1
);

// not intended too write this way but still understandable
fn backtrack = (p, combinator) => combinator(p) ?? p.save() |> p.restore;
fn choice = (...list |> @.flat as f) => decorate p => loop (f as c) do backtrack(p,c) ?? null;  

// minified
fn backtrack=p,c=>c??p.save()|>p.restore;
fn choice=...list|>@.flat as f=>decorate p=>loop(f as c)do backtrack(p,c)??null;  

//////////////////////////////////////

fn backtrack = (p, combinator) => {
  return combinator(p) ?? p.save() |> p.restore(@);
};

fn choice = (...list |> @.flat as f) => decorate(p => {
  return loop (f as c) do backtrack(p,c) ?? null      
});

fn lazy = fn => decorate p => fn()(p);

fn lookAhead = c => decorate (p =>
  do p.save() |> c(p) |> p.restore(@0) and return @1
);

fn not      = c => decorate p => !lookAhead (c)(p) ?! null;
fn optional = c => decorate p =>  backtrack (p,c);

fn seq = (...list |> @.flat() as f) => decorate(
  p => #([], p.save()) |> for (f as c) do @.0 += c(p) or break and p.restore(@.1);
);

fn seq = (...list |> @.flat() as f) => decorate(
  p => [] |> p.save() |> for (f as c) do @0 += c(p) or break and p.restore(@1);
);



//////////////////////////////////

const backtrack = (p, combinator) => {
  return combinator(p) ?? p.restore(p.save());
};

const choice = (...list) => decorate(p => {
  for (const c of list.flat()) {
    const result = backtrack(p,c);
    if (result != null) return result;
  }
  return null;
});

const lazy = fn => decorate(p => fn()(p));

const lookAhead = c => decorate(p => {
  const pos = p.save();
  const result = c(p);
  p.restore(pos);
  return result;
});

const not = c => decorate (p => {
  return lookAhead(c)(p) ? null : true;
});

const optional = c => decorate(p => {
    return backtrack(p,c);
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

