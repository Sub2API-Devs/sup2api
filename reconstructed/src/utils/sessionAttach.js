/**
 * utils/sessionAttach.ts
 *
 * 2.1.316 新增。会话附着。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-369n4ea8.js (8)
 * attribution: placement 8
 */
import { stripFormatChars, Dr } from "./stringUtils.js";
import { truncateToWidth } from "./format.js";
import { SHORT_RE } from "../services/daemon/leaseProtocol.js";
import { isFsInaccessible, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";

/**
 * 判断能否把提示词直接交给正在后台运行的会话：有可打开的会话与提示、标准输入输出可用，且没有任何 SDK/结构化输出/回合限制/恢复等参数时，返回打开方式与提示。
 */
//@ chunk-369n4ea8.js:410-791 placement
function getAttachablePrompt(e, n, o) {
  return e !== void 0 &&
    e.prompt !== null &&
    o.stdin &&
    o.stdout &&
    (n.outputFormat === void 0 || n.outputFormat === "text") &&
    n.sdkUrl === void 0 &&
    n.jsonSchema === void 0 &&
    !n.includePartialMessages &&
    !n.replayUserMessages &&
    n.maxTurns === void 0 &&
    n.maxBudgetUsd === void 0 &&
    n.resumeSessionAt === void 0 &&
    n.resumeDropsTurn === void 0 &&
    n.rewindFiles === void 0
    ? { open: e.open, prompt: e.prompt }
    : void 0;
}
/**
 * 会话正在其他终端运行时的提示，以及标题最大长度与需要替换的引号字符正则。
 */
//@ chunk-369n4ea8.js:791-939 placement
var SESSION_BUSY_ELSEWHERE_MESSAGE = "Can't open \u2014 this session is running in another terminal",
  MAX_TITLE_LENGTH = 60,
  QUOTE_CHARS_RE = /["\u02BA\u02EE\u05F4\u201C-\u201F\u2033\u2036\u301D-\u301F\uFF02]/g;
//@ chunk-369n4ea8.js:939-1007 placement
function xHt(e) {
  let replaced = stripFormatChars(Dr(e)).replace(QUOTE_CHARS_RE, "'");
  return `"${truncateToWidth(replaced, MAX_TITLE_LENGTH)}"`;
}
/**
 * 生成"会话正在后台运行"的提示：带标题与任务 id，附交接结果说明，以及如何 attach/stop 或用 --fork-session 分支的建议。
 */
//@ chunk-369n4ea8.js:1007-1420 placement
function formatSessionRunningInBackground({
  title: title,
  holder: holder,
  canFork: canFork,
  handoff: handoff,
}) {
  let { jobId: jobId } = holder,
    r = title ? xHt(title) : "That session",
    a = jobId
      ? `Run \`claude attach ${jobId}\` to open it, or \`claude stop ${jobId}\` first to resume it here.`
      : "Run `claude agents` to find it and open it, or stop it there first to resume it here.",
    u = canFork ? " Add --fork-session to branch off a copy instead." : "";
  return `${r} is running in the background${jobId ? ` (${jobId})` : ""}.${formatHandoffOutcome(handoff)} ${a}${u}`;
}
/**
 * 找到持有该会话的后台（非交互）进程，并在确认任务状态对应该会话时附上任务 id。
 */
//@ chunk-369n4ea8.js:1420-1623 placement
async function findBackgroundSessionHolder(e, n) {
  let found = (await listLiveSessionHolders(e)).find((i) => i.kind !== "interactive");
  if (!found) return null;
  let s =
    found.jobId !== void 0 && SHORT_RE.test(found.jobId) && (await isJobForSession(found.jobId, e, n))
      ? found.jobId
      : void 0;
  return { kind: found.kind, jobId: s };
}
/**
 * 读取任务状态，判断任务是否属于指定会话（会话 id 或恢复会话 id 一致），读取失败返回 false。
 */
//@ chunk-369n4ea8.js:1623-1939 placement
async function isJobForSession(e, n, o) {
  try {
    let { getJobDir: getJobDir, readJobState: readJobState } = await import("./chunk-bytagq68.js"),
      r = await readJobState(getJobDir(e), o),
      lower = n.toLowerCase();
    return r !== null && (r.sessionId.toLowerCase() === lower || r.resumeSessionId?.toLowerCase() === lower);
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[resume] job state unreadable: ${errorMessage(error)}`, { level: "warn" });
    else logError(error);
    return !1;
  }
}
/**
 * 列出其他进程中持有指定会话 id 的存活会话（排除自身与已停靠的交互会话），返回类型、任务 id 与 pid。
 */
//@ chunk-369n4ea8.js:1939-2393 placement
async function listLiveSessionHolders(e, n) {
  let sessions = n?.rejectUnreadable
      ? await (await import("./chunk-ewxn4535.js")).listAllLiveSessions(void 0, { rejectUnreadable: !0 })
      : await import("./chunk-ewxn4535.js").then((session) => session.listAllLiveSessions()).catch(() => []),
    normalizedId = e.toLowerCase(),
    holders = [];
  for (let r of sessions) {
    if (r.sessionId?.toLowerCase() !== normalizedId || r.pid === process.pid || !r.kind) continue;
    if (r.kind === "interactive" && r.parkedJobId !== void 0) continue;
    holders.push({ kind: r.kind, jobId: r.jobId, pid: r.pid });
  }
  return holders;
}
/**
 * 描述交接结果：提示已排队、可能未送达、发送失败，或已发送但无法在此打开。
 */
//@ chunk-369n4ea8.js:2393-2874 placement
function formatHandoffOutcome(e) {
  switch (e?.reason) {
    case void 0:
    case "not_openable":
      return "";
    case "prompt_undelivered":
      return {
        queued: " Your prompt was saved and will be sent to it when you next restart it.",
        unconfirmed: ` Your prompt may not have reached it: ${e.detail}.`,
        failed: ` Your prompt was not sent to it: ${e.detail}.`,
      }[e.delivery];
    case "open_failed":
      return e.promptSent
        ? ` Your prompt was sent to it, but it could not be opened here: ${e.detail}.`
        : ` It could not be opened here: ${e.detail}.`;
  }
}

export {
  findBackgroundSessionHolder,
  formatSessionRunningInBackground,
  xHt,
  formatHandoffOutcome,
  getAttachablePrompt,
  SESSION_BUSY_ELSEWHERE_MESSAGE,
  listLiveSessionHolders,
};
