// Package scripts holds the shell and node programs the controller runs in
// account containers and one-shot jobs, byte for byte as in Python 0.1.118
// (manager.py, worker_update.py, runtime_updates.py). The reference-vector
// test compares every one of them with the Python source.
//
// FROZEN.
package scripts

// PrepareVolume is manager.PREPARE_VOLUME (PV17).
const PrepareVolume = `mkdir -p /work/config /work/data; rm -f /work/data/environment.json; ` +
	`printf '{"auto_update":false,"channel":"stable"}\n' > /work/data/cli-update.json; ` +
	`chown -R 1000:1000 /work`

// NFTReplace is manager.NFT_REPLACE (the guard owns the copy it runs; kept
// for the vector test and documentation).
const NFTReplace = `if nft list table inet ccg_app >/dev/null 2>&1; then ` +
	`{ printf "delete table inet ccg_app\n"; cat /app.nft; } | nft -f -; ` +
	`else nft -f /app.nft; fi; `

// Probe is manager.PROBE_SCRIPT: node -e Probe <probe_url> (A8 ③).
const Probe = `fetch(process.argv[1],{signal:AbortSignal.timeout(10000)})` +
	`.then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`

// DiskQuota is the verify_disk_quota program for limit bytes (PV10).
func DiskQuota(limit string) string {
	return "const fs=require('fs'),s=fs.statfsSync('/work',{bigint:true});" +
		"if(s.blocks<=0n||s.blocks*s.bsize>BigInt('" + limit + "'))process.exit(42);"
}

// WorkerHealth is worker_update.WORKER_HEALTH_SCRIPT (W8).
const WorkerHealth = `fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})` +
	`.then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))`

// Trust is runtime_updates.TRUST_SCRIPT (P3).
const Trust = "\n" +
	"const f=require('fs'),p=require('path'),root='/opt/ccgateway/cli';\n" +
	"for(let q=root;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||!s.isDirectory()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted CLI root');if(q==='/')break;}\n" +
	"const a=root+'/active-runtime.json';if(f.existsSync(a)){let s=f.lstatSync(a);if(s.isSymbolicLink()||!s.isFile()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted active runtime');}\n"

// Info is runtime_updates.INFO_SCRIPT (P4).
const Info = "\n" +
	"const f=require('fs'),p=require('path'),c=require('crypto'),cp=require('child_process');\n" +
	"const file=process.argv[1],version=process.argv[2],patch=process.argv[3],sha=process.argv[4];\n" +
	"if(!file.startsWith('/opt/ccgateway/cli/'))throw Error('outside CLI root');\n" +
	"for(let q=file;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted CLI path');if(q==='/')break;}\n" +
	"if(c.createHash('sha256').update(f.readFileSync(file)).digest('hex')!==sha)throw Error('CLI hash mismatch');\n" +
	"const i=JSON.parse(cp.execFileSync(file,['--ccgateway-info'],{timeout:15000,maxBuffer:8192,env:{...process.env,DISABLE_AUTOUPDATER:'1'}}));\n" +
	"if(i.version!==version||i.patch!==patch)throw Error('CLI identity mismatch');\n" +
	"for(const k of JSON.parse(process.argv[5]))if(!i.capabilities?.includes(k))throw Error('missing capability');\n"

// LegacySnapshot is runtime_updates.LEGACY_SNAPSHOT_SCRIPT (P10).
const LegacySnapshot = "\n" +
	"const f=require('fs'),p=require('path'),c=require('crypto'),cp=require('child_process'),expected=JSON.parse(process.argv[1]),root='/opt/ccgateway/cli/';\n" +
	"const file=f.realpathSync(expected.path||'/usr/local/bin/claude');\n" +
	"if(!file.startsWith(root))throw Error('legacy CLI is outside trusted root');\n" +
	"for(let q=file;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted legacy CLI');if(q==='/')break;}\n" +
	"let stat=f.statSync(file);if(!stat.isFile()||stat.size>536870912)throw Error('invalid legacy CLI file');\n" +
	"const sha=c.createHash('sha256').update(f.readFileSync(file)).digest('hex');\n" +
	"const i=JSON.parse(cp.execFileSync(file,['--ccgateway-info'],{timeout:15000,maxBuffer:8192,env:{...process.env,DISABLE_AUTOUPDATER:'1'}}));\n" +
	"if(!/^[0-9]{1,5}\\.[0-9]{1,5}\\.[0-9]{1,5}$/.test(i.version)||!/^ccgateway-[a-z0-9-]+$/.test(i.patch))throw Error('invalid legacy CLI identity');\n" +
	"if(expected.version&&expected.version!==i.version||expected.sha256&&expected.sha256!==sha||expected.patch&&expected.patch!==i.patch)throw Error('legacy CLI pin mismatch');\n" +
	"const modes=['direct','build'].filter(m=>i.capabilities?.includes('request_'+m));if(modes.length!==2)throw Error('legacy CLI lacks request modes');\n" +
	"process.stdout.write(JSON.stringify({version:i.version,path:file.slice(root.length),sha256:sha,patch:i.patch,modes}));\n"

// PairHealth is runtime_updates.HEALTH_SCRIPT (P6).
const PairHealth = `fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})` +
	`.then(async r=>{const x=await r.json();if(r.status!==200||x.cli_version!==process.argv[1]` +
	`||x.cli_patch!==process.argv[2]||x.cli_sha256!==process.argv[3])process.exit(1);` +
	`for(const c of JSON.parse(process.argv[4]))` +
	`if(!x.capabilities?.includes(c))process.exit(1);}).catch(()=>process.exit(1))`

// Required capabilities of a staged CLI (P4) and of the restarted Worker (P6).
var (
	Required       = []string{"request_direct", "request_build", "build_attachment_sources_v2", "build_billing_sources_v1", "build_content_preservation_v1"}
	HealthRequired = []string{"build_attachment_sources_v2", "build_billing_sources_v1", "build_content_preservation_v1", "request_policy_mode_v1"}
)

// Telemetry is manager.TELEMETRY_ENV (PV16), in Python's order.
var Telemetry = [][2]string{
	{"DISABLE_AUTOUPDATER", "1"},
	{"DISABLE_TELEMETRY", "1"},
	{"DO_NOT_TRACK", "1"},
	{"DISABLE_ERROR_REPORTING", "1"},
	{"DISABLE_GROWTHBOOK", "1"},
	{"CLAUDE_CODE_ENABLE_TELEMETRY", "0"},
	{"DISABLE_FEEDBACK_COMMAND", "1"},
	{"CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY", "1"},
}

// SSListen is the activation's gateway readiness check (A8 ②).
var SSListen = []string{"sh", "-ec", "ss -lnt | grep -q :15001"}

// SSEstablished is collect's "is the gateway idle" check (G14).
var SSEstablished = []string{"ss", "-Hnt", "state", "established"}

// IPAddr lists the gateway's interfaces (G4).
var IPAddr = []string{"ip", "-j", "-4", "addr"}
