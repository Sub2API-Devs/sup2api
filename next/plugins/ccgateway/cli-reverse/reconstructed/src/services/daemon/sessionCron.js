/**
 * services/daemon/sessionCron.ts
 *
 * 2.1.316 新增：后台会话定时任务
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmd7n4gq.js (11), chunk-sasckav9.js (2)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-rmd7n4gq.js:10089-10234 placement
function isSessionCronOnlyWake(inFlight) {
  if (inFlight === undefined || !inFlight.kinds.includes("session_cron")) return false;
  let wake = inFlight.wake;
  if (wake === undefined) return true;
  return wake.fires >= 1 && wake.keepalive !== true;
}
//@ chunk-rmd7n4gq.js:10234-10423 placement
/**
 * 把进度项（id、完成时间、失败标记、todo 开始时间）拼成签名字符串，用于判断是否变化。
 */
function buildProgressSignature(items) {
  if (!items || items.length === 0) return "";
  return items
    .map((item) => {
      let part = `${item.id ?? item.label}:${item.doneAt ?? "-"}:${item.failed ? "x" : ""}`;
      return item.kind === "todo" ? `${part}:${item.startedAt ?? "-"}` : part;
    })
    .join("|");
}
//@ chunk-rmd7n4gq.js:10423-10595 placement
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
//@ chunk-rmd7n4gq.js:10595-10643 placement
/**
 * 把会话定时任务的在途情况写入快照。
 */
function publishSessionCronSnapshot(snapshot) {
  currentSessionStatusState().publishInFlightSnapshot(snapshot);
}
//@ chunk-rmd7n4gq.js:10643-10820 placement
/**
 * 在途快照加上会话定时任务：任务数累加、类型追加 session_cron，并带上 loop 唤醒信息。
 */
function getInFlightWithSessionCrons() {
  let inFlightSnapshot = currentSessionStatusState().inFlightSnapshot;
  let cronCount = getSessionCronTasks().length;
  if (cronCount === 0)
    return {
      ...inFlightSnapshot,
    };
  let loopWakeInfo = getLoopWakeInfo();
  return {
    ...inFlightSnapshot,
    tasks: inFlightSnapshot.tasks + cronCount,
    kinds: [...inFlightSnapshot.kinds, "session_cron"],
    ...(loopWakeInfo !== undefined && {
      wake: loopWakeInfo,
    }),
  };
}
//@ chunk-rmd7n4gq.js:10820-10978 placement
function getLoopWakeInfo() {
  let found = getSessionCronTasks().find((task) => task.kind === "loop");
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
//@ chunk-rmd7n4gq.js:10978-11091 placement
/**
 * 订阅在途快照与会话定时任务的变化，返回取消订阅函数。
 */
function subscribeInFlightChanges(listener) {
  let unsubscribe = currentSessionStatusState().inFlightSnapshotChanged.subscribe(listener);
  let unsubscribeCrons = onSessionCronsChange(() => {
    try {
      listener();
    } catch {}
  });
  return () => {
    unsubscribe();
    unsubscribeCrons();
  };
}
//@ chunk-rmd7n4gq.js:11209-11233 placement
/**
 * 恒等函数（保留包装点）。
 */
function identity(value) {
  return value;
}
//@ chunk-rmd7n4gq.js:11233-11270 placement
/**
 * 把可迭代值转成 Set。
 */
function toSet(items) {
  return identity(new Set(items));
}
//@ chunk-rmd7n4gq.js:11558-11694 placement
/**
 * 把 JSON 路径各段转成遥测安全的字符串：数字或已知键原样，其余替换为 *。
 */
function sanitizeJsonPath(path, allowedKeys) {
  let allowed;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    (path ?? [])
      .map((segment) =>
        typeof segment === "number" ||
        (typeof segment === "string" && (allowed ??= allowedKeys()).has(segment))
          ? String(segment)
          : "*",
      )
      .join("."),
  );
}
//@ chunk-rmd7n4gq.js:11731-11946 placement
/**
 * 写作业文件前检查：无磁盘或文件不存在时继续；是普通文件继续；否则拒绝（标记是否符号链接）。
 */
async function checkJobFileWritable(path) {
  if (isDiskless())
    return {
      kind: "proceed",
    };
  try {
    let stats = await lstat(path);
    return stats.isFile()
      ? {
          kind: "proceed",
        }
      : {
          kind: "refused",
          symlink: stats.isSymbolicLink(),
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
//@ chunk-sasckav9.js:268-336 placement
/**
 * 在消息列表末尾附上定时任务携带附件（没有任务时原样返回）。
 */
function withCronCarryAttachment(messages) {
  let attachment = addMissingRecurringCrons(messages, carryLoopCronAcrossCompact(messages, messages));
  return attachment === null ? messages : [...messages, wrapAttachment(attachment)];
}
//@ chunk-sasckav9.js:336-492 placement
/**
 * 构建会话 cron 跨压缩携带的附件（无任务时为空列表），以及把内容包成带 uuid 与时间戳的附件消息。
 */
var buildCronCarryAttachment = (messages) =>
  wrapAttachment(
    addMissingRecurringCrons(messages, carryLoopCronAcrossCompact(messages, messages)) ?? {
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
  sanitizeJsonPath,
  withCronCarryAttachment,
  getInFlightSnapshot,
  getInFlightWithSessionCrons,
  buildCronCarryAttachment,
  buildProgressSignature,
  publishSessionCronSnapshot,
  checkJobFileWritable,
  isSessionCronOnlyWake,
  identity,
  toSet,
  subscribeInFlightChanges,
};
