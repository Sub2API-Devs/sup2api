// Lists every once()/replace replacement text in the anchor files that holds a
// String.prototype.replace special pattern ($$, $&, $`, $', $<n>, $<name>),
// and confirms the patched output contains each replacement verbatim.
const fs = require('fs'), path = require('path');
const parser = require(path.resolve(process.argv[2], 'node_modules/@babel/parser'));
const [mods, version, patched] = process.argv.slice(2);
const text = fs.readFileSync(path.join(mods, 'patches', version + '.cjs'), 'utf8');
const hazards = [], replacements = [];
(function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'CallExpression' && n.callee?.name === 'once' && n.arguments.length === 3) {
    const to = n.arguments[2];
    if (to.type === 'StringLiteral') { replacements.push(to.value); if (/\$[$&`'0-9<]/.test(to.value)) hazards.push(to.value.slice(0, 120)); }
  }
  for (const [k, v] of Object.entries(n)) { if (['loc', 'extra', 'comments'].includes(k)) continue; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); }
})(parser.parse(text, { sourceType: 'script' }));
console.log(JSON.stringify({ replacements: replacements.length, hazards }));
if (patched) {
  const all = fs.readdirSync(patched).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(patched, f), 'utf8'));
  const missing = replacements.filter(r => !all.some(t => t.includes(r)));
  console.log(JSON.stringify({ verbatimInOutput: replacements.length - missing.length, missing: missing.map(m => m.slice(0, 100)) }));
}
