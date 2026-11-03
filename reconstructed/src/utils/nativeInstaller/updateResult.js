/**
 * utils/nativeInstaller/updateResult.ts
 *
 * 更新结果记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hntsfzas.js (5)
 * attribution: placement 5
 */
import { join, join as join_2 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { getClaudeConfigDir } from "../envUtils.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFileReader } from "../fileStore.js";
import { isENOENT } from "../errors.js";

//@ chunk-hntsfzas.js:1385-1581 placement
var updateResultSchema = DoctorLazy(() =>
  create({
    timestamp: create_2(),
    path: create_26(["npm-global", "npm-local", "native"]),
    outcome: create_26(["success", "failed"]),
    status: create_2(),
    version_from: create_2(),
    version_to: create_2().nullable(),
    error_code: create_2().nullable(),
  }),
);
//@ chunk-hntsfzas.js:1581-1636 placement
function S() {
  return join_2(getClaudeConfigDir(), ".last-update-result.json");
}
//@ chunk-hntsfzas.js:1636-1687 placement
function M() {
  return STORAGE_SPACES.state("last-update-result");
}
//@ chunk-hntsfzas.js:1687-1984 placement
async function recordUpdateResult(e, n) {
  if (isStorageV5Enabled() && n) {
    let write = await n.write(M(), jsonStringify(e), { mode: 438 & ~process.umask() });
    if (!write.ok) logForDebugging(`Failed to record update result: ${write.error.code}`, { level: "error" });
    return;
  }
  if (isDiskless()) return;
  try {
    await getFileReader().atomicWrite(S(), jsonStringify(e));
  } catch (error) {
    logForDebugging(`Failed to record update result: ${error}`, { level: "error" });
  }
}
//@ chunk-hntsfzas.js:1984-2441 placement
async function readUpdateResult(e) {
  let n;
  if (isStorageV5Enabled() && e) {
    let read = await e.read([M()]);
    if (!read.ok)
      return (logForDebugging(`Failed to read update result: ${read.error.code}`, { level: "error" }), null);
    let o = read.value.items[0];
    if (!o.found) return null;
    n = Buffer.from(o.value).toString("utf8");
  } else {
    if (isDiskless()) return null;
    try {
      n = await getFileReader().read(S());
    } catch (error) {
      if (!isENOENT(error)) logForDebugging(`Failed to read update result: ${error}`, { level: "error" });
      return null;
    }
  }
  try {
    let safeParse = updateResultSchema().safeParse(jsonParse(n));
    return safeParse.success ? safeParse.data : null;
  } catch {
    return null;
  }
}

export { readUpdateResult, recordUpdateResult };
