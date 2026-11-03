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

/**
 * 在会话进程记录里找出同一会话、仍在运行且确认是同一进程的其他持有者（后台类优先、状态较新的优先）；返回 live（含其他持有者、是否有无法证实的）、unknown 或 none。
 */
//@ chunk-9tgt55am.js:156222-156762 placement
async function findLiveReplyHolder(options) {
  let hasUnproven = !1,
    confirmed = [];
  for (let record of options.records) {
    if (
      record.sessionId !== options.sessionId ||
      record.pid === options.selfPid ||
      record.parkedJobId !== void 0
    )
      continue;
    if (!options.isRunning(record.pid)) continue;
    let d = record.procStartFt ?? record.procStart;
    if (d === void 0) {
      hasUnproven = !0;
      continue;
    }
    let isSameProcess = await options.isSameProcess(record.pid, d);
    if (isSameProcess === !0) confirmed.push(record);
    else if (isSameProcess === void 0) hasUnproven = !0;
  }
  confirmed.sort(
    (s, d) =>
      Number(Czn(d.kind)) - Number(Czn(s.kind)) || (d.statusUpdatedAt ?? 0) - (s.statusUpdatedAt ?? 0),
  );
  let [a, ...r] = confirmed;
  return a !== void 0
    ? { verdict: "live", holder: a, otherHolders: r, ...(hasUnproven && { unproven: !0 }) }
    : { verdict: hasUnproven ? "unknown" : "none" };
}
//@ chunk-9tgt55am.js:156762-156815 placement
function Czn(e) {
  return e !== void 0 && e !== "interactive";
}
//@ chunk-9tgt55am.js:156815-157067 placement
function getHolderSurface(e) {
  if (Czn(e.kind)) return "background";
  switch (e.entrypoint) {
    case "claude-desktop":
    case "claude-desktop-3p":
    case "local-agent":
      return "desktop";
    case "claude-vscode":
      return "vscode";
    default:
      return e.tmux !== void 0 && TMUX_LOCATION_RE.test(e.tmux) ? "tmux" : "terminal";
  }
}
//@ chunk-9tgt55am.js:157067-157133 placement
function Rzn(e, t, n) {
  return { where: describeReplyHolder(e, n), surface: getHolderSurface(e), others: t };
}
/**
 * 描述讨论串持有者所在位置，有其他会话时附"及 N 个其他会话"。
 */
//@ chunk-9tgt55am.js:157133-157235 placement
function describeHolderWithOthers(e) {
  return e.others > 0 ? `${e.where} and ${e.others} other ${plural(e.others, "session")}` : e.where;
}
//@ chunk-9tgt55am.js:157235-157310 placement
function Min(e) {
  return e !== void 0 ? describeHolderWithOthers(e) : "another session on this machine";
}
//@ chunk-9tgt55am.js:157310-157457 placement
var MAX_HOLDER_NAME_WIDTH = 40,
  QUOTE_CHARS = '"\u201C\u201D\u201E\u201F\u2033\u2036\uFF02',
  QUOTE_CHARS_RE = new RegExp(`[${QUOTE_CHARS}]`, "g"),
  QUOTE_PAREN_COMMA_RE = new RegExp(`[${QUOTE_CHARS}(),]`, "g"),
  MAX_HOLDER_CWD_WIDTH = 48,
  MAX_HOLDER_RAW_LENGTH = 512,
  MAX_HOLDER_IDLE_MS = 7776000000;
//@ chunk-9tgt55am.js:157457-157532 placement
function Ka(e, t) {
  if (e === void 0) return;
  let n = t - e;
  return n > 0 && n <= MAX_HOLDER_IDLE_MS ? n : void 0;
}
//@ chunk-9tgt55am.js:157532-157605 placement
function ja(e, t) {
  return e.status === "idle" ? Ka(e.statusUpdatedAt, t) : void 0;
}
//@ chunk-9tgt55am.js:157605-157647 placement
function Va(e, t) {
  return Ka(e.startedAt, t);
}
/**
 * 用一句话描述占用评论自动回复的另一个会话：后台代理/桌面应用/VS Code/tmux 窗格/另一个终端，附带会话名、工作目录与空闲或打开时长。
 */
