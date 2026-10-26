// Restores the module table of an official Claude Code Linux ELF (Bun
// standalone, bytecode build) into the source tree the patcher reads: every
// module by its bundled name (cli.js the entry), JS modules with their bundler
// references made relative and assets imported as files, plus package.json
// (the version) and reconstruction.json (the binary SHA-256 and each module's
// source SHA-256). Read only; the output directory must not exist.
//   node restore-bun.cjs <official-ELF> <new-output-dir> <version>
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const parser=require('@babel/parser');
const [input,out,version]=process.argv.slice(2);
if(!input||!out||!/^\d+\.\d+\.\d+$/.test(version??'')||fs.existsSync(out))throw Error('Usage: node restore-bun.cjs official-ELF new-output-dir version');
const b=fs.readFileSync(input),tail=b.lastIndexOf('\n---- Bun! ----\n')-32;
if(tail<0)throw Error('Missing trailer');
const base=tail-Number(b.readBigUInt64LE(tail)),table=base+b.readUInt32LE(tail+8),tableBytes=b.readUInt32LE(tail+12);
if(base<0||tableBytes%52)throw Error('Unsupported module table');
const modules=[];
for(let p=table;p<table+tableBytes;p+=52){
 const ptr=i=>({offset:base+b.readUInt32LE(p+i),length:b.readUInt32LE(p+i+4)});
 const name=ptr(0),data=ptr(8);for(const x of [name,data])if(x.offset<base||x.offset+x.length>tail)throw Error('Out of bounds');
 const full=b.toString('utf8',name.offset,name.offset+name.length),file=full.replace(/^.*\/root\//,'');
 if(file.split('/').includes('..')||file.includes(':')||file.startsWith('/')||file.includes('\\'))throw Error('Unsafe name');
 const loader=b[p+49],encoding=b[p+48],bytes=b.subarray(data.offset,data.offset+data.length);
 modules.push({name:full,file:file==='cli'?'cli.js':file,loader,encoding,data,bytes,source:[1,13].includes(loader)?bytes.toString(encoding===2?'utf16le':'latin1'):null});
}
const byName=new Map(modules.map(m=>[m.name,m]));
const requireExports=new Map();
for(const m of modules.filter(m=>m.loader===1)){
 const aliases=[...m.source.matchAll(/\b([\w$]+)=import\.meta\.require\b/g)].map(x=>x[1]);
 if(aliases.length)requireExports.set(m.name,new Set(aliases));
}
fs.mkdirSync(out,{recursive:true});
const report=[];const unresolved=[];
for(const m of modules){
 fs.mkdirSync(path.dirname(path.join(out,m.file)),{recursive:true});
 if(m.loader!==1){fs.writeFileSync(path.join(out,m.file),m.loader===13?m.source:m.bytes);continue;}
 const ast=parser.parse(m.source,{sourceType:'module'}),edits=[],assetImports=new Map(),aliases=new Set(['require']);
 for(const n of ast.program.body)if(n.type==='ImportDeclaration')for(const s of n.specifiers)if(requireExports.get(n.source.value)?.has(s.imported?.name))aliases.add(s.local.name);
 for(const a of requireExports.get(m.name)??[])aliases.add(a);
 const isRequire=n=>n?.type==='Identifier'&&aliases.has(n.name)||n?.type==='MemberExpression'&&n.object.type==='MetaProperty'&&n.property.name==='require';
 const asset=(dep)=>{if(!assetImports.has(dep.name))assetImports.set(dep.name,`__cc_resource_${assetImports.size}`);return assetImports.get(dep.name);};
 const relative=dep=>'./'+path.posix.relative(path.posix.dirname(m.file),dep.file);
 function visit(n,parent,key){
  if(!n||typeof n!=='object')return;
  if(n.type==='CallExpression'&&isRequire(n.callee)&&n.arguments.length===1&&n.arguments[0].type==='StringLiteral'){
   const dep=byName.get(n.arguments[0].value);
   if(dep&&[5,13].includes(dep.loader)){edits.push({start:n.start,end:n.end,text:asset(dep)});return;}
   if(dep)edits.push({start:n.callee.start,end:n.callee.end,text:'require'});
  }
  if(n.type==='ImportDeclaration'){
   const dep=byName.get(n.source.value);
   if(dep&&[5,13].includes(dep.loader)&&!(n.attributes?.length)){
    const at=m.source[n.end-1]===';'?n.end-1:n.end;
    edits.push({start:at,end:at,text:` with { type: "${dep.loader===13?'text':'file'}" }`});
   }
  }
  if(n.type==='StringLiteral'&&(/^(B:\/~BUN|\/\$bunfs)\/root\//.test(n.value))){
   const dep=byName.get(n.value);
   if(!dep){if(!n.value.endsWith('/root/'))unresolved.push({file:m.file,value:n.value});return;}
   const spec=(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(parent?.type)&&key==='source')||parent?.type==='ImportExpression'||parent?.type==='CallExpression'&&(isRequire(parent.callee)||parent.callee.type==='Import'||parent.callee.type==='MemberExpression'&&parent.callee.property.name==='resolve');
   edits.push({start:n.start,end:n.end,text:spec?JSON.stringify(relative(dep)):dep.loader===5?asset(dep):`(import.meta.dir+${JSON.stringify('/'+relative(dep))})`});return;
  }
  for(const [k,v]of Object.entries(n)){if(k==='loc'||k==='extra'||k==='comments'||k.endsWith('Comments'))continue;if(Array.isArray(v)){for(const c of v)visit(c,n,k);}else if(v&&typeof v==='object')visit(v,n,k);}
 }
 visit(ast,null,'');let text=m.source;
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 const imports=[...assetImports].map(([name,alias])=>{const dep=byName.get(name);return `import ${alias} from ${JSON.stringify(relative(dep))} with { type: "${dep.loader===13?'text':'file'}" };`;}).join('\n');
 text=imports+'\n'+text;parser.parse(text,{sourceType:'module'});fs.writeFileSync(path.join(out,m.file),text);
 report.push({name:m.name,file:m.file,offset:m.data.offset,sourceSha256:crypto.createHash('sha256').update(m.bytes).digest('hex'),edits:edits.length,resourceImports:assetImports.size});
}
if(!fs.readFileSync(path.join(out,'cli.js'),'utf8').includes('VERSION:"'+version+'"'))throw Error('The entry does not name version '+version);
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({name:'claude-code-local-reconstruction',version,private:true,type:'module'},null,2));
fs.writeFileSync(path.join(out,'reconstruction.json'),JSON.stringify({input,binarySha256:crypto.createHash('sha256').update(b).digest('hex'),entry:modules[b.readUInt32LE(tail+16)].file,moduleCount:modules.length,jsCount:report.length,unresolved,modules:report},null,2));
console.log(JSON.stringify({out,modules:modules.length,js:report.length,unresolved}));

