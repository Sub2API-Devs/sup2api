/**
 * utils/scheduledWakeup.ts
 *
 * 2.1.316 新增。定时唤醒。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-50ktwjzn.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { rm } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { logJobWriteError } from "../services/daemon/jobState.js";
import { replaceFileExclusive } from "../services/daemon/promptStash.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { isENOENT } from "./errors.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-50ktwjzn.js:659-808 placement
/**
 * 待唤醒记录文件名、大小上限与 schema。
 */
var PENDING_WAKEUP_FILE; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PENDING_WAKEUP_BYTES;
var PENDING_WAKEUP_SCHEMA;
deferInit("chunk-50ktwjzn.js:659", () => {
  PENDING_WAKEUP_FILE = ".pending-wakeup";
  MAX_PENDING_WAKEUP_BYTES = 1024;
  PENDING_WAKEUP_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      toolUseId: stringSchema().min(1).max(256),
      scheduledFor: numberSchema().int().positive(),
      chainStartedAt: numberSchema().int().nonnegative(),
    }),
  );
});
//@ chunk-50ktwjzn.js:808-982 placement
/**
 * 写入（或删除）待唤醒记录。
 */
async function writePendingWakeup(dir, snapshot) {
  let filePath = join(dir, PENDING_WAKEUP_FILE);
  try {
    if (snapshot === undefined) {
      if (
        await rm(filePath, {
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
    await replaceFileExclusive(filePath, snapshot === undefined ? "" : jsonStringify(snapshot));
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
//@ chunk-50ktwjzn.js:982-1126 placement
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
    let parsed = PENDING_WAKEUP_SCHEMA().safeParse(jsonParse(smallFileOrNull));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export { writePendingWakeup, readPendingWakeup };
