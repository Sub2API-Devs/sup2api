// Old vs refactored support module: same code (tokens, comments and import
// declarations ignored, locals renamed) and the same native binding behind
// every local name (generated native modules resolved).
const fs=require('fs'),path=require('path');const p=require('@babel/parser');
const [A,B]=process.argv.slice(2);
const parse=f=>p.parse(fs.readFileSync(f,'utf8'),{sourceType:'module',tokens:true});
function reexports(dir,file){const m=new Map();for(const n of parse(path.join(dir,file)).program.body)if(n.type==='ExportNamedDeclaration'&&n.source)for(const s of n.specifiers)m.set(s.exported.name,n.source.value.slice(2)+':'+s.local.name);return m;}
function bindings(dir,file){const ast=parse(path.join(dir,file)),m=new Map(),ranges=[];
 for(const n of ast.program.body)if(n.type==='ImportDeclaration'){ranges.push([n.start,n.end]);const src=n.source.value.slice(2);for(const s of n.specifiers){const imp=s.imported?.name??'default';let target=src+':'+imp;if(src.startsWith('ccgateway-native-')){target=reexports(dir,src).get(imp)??'MISSING';}m.set(s.local.name,target)}}
 // dynamic native import (request-entry): await import('./x.js') destructured
 return {ast,m,ranges};}
let bad=0;
for(const f of ['ccgateway-request-betas.js','ccgateway-request-entry.js','ccgateway-request-natives.js','ccgateway-request-command.js','ccgateway-request-build.js']){
 const o=bindings(A,f),n=bindings(B,f);
 // local rename map new->old by binding target
 const byTarget=new Map([...o.m].filter(([,t])=>t.includes('chunk-')).map(([l,t])=>[t,l]));
 const ren=new Map();for(const [l,t] of n.m){if(!t.includes('chunk-')&&!t.startsWith('ccgateway-native'))continue;const old=byTarget.get(t);if(!old){console.log(f,'new binding not in old',l,t);bad++;continue}if(old!==l)ren.set(l,old)}
 for(const [l,t] of o.m)if(t.includes('chunk-')&&![...n.m.values()].includes(t)){console.log(f,'old binding missing',l,t);bad++}
 const toks=(x,map)=>x.ast.tokens.filter(t=>t.type!=='CommentLine'&&t.type!=='CommentBlock'&&!x.ranges.some(([s,e])=>t.start>=s&&t.end<=e)).map(t=>{const v=t.value===undefined?t.type.label:String(t.value);return map?.get(v)??v});
 const left=[...new Set(toks(n).filter(v=>[...ren.values()].includes(v)))];if(left.length){console.log(f,'LEFTOVER old names in new code:',left);bad++}
 const x=toks(o),y=toks(n,ren);let i=0;while(i<x.length&&x[i]===y[i])i++;
 const same=x.length===y.length&&i===x.length;if(!same)bad++;
 console.log(f,same?'EQUIVALENT':'DIFF at '+i+' old:'+x.slice(i,i+10).join(' ')+' | new:'+y.slice(i,i+10).join(' '),'renamed',JSON.stringify([...ren]));
}
process.exitCode=bad?1:0;
