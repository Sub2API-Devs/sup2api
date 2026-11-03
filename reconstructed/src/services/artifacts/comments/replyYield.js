/**
 * services/artifacts/comments/replyYield.ts
 *
 * 2.1.316 新增：用户活跃时评论回复的让步/延后
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (14)
 * attribution: placement 14
 */
import { TMUX_LOCATION_RE } from "../../../utils/concurrentSessions.js";
import { plural, sanitizeSessionTitle, truncateToLength, takeLastChars } from "../../../utils/stringUtils.js";
import { truncateToWidth, truncatePathMiddle, formatDuration } from "../../../utils/format.js";
import { replaceControlChars } from "../../../utils/resultError.js";
import { tildify } from "../../../utils/path.js";
import { fromEnum } from "../../analytics/safeMetadata.js";

//@ chunk-9tgt55am.js:156222-156762 placement
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
    let d = record.procStartFt ?? record.procStart;
    if (d === undefined) {
      hasUnproven = true;
      continue;
    }
    let h = await options.isSameProcess(record.pid, d);
    if (h === true) confirmed.push(record);
    else if (h === undefined) hasUnproven = true;
  }
  confirmed.sort(
    (s, d) =>
      Number(isBackgroundSurface(d.kind)) - Number(isBackgroundSurface(s.kind)) ||
      (d.statusUpdatedAt ?? 0) - (s.statusUpdatedAt ?? 0),
  );
  let [a, ...r] = confirmed;
  return a !== undefined
    ? {
        verdict: "live",
        holder: a,
        otherHolders: r,
        ...(hasUnproven && {
          unproven: true,
        }),
      }
    : {
        verdict: hasUnproven ? "unknown" : "none",
      };
}
//@ chunk-9tgt55am.js:156762-156815 placement
/**
 * 导出函数 `isBackgroundSurface`：参数 e，返回 e !== void 0 && e !== "interactive"。
 */
function isBackgroundSurface(kind) {
  return kind !== undefined && kind !== "interactive";
}
//@ chunk-9tgt55am.js:156815-157067 placement
function getHolderSurface(e) {
  if (isBackgroundSurface(e.kind)) return "background";
  switch (e.entrypoint) {
    case "claude-desktop":
    case "claude-desktop-3p":
    case "local-agent":
      return "desktop";
    case "claude-vscode":
      return "vscode";
    default:
      return e.tmux !== undefined && TMUX_LOCATION_RE.test(e.tmux) ? "tmux" : "terminal";
  }
}
//@ chunk-9tgt55am.js:157067-157133 placement
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
//@ chunk-9tgt55am.js:157133-157235 placement
/**
 * 描述讨论串持有者所在位置，有其他会话时附"及 N 个其他会话"。
 */
function describeHolderWithOthers(e) {
  return e.others > 0 ? `${e.where} and ${e.others} other ${plural(e.others, "session")}` : e.where;
}
//@ chunk-9tgt55am.js:157235-157310 placement
/**
 * 导出函数 `holderElsewhereText`：参数 e，返回 e !== void 0 ? describeHolderWithOthers(e) : "another session on this machine"。
 */
function holderElsewhereText(liveHolder) {
  return liveHolder !== undefined ? describeHolderWithOthers(liveHolder) : "another session on this machine";
}
//@ chunk-9tgt55am.js:157310-157457 placement
var MAX_HOLDER_NAME_WIDTH = 40;
var QUOTE_CHARS = '"\u201C\u201D\u201E\u201F\u2033\u2036\uFF02';
var QUOTE_CHARS_RE = new RegExp(`[${QUOTE_CHARS}]`, "g");
var QUOTE_PAREN_COMMA_RE = new RegExp(`[${QUOTE_CHARS}(),]`, "g");
var MAX_HOLDER_CWD_WIDTH = 48;
var MAX_HOLDER_RAW_LENGTH = 512;
var MAX_HOLDER_IDLE_MS = 7776000000;
//@ chunk-9tgt55am.js:157457-157532 placement
function ageWithinHolderLimit(e, t) {
  if (e === undefined) return;
  let n = t - e;
  return n > 0 && n <= MAX_HOLDER_IDLE_MS ? n : undefined;
}
//@ chunk-9tgt55am.js:157532-157605 placement
function holderIdleMs(e, t) {
  return e.status === "idle" ? ageWithinHolderLimit(e.statusUpdatedAt, t) : undefined;
}
//@ chunk-9tgt55am.js:157605-157647 placement
function holderAgeMs(e, t) {
  return ageWithinHolderLimit(e.startedAt, t);
}
//@ chunk-9tgt55am.js:157647-158451 placement
/**
 * 用一句话描述占用评论自动回复的另一个会话：后台代理/桌面应用/VS Code/tmux 窗格/另一个终端，附带会话名、工作目录与空闲或打开时长。
 */
