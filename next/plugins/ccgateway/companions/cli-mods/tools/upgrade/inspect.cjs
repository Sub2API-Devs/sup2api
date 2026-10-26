// Print a module-scope binding (or a whole module with name '-') of a restored tree,
// optionally only the context around each search term.
//   node inspect.cjs <root> <file> <name|-> [term...]
const fs=require('fs'),path=require('path');const parser=require('@babel/parser');
const [root,file,name,...terms]=process.argv.slice(2);let text=fs.readFileSync(path.join(root,file),'utf8');
if(name!=='-'){const found=[];(function walk(n){if(!n||typeof n!=='object')return;if((n.id?.name===name&&['FunctionDeclaration','VariableDeclarator','ClassDeclaration'].includes(n.type))||(n.type==='ClassMethod'&&n.key?.name===name))found.push(n);for(const[k,v]of Object.entries(n)){if(['loc','extra','comments'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}})(parser.parse(text,{sourceType:'module'}));if(found.length!==1)throw Error('bindings '+found.length);text=text.slice(found[0].start,found[0].end)}
if(!terms.length)console.log(text.slice(0,Number(process.env.MAX??20000)));else{console.log(text.slice(0,180));for(const term of terms){let start=0,count=0;while((start=text.indexOf(term,start))>=0&&count++<5){console.log('['+term+'] @'+start+':',text.slice(Math.max(0,start-200),start+term.length+300));start+=term.length}if(!count)console.log('['+term+'] NOT FOUND')}}
