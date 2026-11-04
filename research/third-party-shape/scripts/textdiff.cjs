// Line diff of two strings taken from capture records by a JS accessor.
// node textdiff.cjs <reqA.json> <reqB.json> '<expr on r.body, e.g. b.messages[1].content[0].text>' ['<exprB>']
const fs = require('fs');
const [fa, fb, ea, eb] = process.argv.slice(2);
const get = (f, e) => { const r = JSON.parse(fs.readFileSync(f, 'utf8')); const b = r.body; return eval(e); };
const A = String(get(fa, ea)).split('\n'), B = String(get(fb, eb || ea)).split('\n');
// LCS line diff
const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let k = m - 1; k >= 0; k--) L[i][k] = A[i] === B[k] ? L[i + 1][k + 1] + 1 : Math.max(L[i + 1][k], L[i][k + 1]);
let i = 0, k = 0;
while (i < n || k < m) {
  if (i < n && k < m && A[i] === B[k]) { i++; k++; continue; }
  if (k < m && (i >= n || L[i][k + 1] >= L[i + 1][k])) { console.log(`+B[${k + 1}] ${B[k]}`); k++; }
  else { console.log(`-A[${i + 1}] ${A[i]}`); i++; }
}
