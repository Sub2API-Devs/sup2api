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
import { zodStrictObject, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import { logJobWriteError } from "../services/daemon/jobState.js";
import { replaceFileExclusive } from "../services/daemon/promptStash.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { isENOENT } from "./errors.js";
import { readSmallFileOrNull } from "./readSmallFile.js";

/**
 * 待唤醒记录文件名、大小上限与 schema。
 */
//@ chunk-425yaf76.js:659-808 placement
var PENDING_WAKEUP_FILE = ".pending-wakeup",
  MAX_PENDING_WAKEUP_BYTES = 1024,
  PENDING_WAKEUP_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      toolUseId: o().min(1).max(256),
      scheduledFor: E().int().positive(),
      chainStartedAt: E().int().nonnegative(),
    }),
  );
/**
 * 写入（或删除）待唤醒记录。
 */
//@ chunk-425yaf76.js:808-982 placement
async function writePendingWakeup(i, r) {
  let e = join(i, PENDING_WAKEUP_FILE);
  try {
    if (r === void 0) {
      if (
        await rm(e, { force: !0 }).then(
          () => !0,
          (d) => (logJobWriteError(d), !1),
        )
      )
        return;
    }
    await replaceFileExclusive(e, r === void 0 ? "" : jsonStringify(r));
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
/**
 * 读取并校验待唤醒记录。
 */
//@ chunk-425yaf76.js:982-1126 placement
async function readPendingWakeup(i) {
  let r = await readSmallFileOrNull(join(i, PENDING_WAKEUP_FILE), MAX_PENDING_WAKEUP_BYTES);
  if (!r) return null;
  try {
    let safeParse = PENDING_WAKEUP_SCHEMA().safeParse(jsonParse(r));
    return safeParse.success ? safeParse.data : null;
  } catch {
    return null;
  }
}

export { readPendingWakeup, writePendingWakeup };
