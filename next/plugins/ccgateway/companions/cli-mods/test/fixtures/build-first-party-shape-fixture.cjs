// Builds test/fixtures/first-party-shape-2.1.316.json from the 2026-11-03
// third-party captures (artifacts/cc-thirdparty/caps/step1): the official
// 2.1.316 client's Messages requests in the first-party shape (A: no base
// URL) and the third-party shape (B: ANTHROPIC_BASE_URL) of the same run
// kind, paired in order. Only the system blocks and the billing line are kept.
//   node build-first-party-shape-fixture.cjs <caps/step1> <out.json> [version]
//
// A version with no capture of its own (2.1.318) is taken from the 2.1.316
// capture, with only the billing header's cc_version moved to it: the request
// besides the header is the same, and the suffix stays the capture's own.
const fs = require('fs'), path = require('path');
const [root, out, wanted = '2.1.316'] = process.argv.slice(2);
const captured = '2.1.316';
const moved = text => typeof text === 'string' ? text.replace(/cc_version=2\.1\.316\./g, 'cc_version=' + wanted + '.') : text;
const moveSystem = system => system.map(block => typeof block.text === 'string' ? { ...block, text: moved(block.text) } : block);
const messages = dir => fs.readdirSync(dir).filter(f => /^req-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(r => r.url.startsWith('/v1/messages'));
const cases = [];
for (const [name, auth, kind] of [['oauth-p1', 'oauth', 'p1'], ['token-p1', 'token', 'p1'], ['apikey-p1', 'apikey', 'p1'], ['oauth-tui', 'oauth', 'tui'], ['oauth-sub', 'oauth', 'sub'], ['oauth-turn2', 'oauth', 'turn2']]) {
  const a = messages(path.join(root, `s1-${captured}-${auth}-A-${kind}`)), b = messages(path.join(root, `s1-${captured}-${auth}-B-${kind}`));
  if (a.length !== b.length) throw Error(`${name}: ${a.length} vs ${b.length} requests`);
  a.forEach((request, i) => cases.push({
    name: `${name}#${i + 1}`, model: request.body.model,
    a: { system: moveSystem(request.body.system), diagnostics: request.body.diagnostics, betas: request.headers['anthropic-beta'] },
    b: { system: moveSystem(b[i].body.system), betas: b[i].headers['anthropic-beta'] },
  }));
}
fs.writeFileSync(out, JSON.stringify({ provenance: `Official Claude Code ${wanted} Messages requests, first-party shape (a) and third-party shape (b)${wanted === '2.1.316' ? ' (sha256 fd13c700…d824)' : ', from the 2.1.316 capture with only the billing header version moved'}, artifacts/cc-thirdparty/caps/step1 (2026-11-03 capture)`, cases }, null, 1) + '\n');
console.log(cases.length, 'requests');
