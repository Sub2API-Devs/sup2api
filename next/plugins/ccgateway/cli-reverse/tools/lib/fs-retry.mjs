// Retries file operations that Windows fails transiently while another process (an indexer, a virus
// scanner, the editor's file watcher) holds a freshly written file open: EPERM / EBUSY / EACCES /
// UNKNOWN on rename, open and unlink. Loaded by tools/pipeline.sh for every stage:
//   node --import ./tools/lib/fs-retry.mjs <tool>
// A real permission problem still fails, after about 5 seconds of retries. No effect on other platforms.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

if (process.platform === 'win32') {
  const TRANSIENT = new Set(['EPERM', 'EBUSY', 'EACCES', 'UNKNOWN']);
  const TRIES = 50, DELAY_MS = 100;
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const retrySync = (fn) => function (...args) {
    for (let i = 1; ; i++) {
      try { return fn.apply(this, args); } catch (e) { if (!TRANSIENT.has(e.code) || i >= TRIES) throw e; sleep(DELAY_MS); }
    }
  };
  const retryCb = (fn) => function (...args) {
    const cb = args.pop();
    let i = 0;
    const attempt = () => fn.call(this, ...args, (e, ...r) => (e && TRANSIENT.has(e.code) && ++i < TRIES ? setTimeout(attempt, DELAY_MS) : cb(e, ...r)));
    attempt();
  };
  // writeFileSync and friends open the file inside the binding, not through fs.openSync: wrap them too
  for (const k of ['renameSync', 'openSync', 'unlinkSync', 'rmSync', 'copyFileSync', 'writeFileSync', 'appendFileSync', 'readFileSync', 'mkdirSync']) fs[k] = retrySync(fs[k]);
  // fs.createWriteStream / createReadStream open through fs.open
  for (const k of ['rename', 'open', 'unlink']) fs[k] = retryCb(fs[k]);
  syncBuiltinESMExports();
}
