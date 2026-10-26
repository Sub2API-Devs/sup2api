// Looks up a pairing made by equiv.cjs (old version -> new version): old keys
// searched among old keys; prints the new key, status and how it was paired.
//   node lookup.cjs <equiv.json> <key-or-name>...
const r=require(require('path').resolve(process.argv[2]));const inv=new Map(Object.entries(r.map).map(([a,b])=>[b,a]));
const status=new Map();for(const s of r.report)for(const c of [{key:s.resolved,status:s.status},...s.closure.changed])status.set(c.key,c.status);
for(const q of process.argv.slice(3)){const keys=q.includes(':')?[q]:Object.keys(r.map).filter(k=>k.endsWith(':'+q));
 if(q.startsWith('new:')){console.log(q,'<- old',inv.get(q.slice(4)));continue}
 for(const k of keys.length?keys:[q])console.log(k,'->',r.map[k]??'UNMAPPED',status.get(k)??'',JSON.stringify(r.conflicts.filter(c=>c.old===k).map(c=>[c.first,c.second,c.how])).slice(0,300))}