//@ chunk-9tgt55am.js:157647-158451 placement
function describeReplyHolder(holder, now) {
  let n =
      holder.name !== void 0 &&
      (holder.nameSource === void 0 || holder.nameSource === "user" || holder.nameSource === "peer")
        ? truncateToWidth(
            sanitizeSessionTitle(truncateToLength(holder.name, MAX_HOLDER_RAW_LENGTH)).replace(
              QUOTE_CHARS_RE,
              "'",
            ),
            MAX_HOLDER_NAME_WIDTH,
          )
        : "",
    cwdLabel =
      holder.cwd !== void 0 && holder.cwd !== "?"
        ? truncatePathMiddle(
            replaceControlChars(tildify(takeLastChars(holder.cwd, MAX_HOLDER_RAW_LENGTH)))
              .replace(QUOTE_PAREN_COMMA_RE, "")
              .trim(),
            MAX_HOLDER_CWD_WIDTH,
          )
        : "",
    parens = (...R) => {
      let filtered = R.filter((N) => N !== "");
      return filtered.length > 0 ? ` (${filtered.join(", ")})` : "";
    },
    quotedName = n !== "" ? `"${n}"` : "",
    d = holder.tmux !== void 0 && TMUX_LOCATION_RE.test(holder.tmux) ? holder.tmux : "",
    idleMs = ja(holder, now),
    ageMs = Va(holder, now),
    durationLabel =
      idleMs !== void 0 && idleMs >= 60000
        ? `idle for ${formatDuration(idleMs, { mostSignificantOnly: !0 })}`
        : ageMs !== void 0 && ageMs >= 60000
          ? `open for ${formatDuration(ageMs, { mostSignificantOnly: !0 })}`
          : "";
  switch (getHolderSurface(holder)) {
    case "background":
      return `a background agent${parens(quotedName, cwdLabel, durationLabel)}`;
    case "desktop":
      return `the Claude Desktop app${parens(quotedName, durationLabel)}`;
    case "vscode":
      return `VS Code${parens(quotedName, cwdLabel, durationLabel)}`;
    case "tmux":
      return `tmux pane ${d}${parens(quotedName, cwdLabel, durationLabel)}`;
    case "terminal":
      return `another terminal${parens(quotedName, cwdLabel, durationLabel)}`;
  }
}
/**
 * 生成持有者相关的打点字段：界面、状态、空闲分钟数、存在分钟数与是否有收件箱套接字。
 */
//@ chunk-9tgt55am.js:158451-158704 placement
function getHolderTelemetry(e, t) {
  let n = ja(e, t),
    a = Va(e, t);
  return {
    holder_surface: fromEnum(getHolderSurface(e)),
    holder_status: fromEnum(e.status ?? "none"),
    holder_idle_min: n === void 0 ? -1 : Math.floor(n / 60000),
    holder_age_min: a === void 0 ? -1 : Math.floor(a / 60000),
    holder_has_inbox: e.sock !== void 0 && e.sock !== "",
  };
}
/**
 * 核实记录里的评论监听持有者是否还在：held（同进程或任务目录仍在/近期有同意）、gone（任务已不存在）、unproven（无法确认，如 pid 视图不可信或进程状态未知）。
 */
//@ chunk-9tgt55am.js:158704-159336 placement
async function checkMonitorHolder(intent, t, probes) {
  let { holderPid: holderPid, holderJob: holderJob } = intent,
    identity = probes.identityOf(intent);
  if (holderPid === void 0 || identity === void 0 || holderJob === void 0) return "unproven";
  try {
    if (!(await probes.pidViewTrusted())) return "unproven";
    if (holderPid === probes.self.pid && probes.self.token !== void 0 && probes.self.token === identity) {
      if (probes.self.actingAsJob) return "held";
    } else {
      let pidState = probes.pidState(holderPid);
      if (pidState === "unknown") return "unproven";
      if (pidState === "alive") {
        let isSameProcess = await probes.isSameProcess(holderPid, identity);
        if (isSameProcess !== !1) return isSameProcess === !0 ? "held" : "unproven";
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
/**
 * 把核实为 gone 的监听意图去掉持有者字段（变为无持有者），没有变化时返回原表。
 */
//@ chunk-9tgt55am.js:159336-159557 placement
function dropGoneHolders(e, t) {
  let n = !1,
    a = new Map();
  for (let [r, s] of e)
    if (t.get(r) === "gone") {
      let {
        holder: holder,
        holderPid: holderPid,
        holderProcStart: holderProcStart,
        holderProcStartFt: holderProcStartFt,
        holderJob: holderJob,
        holderPidSpace: holderPidSpace,
        ...N
      } = s;
      (a.set(r, N), (n = !0));
    } else a.set(r, s);
  return n ? a : e;
}

export {
  Min,
  describeHolderWithOthers,
  getHolderTelemetry,
  Rzn,
  dropGoneHolders,
  findLiveReplyHolder,
  checkMonitorHolder,
  Czn,
  describeReplyHolder,
};
