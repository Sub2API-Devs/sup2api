// Within-side consistency checks and scenario specifics that the A/B diff
// cannot show (IDs are random in each run). node checks.cjs <capture-root>
const fs = require('fs'), path = require('path');
const root = process.argv[2] || '/t/cap';
const load = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^req-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const j = JSON.stringify;
const hdr = r => { const m = {}; for (let i = 0; i + 1 < r.rawHeaders.length; i += 2) m[r.rawHeaders[i].toLowerCase()] = r.rawHeaders[i + 1]; return m; };
const bill = r => { const s = r.body?.system; const first = Array.isArray(s) ? s[0]?.text : s; return typeof first === 'string' && first.startsWith('x-anthropic-billing-header:') ? first.split('\n')[0] : ''; };
const field = (line, name) => line.match(new RegExp('(?:^|[ ;])' + name + '=([^;]*)'))?.[1];
const uid = r => { try { return JSON.parse(JSON.parse(r.body.metadata.user_id)); } catch { return JSON.parse(r.body.metadata?.user_id ?? '{}'); } };

for (const name of fs.readdirSync(root).sort()) {
  const dir = path.join(root, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const side of ['a', 'b']) {
    const list = load(path.join(dir, side));
    if (!list.length) continue;
    console.log(`\n#### ${name}/${side}  ${list.length} requests`);
    for (const r of list) {
      const h = hdr(r), b = bill(r), u = uid(r);
      const sys = r.body?.system, n = Array.isArray(sys) ? sys.length : sys ? 1 : 0;
      console.log(` -- ${path.basename(String(r.index).padStart(2, '0'))} url=${r.url} class=${h['x-claude-code-request-class']} type=${h['x-claude-code-agent-type'] ?? '-'}`
        + ` agent=${h['x-claude-code-agent-id'] ?? '-'} parent=${h['x-claude-code-parent-agent-id'] ?? '-'}`
        + ` session=${h['x-claude-code-session-id'] ?? '-'} promptHdr=${h['x-claude-code-prompt-id'] ?? '-'}`);
      console.log(`    billing: ${b || '(none)'}`);
      console.log(`    promptHeaderEqualsBilling=${field(b, 'cc_prompt_id') === h['x-claude-code-prompt-id']}`
        + ` subagentFlag=${field(b, 'cc_is_subagent') ?? '-'} sessionEqualsMetadata=${u.session_id === h['x-claude-code-session-id']}`
        + ` uid=${j(u)}`);
      console.log(`    system blocks=${n} cache=${j((Array.isArray(sys) ? sys : []).map(x => x.cache_control?.ttl ?? '-'))}`
        + ` tools=${j((r.body?.tools ?? []).map(t => t.name))} keys=${j(Object.keys(r.body ?? {}))}`);
    }
  }
}
