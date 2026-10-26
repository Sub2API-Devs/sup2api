// Compare two JS files by token stream (comments ignored), with identifier renames applied to the second.
const fs=require('fs');const p=require('@babel/parser');
const [a,b,renames]=process.argv.slice(2);const map=new Map(Object.entries(JSON.parse(renames||'{}')));
const toks=(f,m)=>p.parse(fs.readFileSync(f,'utf8'),{sourceType:'module',tokens:true}).tokens.filter(t=>t.type!=='CommentLine'&&t.type!=='CommentBlock').map(t=>{const v=t.value===undefined?t.type.label:String(t.value);return m&&m.has(v)?m.get(v):v});
const x=toks(a),y=toks(b,map);let i=0;while(i<x.length&&x[i]===y[i])i++;
console.log(a.split('/').pop(), x.length===y.length&&i===x.length?'TOKEN-EQUAL':'DIFF at '+i+' old:'+x.slice(i,i+12).join(' ')+' | new:'+y.slice(i,i+12).join(' '));
