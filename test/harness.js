// test harness - shared by every suite.
//
// a suite is a plain module with side effects: import what it needs from
// here, call section() / check() / show(), done. index.html loads it and
// calls finish() afterwards.

const out = document.getElementById('out');

let passed = 0;
let failed = 0;

// :::::: Output

export function section (title) {
  const heading = document.createElement('h2');
  heading.textContent = title;
  out.appendChild(heading);
}

export function show (label, body) {
  const pre = document.createElement('pre');
  pre.innerHTML = `<span class="label">${label}</span>\n` + escapeHtml(body);
  out.appendChild(pre);
}

// :::::: Assertions

export function check (label, actual, expected) {
  const hit = String(actual) === String(expected);
  hit ? passed++ : failed++;

  const pre = document.createElement('pre');
  pre.innerHTML =
    `<span class="${hit ? 'ok' : 'fail'}">${hit ? 'PASS' : 'FAIL'}</span> ` +
    `<span class="label">${label}</span>\n` +
    escapeHtml(String(actual)) +
    (hit ? '' : `\n<span class="label">expected:</span>\n${escapeHtml(String(expected))}`);
  out.appendChild(pre);

  return hit;
}

// asserts that `fn` throws; the message is shown, not swallowed
export function throws (label, fn) {
  try {
    fn();
    return check(label, 'no error', 'throws');
  } catch (err) {
    passed++;
    const pre = document.createElement('pre');
    pre.innerHTML = `<span class="ok">PASS</span> <span class="label">${label}</span>\n` +
                    escapeHtml(err.message);
    out.appendChild(pre);
    return true;
  }
}

export function fatal (err, context = '') {
  failed++;
  const pre = document.createElement('pre');
  pre.innerHTML = `<span class="fail">ERROR</span> <span class="label">${context}</span>\n` +
                  escapeHtml(err?.stack ?? String(err));
  out.appendChild(pre);
}

// wraps a block so one broken section does not kill the rest of the suite
export function suite (title, fn) {
  section(title);
  try { fn(); } catch (err) { fatal(err, title); }
}

// :::::: Summary

export function finish () {
  const summary = document.getElementById('summary');
  summary.innerHTML = failed === 0
    ? `<span class="ok">all ${passed} checks passed</span>`
    : `<span class="fail">${failed} failed</span> <span class="label">/ ${passed} passed</span>`;
}

// :::::: internal

function escapeHtml (value) {
  return String(value).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
