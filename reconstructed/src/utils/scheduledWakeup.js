/**
 * utils/scheduledWakeup.ts
 *
 * 2.1.316 新增。定时唤醒。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-425yaf76.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { rm } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, string, E } from "../../vendor/zod/v4/classic/schemas.js";
import { logJobWriteError } from "../services/daemon/jobState.js";
import { replaceFileExclusive } from "../services/daemon/promptStash.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { isENOENT } from "./errors.js";
import { readSmallFileOrNull } from "./readSmallFile.js";

//@ chunk-425yaf76.js:659-808 placement
/**
 * 待唤醒记录文件名、大小上限与 schema。
 */
var PENDING_WAKEUP_FILE = ".pending-wakeup";
var MAX_PENDING_WAKEUP_BYTES = 1024;
var PENDING_WAKEUP_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    toolUseId: string().min(1).max(256),
    scheduledFor: E().int().positive(),
    chainStartedAt: E().int().nonnegative(),
  }),
);
//@ chunk-425yaf76.js:808-982 placement
/**
 * 写入（或删除）待唤醒记录。
 */
async function writePendingWakeup(i, r) {
  let e = join(i, PENDING_WAKEUP_FILE);
  try {
    if (r === undefined) {
      if (
        await rm(e, {
          force: true,
        }).then(
          () => true,
          (error) => {
            logJobWriteError(error);
            return false;
          },
        )
      )
        return;
    }
    await replaceFileExclusive(e, r === undefined ? "" : jsonStringify(r));
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
//@ chunk-425yaf76.js:982-1126 placement
/**
 * 读取并校验待唤醒记录。
 */
async function readPendingWakeup(bgJobDir) {
  let smallFileOrNull = await readSmallFileOrNull(
    join(bgJobDir, PENDING_WAKEUP_FILE),
    MAX_PENDING_WAKEUP_BYTES,
  );
  if (!smallFileOrNull) return null;
  try {
    let e = PENDING_WAKEUP_SCHEMA().safeParse(jsonParse(smallFileOrNull));
    return e.success ? e.data : null;
  } catch {
    return null;
  }
}
export { readPendingWakeup, writePendingWakeup };
