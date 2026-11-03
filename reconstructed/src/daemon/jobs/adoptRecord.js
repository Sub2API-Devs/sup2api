/**
 * daemon/jobs/adoptRecord.ts
 *
 * 2.1.316 新增：认领并删除 adopt.json 记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (2)
 * attribution: placement 2
 */
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import {
  ADOPT_RECORD_SCHEMA_BASE,
  adoptRecordSchema,
  ADOPT_RECORD_MAX_AGE_MS,
  MAX_ADOPT_SHELLS,
} from "../attach/attachJob.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { killIfSameProcess } from "../deadProbe.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-vrr64ez0.js:26354-27235 placement
/**
 * 认领并删除 adopt.json 记录。
 */
async function reapAdoptRecord(jobDir, n = {}) {
  let o = join(jobDir, "adopt.json");
  let r = `${o}.reap.${process.pid}`;
  let u = Date.now() + (n.waitMs ?? 0);
  for (;;)
    try {
      await retryFsOp(o, r);
      break;
    } catch (error) {
      if (Date.now() >= u) {
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
    let s = adoptRecordSchema().safeParse(jsonParse(await readFile(r, "utf-8")));
    if (!s.success)
      return {
        found: true,
        reaped: 0,
      };
    let { writtenAtMs, shells } = s.data;
    let w = writtenAtMs !== undefined ? Date.now() - writtenAtMs : undefined;
    if ((w !== undefined && w > ADOPT_RECORD_MAX_AGE_MS) || shells.length > MAX_ADOPT_SHELLS) {
      logForDebugging(
        `[adopt] reap skipped: implausible payload (age ${w ?? "?"}ms, ${shells.length} entries)`,
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
    await unlink(r).catch(() => {});
  }
}
//@ chunk-vrr64ez0.js:27235-27301 placement = readHeadAndTail (0.802)
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
