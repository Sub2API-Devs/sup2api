// Field-level check of the only remaining messages difference in the subagent
// cases: the hand-back text must differ only in the reported duration/agent id.
// node msgs-diff.cjs <capture-root> <case...>
const fs = require('fs'), path = require('path');
const root = process.argv[2], cases = process.argv.slice(3);
const load = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^req-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const mask = s => s.replace(/a[0-9a-f]{16}/g, '<agent>').replace(/duration_ms: \d+/g, 'duration_ms: <n>').replace(/"duration_ms":\s*\d+/g, '"duration_ms":<n>');
for (const c of cases) {
  const A = load(path.join(root, c, 'a')), B = load(path.join(root, c, 'b'));
  console.log(`${c} A=${A.length} B=${B.length}`);
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    const ma = mask(JSON.stringify(A[i].body.messages || null)), mb = mask(JSON.stringify(B[i].body.messages || null));
    if (ma !== mb) {
      let k = 0; while (ma[k] === mb[k]) k++;
      console.log(`  #${i + 1} differs at ${k}\n    A: …${ma.slice(Math.max(0, k - 80), k + 120)}\n    B: …${mb.slice(Math.max(0, k - 80), k + 120)}`);
    } else console.log(`  #${i + 1} same after masking agent ids and durations`);
  }
}
