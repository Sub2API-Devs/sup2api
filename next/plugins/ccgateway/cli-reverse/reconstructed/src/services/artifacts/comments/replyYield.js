/**
 * services/artifacts/comments/replyYield.ts
 *
 * 2.1.316 新增：用户活跃时评论回复的让步/延后
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TMUX_LOCATION_RE } from "../../../utils/concurrentSessions.js";
import { plural, sanitizeSessionTitle, truncateToLength, takeLastChars } from "../../../utils/stringUtils.js";
import { truncateToWidth, truncatePathMiddle, formatDuration } from "../../../utils/format.js";
import { replaceControlChars } from "../../../utils/resultError.js";
import { tildify } from "../../../utils/path.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c0pq6qyx.js:152157-152697 placement
/**
 * 在会话进程记录里找出同一会话、仍在运行且确认是同一进程的其他持有者（后台类优先、状态较新的优先）；返回 live（含其他持有者、是否有无法证实的）、unknown 或 none。
 */
async function findLiveReplyHolder(options) {
  let hasUnproven = false;
  let confirmed = [];
  for (let record of options.records) {
    if (
      record.sessionId !== options.sessionId ||
      record.pid === options.selfPid ||
      record.parkedJobId !== undefined
    )
      continue;
    if (!options.isRunning(record.pid)) continue;
    let startedAt = record.procStartFt ?? record.procStart;
    if (startedAt === undefined) {
      hasUnproven = true;
      continue;
    }
    let sameProcess = await options.isSameProcess(record.pid, startedAt);
    if (sameProcess === true) confirmed.push(record);
    else if (sameProcess === undefined) hasUnproven = true;
  }
  confirmed.sort(
    (recordA, recordB) =>
      Number(isBackgroundSurface(recordB.kind)) - Number(isBackgroundSurface(recordA.kind)) ||
      (recordB.statusUpdatedAt ?? 0) - (recordA.statusUpdatedAt ?? 0),
  );
  let [first, ...rest] = confirmed;
  return first !== undefined
    ? {
        verdict: "live",
        holder: first,
        otherHolders: rest,
        ...(hasUnproven && {
          unproven: true,
        }),
      }
    : {
        verdict: hasUnproven ? "unknown" : "none",
      };
}
//@ chunk-c0pq6qyx.js:152697-152750 placement
/**
 * 导出函数 `isBackgroundSurface`：参数 e，返回 e !== void 0 && e !== "interactive"。
 */
function isBackgroundSurface(kind) {
  return kind !== undefined && kind !== "interactive";
}
//@ chunk-c0pq6qyx.js:152750-153002 placement
function getHolderSurface(holder) {
  if (isBackgroundSurface(holder.kind)) return "background";
  switch (holder.entrypoint) {
    case "claude-desktop":
    case "claude-desktop-3p":
    case "local-agent":
      return "desktop";
    case "claude-vscode":
      return "vscode";
    default:
      return holder.tmux !== undefined && TMUX_LOCATION_RE.test(holder.tmux) ? "tmux" : "terminal";
  }
}
//@ chunk-c0pq6qyx.js:153002-153068 placement
/**
 * 导出函数 `describeHolderWithOthersComments`：参数 e, t, n，返回 { where: describeReplyHolder(e, n), surface: getHolderSurface(e), others: t }。
 */
function describeHolderWithOthersComments(holder, others, now) {
  return {
    where: describeReplyHolder(holder, now),
    surface: getHolderSurface(holder),
    others,
  };
}
//@ chunk-c0pq6qyx.js:153068-153170 placement
/**
 * 描述讨论串持有者所在位置，有其他会话时附"及 N 个其他会话"。
 */
function describeHolderWithOthers(holder) {
  return holder.others > 0
    ? `${holder.where} and ${holder.others} other ${plural(holder.others, "session")}`
    : holder.where;
}
//@ chunk-c0pq6qyx.js:153170-153245 placement
/**
 * 导出函数 `holderElsewhereText`：参数 e，返回 e !== void 0 ? describeHolderWithOthers(e) : "another session on this machine"。
 */
