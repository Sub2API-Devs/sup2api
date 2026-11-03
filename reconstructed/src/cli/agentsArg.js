/**
 * cli/agentsArg.ts
 *
 * 2.1.316 新增：--agents JSON 文件的安全读取（拒绝硬链接/读取中被改动的文件、限制大小）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r6sb8a4p.js (3)
 * attribution: placement 3
 */
import { resolve } from "path";
import { open, realpath, stat } from "fs/promises";
import { Wo, safeParseJSON } from "../utils/json.js";
import { nonblockingReadFlags } from "../utils/fsOperations.js";
import { assertSingleLink, readFileHandleChecked } from "../utils/fileRead.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";

//@ chunk-r6sb8a4p.js:435-606 placement
var AGENTS_FLAG_FILE_REQUIRES_PRINT =
    "Error: --agents takes a JSON object, or a file path only with --print (-p). Pass the agents as inline JSON, or run with -p to read them from a file.",
  s = 268435456;
//@ chunk-r6sb8a4p.js:606-688 placement
function looksLikeAgentsJson(t) {
  let trimStart = Wo(t).trimStart();
  return trimStart.startsWith("{") || safeParseJSON(trimStart, !1) !== null;
}
/**
 * 安全读取 --agents 指定的 JSON 文件：拒绝多硬链接、读取期间被改动的文件，限制大小。
 */
//@ chunk-r6sb8a4p.js:688-1532 placement
async function readAgentsFlagFile(t) {
  let e = resolve(t);
  try {
    await using r = await open(e, nonblockingReadFlags());
    let stats = await r.stat({ bigint: !0 });
    assertSingleLink(stats, e);
    let o = await realpath(e).catch(() => e),
      n = await stat(o, { bigint: !0 });
    if (n.dev !== stats.dev || n.ino !== stats.ino)
      return { ok: !1, error: `Error: --agents file changed while it was read: ${e}` };
    let { content: content } = await readFileHandleChecked(r, e, s);
    return { ok: !0, json: content, filePath: e, realPath: o };
  } catch (error) {
    switch (getErrnoCode(error)) {
      case "ENOENT":
        return {
          ok: !1,
          error: `Error: --agents file not found: ${e} (a value that is not a JSON object is read as a file path)`,
        };
      case "ERR_FILE_TOO_LARGE":
        return { ok: !1, error: `Error: --agents file is larger than ${s} bytes: ${e}` };
      case "ERR_MULTIPLE_LINKS":
        return {
          ok: !1,
          error: `Error: --agents file has more than one hard link: ${e} (its other names are not write-protected; pass a file with one name)`,
        };
      default:
        return { ok: !1, error: `Error reading --agents file ${e}: ${errorMessage(error)}` };
    }
  }
}

export { looksLikeAgentsJson, AGENTS_FLAG_FILE_REQUIRES_PRINT, readAgentsFlagFile };
