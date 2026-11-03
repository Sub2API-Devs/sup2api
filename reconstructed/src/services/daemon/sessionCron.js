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
import { lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import { randomUUID } from "crypto";
import { NX } from "../sessionStatus/sessionStateClassifier.js";
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
function isSessionCronOnlyWake(e) {
  if (e === void 0 || !e.kinds.includes("session_cron")) return !1;
  let wake = e.wake;
  if (wake === void 0) return !0;
  return wake.fires >= 1 && wake.keepalive !== !0;
}
/**
 * 把进度项（id、完成时间、失败标记、todo 开始时间）拼成签名字符串，用于判断是否变化。
 */
//@ chunk-y162pn60.js:10026-10215 placement
function buildProgressSignature(e) {
  if (!e || e.length === 0) return "";
  return e
    .map((n) => {
      let r = `${n.id ?? n.label}:${n.doneAt ?? "-"}:${n.failed ? "x" : ""}`;
      return n.kind === "todo" ? `${r}:${n.startedAt ?? "-"}` : r;
    })
    .join("|");
}
/**
 * 取在途工作快照（任务数、排队数、类型、可排空的监视器、唤醒信息）。
 */
//@ chunk-y162pn60.js:10215-10387 placement
function getInFlightSnapshot() {
  let {
    tasks: tasks,
    queued: queued,
    kinds: kinds,
    drainableMonitors: drainableMonitors,
    wake: wake,
  } = getInFlightWithSessionCrons();
  return {
    tasks: tasks,
    queued: queued,
    kinds: kinds,
    ...(drainableMonitors !== void 0 && { drainableMonitors: drainableMonitors }),
    ...(wake !== void 0 && { wake: wake }),
  };
}
//@ chunk-y162pn60.js:10387-10435 placement
function kKo(e) {
  NX().publishInFlightSnapshot(e);
}
/**
 * 在途快照加上会话定时任务：任务数累加、类型追加 session_cron，并带上 loop 唤醒信息。
 */
//@ chunk-y162pn60.js:10435-10612 placement
function getInFlightWithSessionCrons() {
  let inFlightSnapshot = NX().inFlightSnapshot,
    n = getSessionCronTasks().length;
  if (n === 0) return { ...inFlightSnapshot };
  let r = getLoopWakeInfo();
  return {
    ...inFlightSnapshot,
    tasks: inFlightSnapshot.tasks + n,
    kinds: [...inFlightSnapshot.kinds, "session_cron"],
    ...(r !== void 0 && { wake: r }),
  };
}
//@ chunk-y162pn60.js:10612-10770 placement
function getLoopWakeInfo() {
  let found = getSessionCronTasks().find((n) => n.kind === "loop");
  if (found === void 0) return;
  return {
    at: found.scheduledFor,
    reason: found.reason,
    fires: getLoopWakeFires(),
    ...(found.keepalive && { keepalive: !0 }),
  };
}
/**
 * 订阅在途快照与会话定时任务的变化，返回取消订阅函数。
 */
//@ chunk-y162pn60.js:10770-10883 placement
function subscribeInFlightChanges(e) {
  let subscribe = NX().inFlightSnapshotChanged.subscribe(e),
    r = onSessionCronsChange(() => {
      try {
        e();
      } catch {}
    });
  return () => {
    (subscribe(), r());
  };
}
//@ chunk-y162pn60.js:11001-11025 placement
function $e(e) {
  return e;
}
//@ chunk-y162pn60.js:11025-11062 placement
function We(e) {
  return $e(new Set(e));
}
/**
 * 把 JSON 路径各段转成遥测安全的字符串：数字或已知键原样，其余替换为 *。
 */
//@ chunk-y162pn60.js:11350-11486 placement
function sanitizeJsonPath(e, n) {
  let r;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    (e ?? [])
      .map((s) => (typeof s === "number" || (typeof s === "string" && (r ??= n()).has(s)) ? String(s) : "*"))
      .join("."),
  );
}
/**
 * 写作业文件前检查：无磁盘或文件不存在时继续；是普通文件继续；否则拒绝（标记是否符号链接）。
 */
//@ chunk-y162pn60.js:11523-11738 placement
async function checkJobFileWritable(e) {
  if (isDiskless()) return { kind: "proceed" };
  try {
    let n = await lstat_3(e);
    return n.isFile() ? { kind: "proceed" } : { kind: "refused", symlink: n.isSymbolicLink() };
  } catch (error) {
    return isENOENT(error) ? { kind: "proceed" } : { kind: "error", error: error };
  }
}
//@ chunk-1b29nqtw.js:268-336 placement
function mze(t) {
  let e = addMissingRecurringCrons(t, carryLoopCronAcrossCompact(t, t));
  return e === null ? t : [...t, wrapAttachment(e)];
}
/**
 * 构建会话 cron 跨压缩携带的附件（无任务时为空列表），以及把内容包成带 uuid 与时间戳的附件消息。
 */
//@ chunk-1b29nqtw.js:336-492 placement
var buildCronCarryAttachment = (t) =>
    wrapAttachment(
      addMissingRecurringCrons(t, carryLoopCronAcrossCompact(t, t)) ?? {
        type: "session_cron_carry",
        tasks: [],
      },
    ),
  wrapAttachment = (t) => ({
    attachment: t,
    type: "attachment",
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  });

export {
  buildCronCarryAttachment,
  buildProgressSignature,
  kKo,
  mze,
  sanitizeJsonPath,
  getInFlightWithSessionCrons,
  checkJobFileWritable,
  getInFlightSnapshot,
  subscribeInFlightChanges,
  $e,
  We,
  isSessionCronOnlyWake,
};
