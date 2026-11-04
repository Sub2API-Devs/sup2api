/**
 * daemon/jobs/adoptRecord.ts
 *
 * 2.1.316 新增：认领并删除 adopt.json 记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_15, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { killIfSameProcess } from "../deadProbe.js";
import { logEvent } from "../../services/analytics/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrr64ez0.js:26163-26354 placement
/**
 * 后台作业接管记录相关常量（时间、7 天保留期、上限）与 schema：写入时间与 shell 列表（pid、进程启动标记）。
 */
var ADOPT_RECORD_SCHEMA_BASE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ADOPT_RECORD_MAX_AGE_MS;
var MAX_ADOPT_SHELLS;
var adoptRecordSchema;
deferInit("chunk-vrr64ez0.js:26163", () => {
  ADOPT_RECORD_SCHEMA_BASE = 250;
  ADOPT_RECORD_MAX_AGE_MS = 604800000;
  MAX_ADOPT_SHELLS = 256;
  adoptRecordSchema = DoctorLazy(() =>
    create({
      writtenAtMs: create_3().optional(),
      shells: create_15(
        create({
          pid: create_3().int().positive(),
          procStart: create_2().optional(),
          startTimeTicks: create_3().int().optional(),
        }),
      ).catch([]),
    }),
  );
});
//@ chunk-vrr64ez0.js:26354-27235 placement
/**
 * 认领并删除 adopt.json 记录。
 */
async function reapAdoptRecord(jobDir, options = {}) {
  let recordPath = join(jobDir, "adopt.json");
  let claimPath = `${recordPath}.reap.${process.pid}`;
  let deadline = Date.now() + (options.waitMs ?? 0);
  for (;;)
    try {
      await retryFsOp(recordPath, claimPath);
      break;
    } catch (error) {
      if (Date.now() >= deadline) {
        if (!isENOENT(error))
          logForDebugging(`[adopt] reap claim failed: ${error}`, {
            level: "warn",
          });
        return {
          found: false,
          reaped: 0,
        };
      }
      await sleep(ADOPT_RECORD_SCHEMA_BASE);
    }
  try {
    let parsed = adoptRecordSchema().safeParse(jsonParse(await readFile(claimPath, "utf-8")));
    if (!parsed.success)
      return {
        found: true,
        reaped: 0,
      };
    let { writtenAtMs, shells } = parsed.data;
    let ageMs = writtenAtMs !== undefined ? Date.now() - writtenAtMs : undefined;
    if ((ageMs !== undefined && ageMs > ADOPT_RECORD_MAX_AGE_MS) || shells.length > MAX_ADOPT_SHELLS) {
      logForDebugging(
        `[adopt] reap skipped: implausible payload (age ${ageMs ?? "?"}ms, ${shells.length} entries)`,
        {
          level: "warn",
        },
      );
      return {
        found: true,
        reaped: 0,
      };
    }
    await Promise.all(
      shells.map((shell) => killIfSameProcess(shell.pid, shell.startTimeTicks, shell.procStart)),
    );
    if (shells.length > 0)
      logEvent("tengu_adopt_exit_reap", {
        reaped_shells: shells.length,
      });
    return {
      found: true,
      reaped: shells.length,
    };
  } catch (error) {
    logForDebugging(`[adopt] reap read/parse failed: ${error}`, {
      level: "warn",
    });
    return {
      found: true,
      reaped: 0,
    };
  } finally {
    await unlink(claimPath).catch(() => {});
  }
}
//@ chunk-vrr64ez0.js:27235-27301 placement (2.1.88 match: readHeadAndTail, 0.802)
var HEAD_TAIL_LINES_DEFAULT_2 = 7;
var HEAD_TAIL_LINES_SEED = {
  head: 40,
  tail: 20,
};
var HEAD_TAIL_LINES_DEFAULT = {
  head: 50,
  tail: 30,
};
var ADOPT_CLAIM_RETRY_MS = 1000;
var MAX_ADOPT_RECORD_BYTES = 1e6;
export {
  reapAdoptRecord,
  ADOPT_CLAIM_RETRY_MS,
  HEAD_TAIL_LINES_DEFAULT,
  HEAD_TAIL_LINES_DEFAULT_2,
  HEAD_TAIL_LINES_SEED,
  MAX_ADOPT_RECORD_BYTES,
};
