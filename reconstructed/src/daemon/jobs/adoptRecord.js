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
import { join, join as join_2, join as join_3 } from "path";
import { readFile, unlink, unlink as unlink_2, unlink as unlink_3 } from "fs/promises";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import {
  ADOPT_RECORD_SCHEMA_BASE,
  adoptRecordSchema,
  ADOPT_RECORD_MAX_AGE_MS,
  yr,
} from "../attach/attachJob.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { killIfSameProcess } from "../deadProbe.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 认领并删除 adopt.json 记录。
 */
//@ chunk-vrr64ez0.js:26354-27235 placement
async function reapAdoptRecord(e, n = {}) {
  let o = join_3(e, "adopt.json"),
    r = `${o}.reap.${process.pid}`,
    u = Date.now() + (n.waitMs ?? 0);
  for (;;)
    try {
      await retryFsOp(o, r);
      break;
    } catch (error) {
      if (Date.now() >= u) {
        if (!isENOENT(error)) logForDebugging(`[adopt] reap claim failed: ${error}`, { level: "warn" });
        return { found: !1, reaped: 0 };
      }
      await sleep(ADOPT_RECORD_SCHEMA_BASE);
    }
  try {
    let safeParse = adoptRecordSchema().safeParse(jsonParse(await readFile(r, "utf-8")));
    if (!safeParse.success) return { found: !0, reaped: 0 };
    let { writtenAtMs: writtenAtMs, shells: shells } = safeParse.data,
      w = writtenAtMs !== void 0 ? Date.now() - writtenAtMs : void 0;
    if ((w !== void 0 && w > ADOPT_RECORD_MAX_AGE_MS) || shells.length > yr)
      return (
        logForDebugging(
          `[adopt] reap skipped: implausible payload (age ${w ?? "?"}ms, ${shells.length} entries)`,
          { level: "warn" },
        ),
        { found: !0, reaped: 0 }
      );
    if (
      (await Promise.all(shells.map((T) => killIfSameProcess(T.pid, T.startTimeTicks, T.procStart))),
      shells.length > 0)
    )
      logEvent("tengu_adopt_exit_reap", { reaped_shells: shells.length });
    return { found: !0, reaped: shells.length };
  } catch (error) {
    return (
      logForDebugging(`[adopt] reap read/parse failed: ${error}`, { level: "warn" }),
      { found: !0, reaped: 0 }
    );
  } finally {
    await unlink_3(r).catch(() => {});
  }
}
//@ chunk-vrr64ez0.js:27235-27301 placement = readHeadAndTail (0.802)
var HEAD_TAIL_LINES_DEFAULT = 7,
  Sr = { head: 40, tail: 20 },
  Er = { head: 50, tail: 30 },
  bn = 1000,
  vr = 1e6;

export { reapAdoptRecord, bn, Er, HEAD_TAIL_LINES_DEFAULT, Sr, vr };
