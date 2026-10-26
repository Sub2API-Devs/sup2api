// Cross-version gateway comparison for the offline e2e kit: for every case and
// request, the component labels where the gateway's upstream body differs
// between two runs (official-diff.cjs's components, versions normalized), and
// the same for the A side (the official client sent straight upstream). A
// difference that the A side shows too comes from the client; one only on the
// B side comes from the gateway.
//   node crossversion.cjs <left capture root> <right capture root>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [L, R] = process.argv.slice(2);
const diffTool = path.join(__dirname, 'official-diff.cjs');
const tmp = fs.mkdtempSync('/tmp/xv-');
const labels = (a, b) => {
  fs.writeFileSync(tmp + '/a.json', a); fs.writeFileSync(tmp + '/b.json', b);
  let out; try { out = execFileSync(process.execPath, [diffTool, tmp + '/a.json', tmp + '/b.json'], { encoding: 'utf8' }); } catch (e) { out = e.stdout; }
  return JSON.parse(out.trim().split('\n').pop()).labels;
};
const reqs = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^req-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(r => r.url?.startsWith('/v1/messages') && !r.url.includes('count_tokens')) : [];
const summary = { gatewayOnly: {}, clientToo: {}, cases: 0, requests: 0, notJson: 0, countMismatch: [] };
for (const c of fs.readdirSync(L).sort()) {
  if (!fs.existsSync(path.join(R, c))) continue;
  const lb = reqs(path.join(L, c, 'b')), rb = reqs(path.join(R, c, 'b')), la = reqs(path.join(L, c, 'a')), ra = reqs(path.join(R, c, 'a'));
  if (lb.length !== rb.length) { summary.countMismatch.push(c); continue; }
  summary.cases++;
  lb.forEach((x, i) => {
    summary.requests++;
    let lbl; try { JSON.parse(x.rawBody); JSON.parse(rb[i].rawBody); lbl = labels(x.rawBody, rb[i].rawBody); } catch { summary.notJson++; return; }
    const alb = la[i] && ra[i] ? labels(la[i].rawBody, ra[i].rawBody) : null;
    for (const l of lbl) {
      const bucket = alb && alb.includes(l) ? summary.clientToo : summary.gatewayOnly;
      (bucket[l] ??= []).push(`${c}#${i + 1}`);
    }
  });
}
for (const k of ['gatewayOnly', 'clientToo']) summary[k] = Object.fromEntries(Object.entries(summary[k]).map(([l, w]) => [l, { count: w.length, where: w.slice(0, 6) }]));
console.log(JSON.stringify(summary, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