function holderElsewhereText(holder) {
  return holder !== undefined ? describeHolderWithOthers(holder) : "another session on this machine";
}
//@ chunk-c0pq6qyx.js:153245-153392 placement
var MAX_HOLDER_NAME_WIDTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var QUOTE_CHARS;
var QUOTE_CHARS_RE;
var QUOTE_PAREN_COMMA_RE;
var MAX_HOLDER_CWD_WIDTH;
var MAX_HOLDER_RAW_LENGTH;
var MAX_HOLDER_IDLE_MS;
deferInit("chunk-c0pq6qyx.js:153245", () => {
  MAX_HOLDER_NAME_WIDTH = 40;
  QUOTE_CHARS = '"\u201C\u201D\u201E\u201F\u2033\u2036\uFF02';
  QUOTE_CHARS_RE = new RegExp(`[${QUOTE_CHARS}]`, "g");
  QUOTE_PAREN_COMMA_RE = new RegExp(`[${QUOTE_CHARS}(),]`, "g");
  MAX_HOLDER_CWD_WIDTH = 48;
  MAX_HOLDER_RAW_LENGTH = 512;
  MAX_HOLDER_IDLE_MS = 7776000000;
});
//@ chunk-c0pq6qyx.js:153392-153467 placement
function ageWithinHolderLimit(startedAt, now) {
  if (startedAt === undefined) return;
  let ageMs = now - startedAt;
  return ageMs > 0 && ageMs <= MAX_HOLDER_IDLE_MS ? ageMs : undefined;
}
//@ chunk-c0pq6qyx.js:153467-153540 placement
function holderIdleMs(holder, now) {
  return holder.status === "idle" ? ageWithinHolderLimit(holder.statusUpdatedAt, now) : undefined;
}
//@ chunk-c0pq6qyx.js:153540-153582 placement
function holderAgeMs(holder, now) {
  return ageWithinHolderLimit(holder.startedAt, now);
}
//@ chunk-c0pq6qyx.js:153582-154385 placement
/**
 * 用一句话描述占用评论自动回复的另一个会话：后台代理/桌面应用/VS Code/tmux 窗格/另一个终端，附带会话名、工作目录与空闲或打开时长。
 */
function describeReplyHolder(holder, now) {
  let suffix =
    holder.name !== undefined &&
    (holder.nameSource === undefined || holder.nameSource === "user" || holder.nameSource === "peer")
      ? truncateToWidth(
          sanitizeSessionTitle(truncateToLength(holder.name, MAX_HOLDER_RAW_LENGTH)).replace(
            QUOTE_CHARS_RE,
            "'",
          ),
          MAX_HOLDER_NAME_WIDTH,
        )
      : "";
  let cwdLabel =
    holder.cwd !== undefined && holder.cwd !== "?"
      ? truncatePathMiddle(
          replaceControlChars(tildify(takeLastChars(holder.cwd, MAX_HOLDER_RAW_LENGTH)))
            .replace(QUOTE_PAREN_COMMA_RE, "")
            .trim(),
          MAX_HOLDER_CWD_WIDTH,
        )
      : "";
  let parens = (...parts) => {
    let filtered = parts.filter((part) => part !== "");
    return filtered.length > 0 ? ` (${filtered.join(", ")})` : "";
  };
  let quotedName = suffix !== "" ? `"${suffix}"` : "";
  let tmux = holder.tmux !== undefined && TMUX_LOCATION_RE.test(holder.tmux) ? holder.tmux : "";
  let idleMs = holderIdleMs(holder, now);
  let ageMs = holderAgeMs(holder, now);
  let durationLabel =
    idleMs !== undefined && idleMs >= 60000
      ? `idle for ${formatDuration(idleMs, {
          mostSignificantOnly: true,
        })}`
      : ageMs !== undefined && ageMs >= 60000
        ? `open for ${formatDuration(ageMs, {
            mostSignificantOnly: true,
          })}`
        : "";
  switch (getHolderSurface(holder)) {
    case "background":
      return `a background agent${parens(quotedName, cwdLabel, durationLabel)}`;
    case "desktop":
      return `the Claude Desktop app${parens(quotedName, durationLabel)}`;
    case "vscode":
      return `VS Code${parens(quotedName, cwdLabel, durationLabel)}`;
    case "tmux":
      return `tmux pane ${tmux}${parens(quotedName, cwdLabel, durationLabel)}`;
    case "terminal":
      return `another terminal${parens(quotedName, cwdLabel, durationLabel)}`;
  }
}
//@ chunk-c0pq6qyx.js:154385-154638 placement
/**
 * 生成持有者相关的打点字段：界面、状态、空闲分钟数、存在分钟数与是否有收件箱套接字。
 */
