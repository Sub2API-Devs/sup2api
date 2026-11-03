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
import { stripFormatChars, collapseWhitespace } from "./stringUtils.js";
import { truncateToWidth } from "./format.js";
import { SHORT_RE } from "../services/daemon/leaseProtocol.js";
import { isFsInaccessible, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";

//@ chunk-369n4ea8.js:410-791 placement
/**
 * 判断能否把提示词直接交给正在后台运行的会话：有可打开的会话与提示、标准输入输出可用，且没有任何 SDK/结构化输出/回合限制/恢复等参数时，返回打开方式与提示。
 */
function getAttachablePrompt(liveBackgroundHandoff, n, o) {
  return liveBackgroundHandoff !== undefined &&
    liveBackgroundHandoff.prompt !== null &&
    o.stdin &&
    o.stdout &&
    (n.outputFormat === undefined || n.outputFormat === "text") &&
    n.sdkUrl === undefined &&
    n.jsonSchema === undefined &&
    !n.includePartialMessages &&
    !n.replayUserMessages &&
    n.maxTurns === undefined &&
    n.maxBudgetUsd === undefined &&
    n.resumeSessionAt === undefined &&
    n.resumeDropsTurn === undefined &&
    n.rewindFiles === undefined
    ? {
        open: liveBackgroundHandoff.open,
        prompt: liveBackgroundHandoff.prompt,
      }
    : undefined;
}
//@ chunk-369n4ea8.js:791-939 placement
/**
 * 会话正在其他终端运行时的提示，以及标题最大长度与需要替换的引号字符正则。
 */
var SESSION_BUSY_ELSEWHERE_MESSAGE = "Can't open \u2014 this session is running in another terminal";
var MAX_TITLE_LENGTH = 60;
var QUOTE_CHARS_RE = /["\u02BA\u02EE\u05F4\u201C-\u201F\u2033\u2036\u301D-\u301F\uFF02]/g;
//@ chunk-369n4ea8.js:939-1007 placement
/**
 * quoteTitleForBackgroundNotice：引号包裹的截断标题。
 */
function quoteTitleForBackgroundNotice(title) {
  let replaced = stripFormatChars(collapseWhitespace(title)).replace(QUOTE_CHARS_RE, "'");
  return `"${truncateToWidth(replaced, MAX_TITLE_LENGTH)}"`;
}
//@ chunk-369n4ea8.js:1007-1420 placement
/**
 * 生成"会话正在后台运行"的提示：带标题与任务 id，附交接结果说明，以及如何 attach/stop 或用 --fork-session 分支的建议。
 */
function formatSessionRunningInBackground({ title, holder, canFork, handoff }) {
  let { jobId } = holder;
  let r = title ? quoteTitleForBackgroundNotice(title) : "That session";
  let a = jobId
    ? `Run \`claude attach ${jobId}\` to open it, or \`claude stop ${jobId}\` first to resume it here.`
    : "Run `claude agents` to find it and open it, or stop it there first to resume it here.";
  let u = canFork ? " Add --fork-session to branch off a copy instead." : "";
  return `${r} is running in the background${jobId ? ` (${jobId})` : ""}.${formatHandoffOutcome(handoff)} ${a}${u}`;
}
//@ chunk-369n4ea8.js:1420-1623 placement
/**
 * 找到持有该会话的后台（非交互）进程，并在确认任务状态对应该会话时附上任务 id。
 */
async function findBackgroundSessionHolder(sessionId, storageV5) {
  let found = (await listLiveSessionHolders(sessionId)).find((i) => i.kind !== "interactive");
  if (!found) return null;
  let jobId =
    found.jobId !== undefined &&
    SHORT_RE.test(found.jobId) &&
    (await isJobForSession(found.jobId, sessionId, storageV5))
      ? found.jobId
      : undefined;
  return {
    kind: found.kind,
    jobId,
  };
}
//@ chunk-369n4ea8.js:1623-1939 placement
/**
 * 读取任务状态，判断任务是否属于指定会话（会话 id 或恢复会话 id 一致），读取失败返回 false。
 */
async function isJobForSession(jobId, n, o) {
  try {
    let { getJobDir, readJobState } = await import("./chunk-bytagq68.js");
    let jobState = await readJobState(getJobDir(jobId), o);
    let lower = n.toLowerCase();
    return (
      jobState !== null &&
      (jobState.sessionId.toLowerCase() === lower || jobState.resumeSessionId?.toLowerCase() === lower)
    );
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[resume] job state unreadable: ${errorMessage(error)}`, {
        level: "warn",
      });
    else logError(error);
    return false;
  }
}
//@ chunk-369n4ea8.js:1939-2393 placement
/**
 * 列出其他进程中持有指定会话 id 的存活会话（排除自身与已停靠的交互会话），返回类型、任务 id 与 pid。
 */
async function listLiveSessionHolders(e, n) {
  let sessions = n?.rejectUnreadable
    ? await (
        await import("./chunk-ewxn4535.js")
      ).listAllLiveSessions(undefined, {
        rejectUnreadable: true,
      })
    : await import("./chunk-ewxn4535.js").then((session) => session.listAllLiveSessions()).catch(() => []);
  let normalizedId = e.toLowerCase();
  let holders = [];
  for (let session of sessions) {
    if (session.sessionId?.toLowerCase() !== normalizedId || session.pid === process.pid || !session.kind)
      continue;
    if (session.kind === "interactive" && session.parkedJobId !== undefined) continue;
    holders.push({
      kind: session.kind,
      jobId: session.jobId,
      pid: session.pid,
    });
  }
  return holders;
}
//@ chunk-369n4ea8.js:2393-2874 placement
/**
 * 描述交接结果：提示已排队、可能未送达、发送失败，或已发送但无法在此打开。
 */
function formatHandoffOutcome(handoff) {
  switch (handoff?.reason) {
    case undefined:
    case "not_openable":
      return "";
    case "prompt_undelivered":
      return {
        queued: " Your prompt was saved and will be sent to it when you next restart it.",
        unconfirmed: ` Your prompt may not have reached it: ${handoff.detail}.`,
        failed: ` Your prompt was not sent to it: ${handoff.detail}.`,
      }[handoff.delivery];
    case "open_failed":
      return handoff.promptSent
        ? ` Your prompt was sent to it, but it could not be opened here: ${handoff.detail}.`
        : ` It could not be opened here: ${handoff.detail}.`;
  }
}
export {
  findBackgroundSessionHolder,
  formatSessionRunningInBackground,
  quoteTitleForBackgroundNotice,
  formatHandoffOutcome,
  getAttachablePrompt,
  SESSION_BUSY_ELSEWHERE_MESSAGE,
  listLiveSessionHolders,
};
