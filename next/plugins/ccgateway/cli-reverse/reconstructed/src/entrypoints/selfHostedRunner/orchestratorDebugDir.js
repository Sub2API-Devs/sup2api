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
async function writeWorkOrderFile(jti, content) {
  let filePath = join(tmpdir(), `${jti}-${randomBytes(6).toString("hex")}`);
  let handle = await open(filePath, "wx", 384);
  try {
    await handle.writeFile(content);
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  } finally {
    await handle.close();
  }
  return filePath;
}
//@ chunk-2cbdmxy9.js:4855-5417 placement
async function writeDebugArtifacts(debugDir, claims, workOrder, stderrText, onDebug) {
  let prefix = join(debugDir, claims.jti);
  try {
    await writeFile(`${prefix}.jwt`, workOrder, {
      mode: 384,
    });
    await writeFile(`${prefix}.json`, jsonStringify(claims, null, 2), {
      mode: 384,
    });
    await writeFile(`${prefix}.stderr`, stderrText, {
      mode: 384,
    });
  } catch (error) {
    onDebug(`[runner:orchestrator] debug-dir write failed: ${errorMessage(error)}`);
  }
  try {
    let cutoff = Date.now() - DEBUG_LOG_TTL_MS;
    let artifactRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jwt|json|stderr)$/;
    for (let name of await readdir(debugDir)) {
      if (!artifactRegex.test(name)) continue;
      let fullPath = join(debugDir, name);
      let stats = await stat(fullPath).catch(() => null);
      if (stats?.isFile() && stats.mtimeMs < cutoff) await unlink(fullPath).catch(() => {});
    }
  } catch (error) {
    onDebug(`[runner:orchestrator] debug-dir prune failed: ${errorMessage(error)}`);
  }
}
//@ chunk-2cbdmxy9.js:5417-5544 placement
function hasControlChars(text) {
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
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
