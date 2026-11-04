// Prints function definitions (balanced braces) by name from restored chunks.
// node fn.cjs <restored-dir> <chunk|*> name1 [name2 ...]   (max 1500 chars each)
const fs = require('fs'), path = require('path');
const [dir, chunk, ...names] = process.argv.slice(2);
const files = chunk === '*' ? fs.readdirSync(dir).filter(f => f.endsWith('.js')) : [chunk];
const MAX = Number(process.env.MAX || 1500);
for (const f of files) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const n of names) {
    const esc = n.replace(/[$]/g, '\\$');
    const re = new RegExp('(?:function\\s+' + esc + '\\s*\\(|(?<![\\w$.])' + esc + '\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[\\w$]+)\\s*=>|var\\s+' + esc + '\\s*=)', 'g');
    let m;
    while ((m = re.exec(t))) {
      let i = t.indexOf('{', m.index), depth = 0, j = i;
      if (i < 0 || i - m.index > 200) { console.log(`${f} ${n} @${m.index}: ${t.slice(m.index, m.index + 300)}`); continue; }
      for (; j < t.length; j++) { const c = t[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) break; } }
      const body = t.slice(m.index, j + 1);
      console.log(`${f} ${n} @${m.index}: ${body.length > MAX ? body.slice(0, MAX) + '…(' + body.length + ')' : body}\n`);
    }
  }
}
