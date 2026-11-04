#!/usr/bin/env node
// Downloads an official Claude Code release binary and its manifest from the public release
// bucket, and checks the binary against the manifest's sha256 and size.
//   node tools/extract/acquire.mjs <version> [platform=linux-x64] [outdir=artifacts/official/<version>]
// Output: <outdir>/official-manifest.json, <outdir>/claude-<platform> (not in git, see .gitignore).
// Existing binaries are kept (only re-checked). The 2.1.316 binary of this project lives at
// artifacts/official/claude-linux-x64 (the path tools/pipeline.sh and README use).
// Same steps as the per-version acquire.py scripts of sup2api (artifacts/claude-<version>/acquire.py).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [version, platform = 'linux-x64', outArg] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('usage: node tools/extract/acquire.mjs <version> [platform=linux-x64] [outdir]');
  process.exit(2);
}
const out = outArg ?? path.join('artifacts/official', version);
const base = `https://downloads.claude.ai/claude-code-releases/${version}/`;
fs.mkdirSync(out, { recursive: true });

const res = await fetch(base + 'manifest.json', { signal: AbortSignal.timeout(45_000) });
if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`);
const manifest = await res.json();
if (manifest.version !== version) throw new Error(`manifest is for ${manifest.version}, not ${version}`);
fs.writeFileSync(path.join(out, 'official-manifest.json'), JSON.stringify(manifest, null, 2));
const item = manifest.platforms?.[platform];
if (!item) throw new Error(`no ${platform} in the manifest (${Object.keys(manifest.platforms ?? {}).join(', ')})`);

const target = path.join(out, `claude-${platform}`);
if (!fs.existsSync(target)) {
  const bin = await fetch(`${base}${platform}/${item.binary ?? 'claude'}`, { signal: AbortSignal.timeout(600_000) });
  if (!bin.ok) throw new Error(`binary: HTTP ${bin.status}`);
  await pipeline(Readable.fromWeb(bin.body), fs.createWriteStream(target + '.part'));
  fs.renameSync(target + '.part', target);
}
const bytes = fs.readFileSync(target);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
if (sha256 !== item.checksum || bytes.length !== item.size) throw new Error(`checksum mismatch: ${sha256} ${bytes.length} (manifest ${item.checksum} ${item.size})`);
console.log(JSON.stringify({ platform, version, sha256, bytes: bytes.length, file: target }));
