/**
 * utils/nativeInstaller/updateResult.ts
 *
 * 更新结果记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tfmhpnyx.js (5)
 * attribution: placement 5
 */
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFileReader } from "../fileStore.js";
import { isENOENT } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tfmhpnyx.js:1418-1614 placement
var updateResultSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tfmhpnyx.js:1418", () => {
  updateResultSchema = DoctorLazy(() =>
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
});
//@ chunk-tfmhpnyx.js:1614-1669 placement
function lastUpdateResultPath() {
  return join(getClaudeConfigDir(), ".last-update-result.json");
}
//@ chunk-tfmhpnyx.js:1669-1720 placement
function lastUpdateResultStorageKey() {
  return STORAGE_SPACES.state("last-update-result");
}
//@ chunk-tfmhpnyx.js:1720-2017 placement
async function recordUpdateResult(result, storageV5) {
  if (isStorageV5Enabled() && storageV5) {
    let writeResult = await storageV5.write(lastUpdateResultStorageKey(), jsonStringify(result), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok)
      logForDebugging(`Failed to record update result: ${writeResult.error.code}`, {
        level: "error",
      });
    return;
  }
  if (isDiskless()) return;
  try {
    await getFileReader().atomicWrite(lastUpdateResultPath(), jsonStringify(result));
  } catch (error) {
    logForDebugging(`Failed to record update result: ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-tfmhpnyx.js:2017-2474 placement
async function readUpdateResult(storageV5) {
  let text;
  if (isStorageV5Enabled() && storageV5) {
    let readResult = await storageV5.read([lastUpdateResultStorageKey()]);
    if (!readResult.ok) {
      logForDebugging(`Failed to read update result: ${readResult.error.code}`, {
        level: "error",
      });
      return null;
    }
    let item = readResult.value.items[0];
    if (!item.found) return null;
    text = Buffer.from(item.value).toString("utf8");
  } else {
    if (isDiskless()) return null;
    try {
      text = await getFileReader().read(lastUpdateResultPath());
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(`Failed to read update result: ${error}`, {
          level: "error",
        });
      return null;
    }
  }
  try {
    let parsed = updateResultSchema().safeParse(jsonParse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export { recordUpdateResult, readUpdateResult };
