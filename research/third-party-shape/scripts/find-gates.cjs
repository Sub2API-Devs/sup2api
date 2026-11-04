// Lists use sites of functions exported from a chunk (default: the first-party gates of chunk-v9tcvh08.js)
// usage: node find-gates.cjs <restored-dir> [names] [source-chunk]
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const names = (process.argv[3] || 'us,Oi,Pu,GK').split(',');
const src = process.argv[4] || 'chunk-v9tcvh08.js';
const esc = s => s.replace(/[$]/g, '\\$');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  const local = {};
  if (f === src) { for (const n of names) local[n] = n; }
  else {
    const re = new RegExp('import\\{([^}]*)\\}from"\\./' + src.replace('.', '\\.') + '"', 'g'); let m;
    while ((m = re.exec(t))) for (const p of m[1].split(',')) { const [a, b] = p.split(' as '); if (names.includes(a.trim())) local[a.trim()] = (b || a).trim(); }
  }
  for (const [orig, loc] of Object.entries(local)) {
    const re = new RegExp('(?<![\\w$.])' + esc(loc) + '\\(', 'g'); let m;
    while ((m = re.exec(t))) {
      if (t.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
      console.log(`${f}\t${orig}\t@${m.index}\t` + t.slice(Math.max(0, m.index - 220), m.index + 160).replace(/\n/g, ' '));
    }
  }
}
