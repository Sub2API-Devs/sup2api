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
import { join, join as join_2 } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { open, unlink, writeFile, readdir, stat, stat as stat_2 } from "fs/promises";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-2cbdmxy9.js:4616-4661 placement
var ORCHESTRATOR_DEBUG_LIMITS = 5000,
  Fe = 512,
  qe = 1000,
  ue = 65536,
  je = 300000;
//@ chunk-2cbdmxy9.js:4661-4855 placement
async function writeWorkOrderFile(e, t) {
  let r = join_2(tmpdir(), `${e}-${randomBytes(6).toString("hex")}`),
    n = await open(r, "wx", 384);
  try {
    await n.writeFile(t);
  } catch (error) {
    throw (await unlink(r).catch(() => {}), error);
  } finally {
    await n.close();
  }
  return r;
}
//@ chunk-2cbdmxy9.js:4855-5417 placement
async function writeDebugArtifacts(e, t, r, n, h) {
  let o = join_2(e, t.jti);
  try {
    (await writeFile(`${o}.jwt`, r, { mode: 384 }),
      await writeFile(`${o}.json`, jsonStringify(t, null, 2), { mode: 384 }),
      await writeFile(`${o}.stderr`, n, { mode: 384 }));
  } catch (error) {
    h(`[runner:orchestrator] debug-dir write failed: ${errorMessage(error)}`);
  }
  try {
    let l = Date.now() - je,
      g = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jwt|json|stderr)$/;
    for (let c of await readdir(e)) {
      if (!g.test(c)) continue;
      let S = join_2(e, c),
        s = await stat_2(S).catch(() => null);
      if (s?.isFile() && s.mtimeMs < l) await unlink(S).catch(() => {});
    }
  } catch (error) {
    h(`[runner:orchestrator] debug-dir prune failed: ${errorMessage(error)}`);
  }
}
//@ chunk-2cbdmxy9.js:5417-5544 placement
function hasControlChars(e) {
  for (let t = 0; t < e.length; t++) {
    let code = e.charCodeAt(t);
    if (code < 32 || (code >= 127 && code <= 159) || code === 8232 || code === 8233) return !0;
  }
  return !1;
}

export { hasControlChars, writeWorkOrderFile, ORCHESTRATOR_DEBUG_LIMITS, ue, Fe, qe, writeDebugArtifacts };