function describeReplyHolder(holder, now) {
  let n =
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
  let parens = (...R) => {
    let filtered = R.filter((N) => N !== "");
    return filtered.length > 0 ? ` (${filtered.join(", ")})` : "";
  };
  let quotedName = n !== "" ? `"${n}"` : "";
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
//@ chunk-9tgt55am.js:158451-158704 placement
/**
 * 生成持有者相关的打点字段：界面、状态、空闲分钟数、存在分钟数与是否有收件箱套接字。
 */
function getHolderTelemetry(liveHolder, now) {
  let n = holderIdleMs(liveHolder, now);
  let a = holderAgeMs(liveHolder, now);
  return {
    holder_surface: fromEnum(getHolderSurface(liveHolder)),
    holder_status: fromEnum(liveHolder.status ?? "none"),
    holder_idle_min: n === undefined ? -1 : Math.floor(n / 60000),
    holder_age_min: a === undefined ? -1 : Math.floor(a / 60000),
    holder_has_inbox: liveHolder.sock !== undefined && liveHolder.sock !== "",
  };
}
//@ chunk-9tgt55am.js:158704-159336 placement
/**
 * 核实记录里的评论监听持有者是否还在：held（同进程或任务目录仍在/近期有同意）、gone（任务已不存在）、unproven（无法确认，如 pid 视图不可信或进程状态未知）。
 */
async function checkMonitorHolder(intent, t, probes) {
  let { holderPid, holderJob } = intent;
  let identity = probes.identityOf(intent);
  if (holderPid === undefined || identity === undefined || holderJob === undefined) return "unproven";
  try {
    if (!(await probes.pidViewTrusted())) return "unproven";
    if (holderPid === probes.self.pid && probes.self.token !== undefined && probes.self.token === identity) {
      if (probes.self.actingAsJob) return "held";
    } else {
      let h = probes.pidState(holderPid);
      if (h === "unknown") return "unproven";
      if (h === "alive") {
        let y = await probes.isSameProcess(holderPid, identity);
        if (y !== false) return y === true ? "held" : "unproven";
      }
    }
    if (!(await probes.jobDirExists(holderJob))) return "gone";
    if (await probes.jobDirTouchedRecently(holderJob)) return "unproven";
    if (await probes.jobPresent(holderJob)) return "held";
    return (await probes.freshConsentFor(holderJob, t)) ? "held" : "gone";
  } catch {
    return "unproven";
  }
}
//@ chunk-9tgt55am.js:159336-159557 placement
/**
 * 把核实为 gone 的监听意图去掉持有者字段（变为无持有者），没有变化时返回原表。
 */
function dropGoneHolders(e, t) {
  let n = false;
  let a = new Map();
  for (let [r, s] of e)
    if (t.get(r) === "gone") {
      let { holder, holderPid, holderProcStart, holderProcStartFt, holderJob, holderPidSpace, ...N } = s;
      a.set(r, N);
      n = true;
    } else a.set(r, s);
  return n ? a : e;
}
export {
  holderElsewhereText,
  describeHolderWithOthers,
  getHolderTelemetry,
  describeHolderWithOthersComments,
  dropGoneHolders,
  findLiveReplyHolder,
  checkMonitorHolder,
  isBackgroundSurface,
  describeReplyHolder,
};
