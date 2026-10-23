// The recovered CLI 2.1.304 source the native reconciliation tests run
// against. It is not in Git (artifacts/). Where the directory exists those
// tests must run: a file missing inside it fails them instead of skipping.
// Where it does not exist they are skipped and the reason is printed on
// stderr, so a CI log shows that the native checks did not run;
// CCG_REQUIRE_ARTIFACTS=1 (for a CI that provides the tree) makes the absence
// a failure instead.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const restored = new URL('../../../../../../artifacts/claude-2.1.304/linux-restored/', import.meta.url);
export const restoredAvailable = fs.existsSync(restored);

// nativeSkip is the node:test skip option for a test that runs native code:
// false where the recovered source exists, else the printed reason.
export function nativeSkip(what) {
  if (restoredAvailable) return false;
  const reason = `Recovered CLI 2.1.304 source unavailable at ${fileURLToPath(restored)}: ${what} not executed`;
  if (process.env.CCG_REQUIRE_ARTIFACTS === '1') throw Error(`${reason} (CCG_REQUIRE_ARTIFACTS=1)`);
  process.stderr.write(`CCG_NATIVE_TEST_SKIPPED ${reason}\n`);
  return reason;
}
