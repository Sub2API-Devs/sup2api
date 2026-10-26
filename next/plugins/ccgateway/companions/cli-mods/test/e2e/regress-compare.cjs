// Compares two regression runs request by request: method, URL, header names
// in order and values, and the body, as the fake upstream received them
// (<capture-root>/<case>/b/req-N.json). Values that differ per run (IDs,
// timestamps, dates, durations, fingerprints of those) are masked first.
//   node regress-compare.cjs <left capture root> <right capture root> [rules.json]
// Left is the baseline, right the candidate. Exit status 1 when a case differs.
// rules.json (optional) states the differences that are known in advance, for
// two CLI versions (README "已知差异"):
//   { "replace": [["2.1.310", "2.1.304"]],     right-side text replaced by the left's
//     "ignoreHeaders": ["x-stainless-package-version"],   values not compared (names and order are)
//     "mask": ["\"speed\":\"[a-z]+\""],         regexes masked on both sides
//     "cases": ["main-build-low"] }              compare only these cases
// Everything a rule hides is listed once at the end, so a rule never hides silently.
const fs = require('fs'), path = require('path');
const [left, right, rulesFile] = process.argv.slice(2);
const rules = rulesFile ? JSON.parse(fs.readFileSync(rulesFile, 'utf8')) : {};
const replace = rules.replace ?? [], ignoreHeaders = new Set((rules.ignoreHeaders ?? []).map(h => h.toLowerCase()));
const extraMasks = (rules.mask ?? []).map(re => new RegExp(re, 'g'));
const hidden = new Map();
const hide = what => hidden.set(what, (hidden.get(what) ?? 0) + 1);
const mask = s => {
  let out = String(s)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b(msg|toolu|req|srvtoolu)_[A-Za-z0-9]+/g, '$1_<id>')
    .replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?/g, '<date>')
    .replace(/cch=[0-9a-f]{5}/g, 'cch=<cch>')
    .replace(/cc_version=([\d.]+)\.[0-9a-f]{3}/g, 'cc_version=$1.<fp>')
    .replace(/"(duration_ms|ttft_ms|elapsed_ms)":\d+/g, '"$1":<n>')
    .replace(/\b[0-9a-f]{64}\b/g, '<hex64>')
    .replace(/\ba[0-9a-f]{16}\b/g, '<agent>')
    .replace(/=\d+(?=,|$)/g, '=<n>')
    .replace(/duration_ms: \d+/g, 'duration_ms: <n>');
  for (const re of extraMasks) out = out.replace(re, m => { hide('mask ' + re.source); return '<masked>'; });
  return out;
};
// The candidate's text with the known replacements applied (right side only).
const known = s => {
  let out = String(s);
  for (const [from, to] of replace) if (out.includes(from)) { hide(`replace ${from} -> ${to}`); out = out.split(from).join(to); }
  return out;
};
const read = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith('req-')).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
const view = (r, side) => {
  const text = v => side === 'right' ? known(v) : String(v);
  const headers = [];
  for (let i = 0; i < r.rawHeaders.length; i += 2) {
    const name = r.rawHeaders[i];
    let value;
    if (/^(x-client-request-id|content-length)$/i.test(name)) value = '<v>';
    else if (ignoreHeaders.has(name.toLowerCase())) { value = '<ignored>'; if (side === 'right') hide('header ' + name.toLowerCase()); }
    else value = mask(text(r.rawHeaders[i + 1]));
    headers.push(name + ': ' + value);
  }
  return { line: r.method + ' ' + text(r.url), headers, body: mask(text(JSON.stringify(r.body))) };
};
const names = dir => fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).sort();
const selected = names(left).filter(name => !rules.cases || rules.cases.includes(name));
let differing = 0, total = 0;
for (const name of selected) {
  const a = read(path.join(left, name, 'b')).map(r => view(r, 'left')), b = read(path.join(right, name, 'b')).map(r => view(r, 'right'));
  total += a.length;
  const problems = [];
  if (!fs.existsSync(path.join(right, name))) problems.push('case missing on the right');
  if (a.length !== b.length) problems.push(`requests ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].line !== b[i].line) problems.push(`#${i + 1} line: ${a[i].line} | ${b[i].line}`);
    if (a[i].headers.join('\n') !== b[i].headers.join('\n')) {
      const d = a[i].headers.map((h, j) => h === b[i].headers[j] ? null : `    ${h}\n  | ${b[i].headers[j]}`).filter(Boolean);
      problems.push(`#${i + 1} headers (${a[i].headers.length} vs ${b[i].headers.length}):\n` + d.slice(0, 4).join('\n'));
    }
    if (a[i].body !== b[i].body) {
      let k = 0; while (a[i].body[k] === b[i].body[k]) k++;
      problems.push(`#${i + 1} body differs at ${k}: …${a[i].body.slice(Math.max(0, k - 60), k + 80)}\n  | …${b[i].body.slice(Math.max(0, k - 60), k + 80)}`);
    }
  }
  if (problems.length) { differing++; console.log('DIFF ' + name + '\n  ' + problems.join('\n  ')); }
  else console.log('SAME ' + name + ` (${a.length})`);
}
for (const name of names(right)) if (!names(left).includes(name) && (!rules.cases || rules.cases.includes(name))) console.log('ONLY-RIGHT ' + name);
console.log(`\n${differing} of ${selected.length} cases differ; ${total} requests compared`);
if (hidden.size) console.log('hidden by rules: ' + [...hidden].map(([what, n]) => `${what} (${n})`).join('; '));
process.exitCode = differing ? 1 : 0;
