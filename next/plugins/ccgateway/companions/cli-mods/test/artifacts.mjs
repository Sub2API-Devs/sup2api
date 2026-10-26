// The Claude Code version under test and its recovered source. The version is
// CCG_CLI_VERSION, else the newest profile (profiles/linux-x64-<version>.json);
// tests that run native code live in test/native/<version>/ and pin their own
// version (pinned). The recovered source is artifacts/claude-<version>/
// linux-restored, which is not in Git. Where the directory exists the native
// reconciliation tests must run: a file missing inside it fails them instead
// of skipping. Where it does not exist they are skipped and the reason is
// printed on stderr, so a CI log shows that the native checks did not run;
// CCG_REQUIRE_ARTIFACTS=1 (for a CI that provides the tree) makes the absence
// a failure instead.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const profiles = new URL('../profiles/', import.meta.url);
const parts = name => name.split('.').map(Number);
const order = (a, b) => { const x = parts(a), y = parts(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
export const versions = fs.readdirSync(profiles).map(name => /^linux-x64-(\d+\.\d+\.\d+)\.json$/.exec(name)?.[1]).filter(Boolean).sort(order);

// pinned is everything a test needs about one version: its profile, its
// recovered source, its committed native fixtures, the skip rule, and the
// environment code as the patcher installs it into that version's core.
export function pinned(version) {
  if (!versions.includes(version)) throw Error(`No profile for Claude Code ${version}`);
  const profile = JSON.parse(fs.readFileSync(new URL(`linux-x64-${version}.json`, profiles), 'utf8'));
  const restored = new URL(`../../../../../../artifacts/claude-${version}/linux-restored/`, import.meta.url);
  const restoredAvailable = fs.existsSync(restored);
  return {
    version, profile, restored, restoredAvailable,
    fixture: name => new URL(`./fixtures/${name}-${version}.json`, import.meta.url),
    nativeSkip(what) {
      if (restoredAvailable) return false;
      const reason = `Recovered CLI ${version} source unavailable at ${fileURLToPath(restored)}: ${what} not executed`;
      if (process.env.CCG_REQUIRE_ARTIFACTS === '1') throw Error(`${reason} (CCG_REQUIRE_ARTIFACTS=1)`);
      process.stderr.write(`CCG_NATIVE_TEST_SKIPPED ${reason}\n`);
      return reason;
    },
    // environmentSource is native-environment.inc.js with each native_<name>
    // named as the patcher names it in this version's core.
    environmentSource() {
      const text = fs.readFileSync(new URL('../native-environment.inc.js', import.meta.url), 'utf8');
      return text.replace(/\bnative_([A-Za-z0-9_$]+)/g, (whole, name) => {
        if (Object.hasOwn(profile.coreScope, name)) return profile.coreScope[name];
        if (Object.hasOwn(profile.coreImports, name)) return 'ccgateway_native_' + name;
        throw Error(`native_${name} is not mapped by the ${version} profile`);
      });
    },
  };
}

export const version = process.env.CCG_CLI_VERSION || versions.at(-1);
const current = pinned(version);
export const { profile, restored, restoredAvailable, fixture, nativeSkip } = current;
