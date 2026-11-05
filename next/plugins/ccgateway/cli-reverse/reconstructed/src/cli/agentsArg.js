/**
 * cli/agentsArg.ts
 *
 * 2.1.316 新增：--agents JSON 文件的安全读取（拒绝硬链接/读取中被改动的文件、限制大小）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z823esss.js (3)
 * attribution: placement 3
 */
import { resolve } from "path";
import { open, realpath, stat } from "fs/promises";
import { stripBom, safeParseJSON } from "../utils/json.js";
import { nonblockingReadFlags } from "../utils/fsOperations.js";
import { assertSingleLink, readFileHandleChecked } from "../utils/fileRead.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";

//@ chunk-z823esss.js:435-606 placement
var AGENTS_FLAG_FILE_REQUIRES_PRINT =
  "Error: --agents takes a JSON object, or a file path only with --print (-p). Pass the agents as inline JSON, or run with -p to read them from a file.";
var MAX_AGENTS_FLAG_FILE_BYTES = 268435456;
//@ chunk-z823esss.js:606-688 placement
function looksLikeAgentsJson(text) {
  let trimmed = stripBom(text).trimStart();
  return trimmed.startsWith("{") || safeParseJSON(trimmed, false) !== null;
}
//@ chunk-z823esss.js:688-1532 placement
/**
 * 安全读取 --agents 指定的 JSON 文件：拒绝多硬链接、读取期间被改动的文件，限制大小。
 */
async function readAgentsFlagFile(agents) {
  let path = resolve(agents);
  try {
    await using handle = await open(path, nonblockingReadFlags());
    let stats = await handle.stat({
      bigint: true,
    });
    assertSingleLink(stats, path);
    let realPath = await realpath(path).catch(() => path);
    let realStats = await stat(realPath, {
      bigint: true,
    });
    if (realStats.dev !== stats.dev || realStats.ino !== stats.ino)
      return {
        ok: false,
        error: `Error: --agents file changed while it was read: ${path}`,
      };
    let { content } = await readFileHandleChecked(handle, path, MAX_AGENTS_FLAG_FILE_BYTES);
    return {
      ok: true,
      json: content,
      filePath: path,
      realPath,
    };
  } catch (error) {
    switch (getErrnoCode(error)) {
      case "ENOENT":
        return {
          ok: false,
          error: `Error: --agents file not found: ${path} (a value that is not a JSON object is read as a file path)`,
        };
      case "ERR_FILE_TOO_LARGE":
        return {
          ok: false,
          error: `Error: --agents file is larger than ${MAX_AGENTS_FLAG_FILE_BYTES} bytes: ${path}`,
        };
      case "ERR_MULTIPLE_LINKS":
        return {
          ok: false,
          error: `Error: --agents file has more than one hard link: ${path} (its other names are not write-protected; pass a file with one name)`,
        };
      default:
        return {
          ok: false,
          error: `Error reading --agents file ${path}: ${errorMessage(error)}`,
        };
    }
  }
}
export { looksLikeAgentsJson, AGENTS_FLAG_FILE_REQUIRES_PRINT, readAgentsFlagFile };
