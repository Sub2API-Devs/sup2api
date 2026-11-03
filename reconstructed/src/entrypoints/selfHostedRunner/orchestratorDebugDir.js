/**
 * entrypoints/selfHostedRunner/orchestratorDebugDir.ts
 *
 * 2.1.316 新增：编排器调试目录写入（工作单与输出）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (4)
 * attribution: placement 4
 */
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { open, unlink, writeFile, readdir, stat } from "fs/promises";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-2cbdmxy9.js:4616-4661 placement
var ORCHESTRATOR_DEBUG_LIMITS = 5000;
var DEBUG_LOG_MAX_BYTES = 512;
var DEBUG_LOG_FLUSH_MS = 1000;
var DEBUG_LOG_CHUNK_BYTES = 65536;
var DEBUG_LOG_TTL_MS = 300000;
//@ chunk-2cbdmxy9.js:4661-4855 placement
async function writeWorkOrderFile(e, t) {
  let r = join(tmpdir(), `${e}-${randomBytes(6).toString("hex")}`);
  let n = await open(r, "wx", 384);
  try {
    await n.writeFile(t);
  } catch (error) {
    await unlink(r).catch(() => {});
    throw error;
  } finally {
    await n.close();
  }
  return r;
}
//@ chunk-2cbdmxy9.js:4855-5417 placement
async function writeDebugArtifacts(debugDir, claims, r, n, onDebug) {
  let o = join(debugDir, claims.jti);
  try {
    await writeFile(`${o}.jwt`, r, {
      mode: 384,
    });
    await writeFile(`${o}.json`, jsonStringify(claims, null, 2), {
      mode: 384,
    });
    await writeFile(`${o}.stderr`, n, {
      mode: 384,
    });
  } catch (error) {
    onDebug(`[runner:orchestrator] debug-dir write failed: ${errorMessage(error)}`);
  }
  try {
    let l = Date.now() - DEBUG_LOG_TTL_MS;
    let g = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jwt|json|stderr)$/;
    for (let c of await readdir(debugDir)) {
      if (!g.test(c)) continue;
      let S = join(debugDir, c);
      let s = await stat(S).catch(() => null);
      if (s?.isFile() && s.mtimeMs < l) await unlink(S).catch(() => {});
    }
  } catch (error) {
    onDebug(`[runner:orchestrator] debug-dir prune failed: ${errorMessage(error)}`);
  }
}
//@ chunk-2cbdmxy9.js:5417-5544 placement
function hasControlChars(e) {
  for (let j = 0; j < e.length; j++) {
    let code = e.charCodeAt(j);
    if (code < 32 || (code >= 127 && code <= 159) || code === 8232 || code === 8233) return true;
  }
  return false;
}
export {
  hasControlChars,
  writeWorkOrderFile,
  ORCHESTRATOR_DEBUG_LIMITS,
  DEBUG_LOG_CHUNK_BYTES,
  DEBUG_LOG_MAX_BYTES,
  DEBUG_LOG_FLUSH_MS,
  writeDebugArtifacts,
};
