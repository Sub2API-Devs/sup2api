/**
 * services/daemon/sessionCron.ts
 *
 * 2.1.316 新增：后台会话定时任务
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1b29nqtw.js (2), chunk-y162pn60.js (11)
 * attribution: placement 13
 */
import { lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { currentSessionStatusState } from "../sessionStatus/sessionStateClassifier.js";
import {
  getSessionCronTasks,
  getLoopWakeFires,
  onSessionCronsChange,
  isDiskless,
} from "../../bootstrap/state.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../analytics/safeMetadata.js";
import { isENOENT } from "../../utils/errors.js";
import { addMissingRecurringCrons, carryLoopCronAcrossCompact } from "../compact/compactCarry.js";

//@ chunk-y162pn60.js:9881-10026 placement
function isSessionCronOnlyWake(inFlight) {
  if (inFlight === undefined || !inFlight.kinds.includes("session_cron")) return false;
  let wake = inFlight.wake;
  if (wake === undefined) return true;
  return wake.fires >= 1 && wake.keepalive !== true;
}
//@ chunk-y162pn60.js:10026-10215 placement
/**
 * 把进度项（id、完成时间、失败标记、todo 开始时间）拼成签名字符串，用于判断是否变化。
 */
function buildProgressSignature(e) {
  if (!e || e.length === 0) return "";
  return e
    .map((n) => {
      let r = `${n.id ?? n.label}:${n.doneAt ?? "-"}:${n.failed ? "x" : ""}`;
      return n.kind === "todo" ? `${r}:${n.startedAt ?? "-"}` : r;
    })
    .join("|");
}
//@ chunk-y162pn60.js:10215-10387 placement
/**
 * 取在途工作快照（任务数、排队数、类型、可排空的监视器、唤醒信息）。
 */
function getInFlightSnapshot() {
  let { tasks, queued, kinds, drainableMonitors, wake } = getInFlightWithSessionCrons();
  return {
    tasks,
    queued,
    kinds,
    ...(drainableMonitors !== undefined && {
      drainableMonitors,
    }),
    ...(wake !== undefined && {
      wake,
    }),
  };
}
//@ chunk-y162pn60.js:10387-10435 placement
/**
 * 把会话定时任务的在途情况写入快照。
 */
function publishSessionCronSnapshot(e) {
  currentSessionStatusState().publishInFlightSnapshot(e);
}
//@ chunk-y162pn60.js:10435-10612 placement
/**
 * 在途快照加上会话定时任务：任务数累加、类型追加 session_cron，并带上 loop 唤醒信息。
 */
function getInFlightWithSessionCrons() {
  let inFlightSnapshot = currentSessionStatusState().inFlightSnapshot;
  let n = getSessionCronTasks().length;
  if (n === 0)
    return {
      ...inFlightSnapshot,
    };
  let loopWakeInfo = getLoopWakeInfo();
  return {
    ...inFlightSnapshot,
    tasks: inFlightSnapshot.tasks + n,
    kinds: [...inFlightSnapshot.kinds, "session_cron"],
    ...(loopWakeInfo !== undefined && {
      wake: loopWakeInfo,
    }),
  };
}
//@ chunk-y162pn60.js:10612-10770 placement
function getLoopWakeInfo() {
  let found = getSessionCronTasks().find((n) => n.kind === "loop");
  if (found === undefined) return;
  return {
    at: found.scheduledFor,
    reason: found.reason,
    fires: getLoopWakeFires(),
    ...(found.keepalive && {
      keepalive: true,
    }),
  };
}
//@ chunk-y162pn60.js:10770-10883 placement
/**
 * 订阅在途快照与会话定时任务的变化，返回取消订阅函数。
 */
function subscribeInFlightChanges(e) {
  let n = currentSessionStatusState().inFlightSnapshotChanged.subscribe(e);
  let r = onSessionCronsChange(() => {
    try {
      e();
    } catch {}
  });
  return () => {
    n();
    r();
  };
}
//@ chunk-y162pn60.js:11001-11025 placement
/**
 * 恒等函数（保留包装点）。
 */
function identity(e) {
  return e;
}
//@ chunk-y162pn60.js:11025-11062 placement
/**
 * 把可迭代值转成 Set。
 */
function toSet(e) {
  return identity(new Set(e));
}
//@ chunk-y162pn60.js:11350-11486 placement
/**
 * 把 JSON 路径各段转成遥测安全的字符串：数字或已知键原样，其余替换为 *。
 */
function sanitizeJsonPath(e, n) {
  let r;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    (e ?? [])
      .map((s) => (typeof s === "number" || (typeof s === "string" && (r ??= n()).has(s)) ? String(s) : "*"))
      .join("."),
  );
}
//@ chunk-y162pn60.js:11523-11738 placement
/**
 * 写作业文件前检查：无磁盘或文件不存在时继续；是普通文件继续；否则拒绝（标记是否符号链接）。
 */
async function checkJobFileWritable(e) {
  if (isDiskless())
    return {
      kind: "proceed",
    };
  try {
    let n = await lstat(e);
    return n.isFile()
      ? {
          kind: "proceed",
        }
      : {
          kind: "refused",
          symlink: n.isSymbolicLink(),
        };
  } catch (error) {
    return isENOENT(error)
      ? {
          kind: "proceed",
        }
      : {
          kind: "error",
          error,
        };
  }
}
//@ chunk-1b29nqtw.js:268-336 placement
/**
 * 在消息列表末尾附上定时任务携带附件（没有任务时原样返回）。
 */
function withCronCarryAttachment(t) {
  let attachment = addMissingRecurringCrons(t, carryLoopCronAcrossCompact(t, t));
  return attachment === null ? t : [...t, wrapAttachment(attachment)];
}
//@ chunk-1b29nqtw.js:336-492 placement
/**
 * 构建会话 cron 跨压缩携带的附件（无任务时为空列表），以及把内容包成带 uuid 与时间戳的附件消息。
 */
var buildCronCarryAttachment = (t) =>
  wrapAttachment(
    addMissingRecurringCrons(t, carryLoopCronAcrossCompact(t, t)) ?? {
      type: "session_cron_carry",
      tasks: [],
    },
  );
var wrapAttachment = (attachment) => ({
  attachment,
  type: "attachment",
  uuid: randomUUID(),
  timestamp: new Date().toISOString(),
});
export {
  buildCronCarryAttachment,
  buildProgressSignature,
  publishSessionCronSnapshot,
  withCronCarryAttachment,
  sanitizeJsonPath,
  getInFlightWithSessionCrons,
  checkJobFileWritable,
  getInFlightSnapshot,
  subscribeInFlightChanges,
  identity,
  toSet,
  isSessionCronOnlyWake,
};