function getHolderTelemetry(holder, now) {
  let idleMs = holderIdleMs(holder, now);
  let ageMs = holderAgeMs(holder, now);
  return {
    holder_surface: fromEnum(getHolderSurface(holder)),
    holder_status: fromEnum(holder.status ?? "none"),
    holder_idle_min: idleMs === undefined ? -1 : Math.floor(idleMs / 60000),
    holder_age_min: ageMs === undefined ? -1 : Math.floor(ageMs / 60000),
    holder_has_inbox: holder.sock !== undefined && holder.sock !== "",
  };
}
//@ chunk-c0pq6qyx.js:154638-155270 placement
/**
 * 核实记录里的评论监听持有者是否还在：held（同进程或任务目录仍在/近期有同意）、gone（任务已不存在）、unproven（无法确认，如 pid 视图不可信或进程状态未知）。
 */
async function checkMonitorHolder(intent, identity, probes) {
  let { holderPid, holderJob } = intent;
  let identity_2 = probes.identityOf(intent);
  if (holderPid === undefined || identity_2 === undefined || holderJob === undefined) return "unproven";
  try {
    if (!(await probes.pidViewTrusted())) return "unproven";
    if (
      holderPid === probes.self.pid &&
      probes.self.token !== undefined &&
      probes.self.token === identity_2
    ) {
      if (probes.self.actingAsJob) return "held";
    } else {
      let pidState = probes.pidState(holderPid);
      if (pidState === "unknown") return "unproven";
      if (pidState === "alive") {
        let sameProcess = await probes.isSameProcess(holderPid, identity_2);
        if (sameProcess !== false) return sameProcess === true ? "held" : "unproven";
      }
    }
    if (!(await probes.jobDirExists(holderJob))) return "gone";
    if (await probes.jobDirTouchedRecently(holderJob)) return "unproven";
    if (await probes.jobPresent(holderJob)) return "held";
    return (await probes.freshConsentFor(holderJob, identity)) ? "held" : "gone";
  } catch {
    return "unproven";
  }
}
//@ chunk-c0pq6qyx.js:155270-155491 placement
/**
 * 把核实为 gone 的监听意图去掉持有者字段（变为无持有者），没有变化时返回原表。
 */
function dropGoneHolders(holders, isGone) {
  let changed = false;
  let kept = new Map();
  for (let [holderKey, holder] of holders)
    if (isGone.get(holderKey) === "gone") {
      let {
        holder: holder_2,
        holderPid,
        holderProcStart,
        holderProcStartFt,
        holderJob,
        holderPidSpace,
        ...reason
      } = holder;
      kept.set(holderKey, reason);
      changed = true;
    } else kept.set(holderKey, holder);
  return changed ? kept : holders;
}
export {
  isBackgroundSurface,
  describeReplyHolder,
  findLiveReplyHolder,
  describeHolderWithOthersComments,
  checkMonitorHolder,
  holderElsewhereText,
  describeHolderWithOthers,
  getHolderTelemetry,
  dropGoneHolders,
};
