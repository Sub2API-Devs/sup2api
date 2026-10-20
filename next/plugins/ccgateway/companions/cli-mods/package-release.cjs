// Package a compiled native ELF and its patch manifest for the Worker image.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [binary,patchFile,outputArg]=process.argv.slice(2);
if(!binary||!patchFile||!outputArg)throw Error('Usage: node package-release.cjs native-ELF ccgateway-patch.json new-release-directory');
const output=path.resolve(outputArg);if(fs.existsSync(output))throw Error('Release output already exists');
const patch=JSON.parse(fs.readFileSync(patchFile,'utf8')),version=patch.baseline?.split('/').at(-1);
const releases={'2.1.302':'ccgateway-v11-native-build-parameters','2.1.304':'ccgateway-v12-feature-policy'};
if(!Object.hasOwn(releases,version)||releases[version]!==patch.extension)throw Error('Unsupported patch release');
const bytes=fs.readFileSync(binary);if(bytes.subarray(0,4).toString('hex')!=='7f454c46')throw Error('Expected native Linux ELF');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(path.join(output,version),{recursive:true});
fs.writeFileSync(path.join(output,version,'claude'),bytes,{mode:0o755});
fs.copyFileSync(patchFile,path.join(output,version,'ccgateway-patch.json'));
const manifest={schema:1,versions:{[version]:{path:version+'/claude',sha256,patch:patch.extension,modes:['build','direct']}}};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
