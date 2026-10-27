// Package a compiled native ELF and its patch manifest for the Worker image.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [binary,patchFile,outputArg]=process.argv.slice(2);
if(!binary||!patchFile||!outputArg)throw Error('Usage: node package-release.cjs native-ELF ccgateway-patch.json new-release-directory');
const output=path.resolve(outputArg);if(fs.existsSync(output))throw Error('Release output already exists');
const patch=JSON.parse(fs.readFileSync(patchFile,'utf8')),version=patch.baseline?.split('/').at(-1);
// The version profile names the patch its patcher produces, so a manifest from
// an older patcher run cannot be packaged under the current source.
const profileFile=/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version??'')&&path.join(__dirname,'profiles','linux-x64-'+version+'.json');
const profile=profileFile&&fs.existsSync(profileFile)?JSON.parse(fs.readFileSync(profileFile,'utf8')):null;
if(!profile||profile.version!==version||!profile.extension||profile.extension!==patch.extension)throw Error('Unsupported patch release: '+patch.extension+' is not the current patch of '+version);
const bytes=fs.readFileSync(binary);if(bytes.subarray(0,4).toString('hex')!=='7f454c46')throw Error('Expected native Linux ELF');
// The compiler is part of what the release is: Bun's TLS stack is what
// upstream sees, so the ELF must come from the Bun the profile names.
if(!profile.bunVersion||patch.bunVersion!==profile.bunVersion)throw Error('The patch manifest bunVersion '+patch.bunVersion+' is not the profile bunVersion '+profile.bunVersion);
if(profile.bunVersion&&!bytes.includes(Buffer.from('Bun v'+profile.bunVersion+' (')))throw Error('The ELF was not built by Bun '+profile.bunVersion+' (profile bunVersion)');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(path.join(output,version),{recursive:true});
fs.writeFileSync(path.join(output,version,'claude'),bytes,{mode:0o755});
fs.copyFileSync(patchFile,path.join(output,version,'ccgateway-patch.json'));
const manifest={schema:1,versions:{[version]:{path:version+'/claude',sha256,patch:patch.extension,modes:['build','direct']}}};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
