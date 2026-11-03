/**
 * utils/backgroundHandoff.ts
 *
 * 2.1.316 新增：后台交接状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8fqgaf3a.js (20)
 * attribution: placement 20
 */
import { isAgentsFleetEnabled } from "./fleetGates.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import { b7e, screensChanged } from "./processUserInput/userPromptSubmitHooks.js";
import { logForDebugging } from "./debug.js";
import { isCheckinNotification } from "./messageQueueManager.js";
import { looksLikeSlashInput } from "../commands.js";
import { plural } from "./stringUtils.js";
import { isInterruptionOnlyMessage } from "./messages.js";
import { isTranscriptPersistenceDisabled } from "./sessionStorage.js";

//@ chunk-8fqgaf3a.js:9830-9864 placement
function aze() {
  return isAgentsFleetEnabled() && !getIsRemoteMode();
}
//@ chunk-8fqgaf3a.js:9864-9950 placement
function Ct(e, o) {
  if (!e) return "idle-fork";
  return o ? "defer-then-fork" : "abort-then-fork";
}
/**
 * 当前能否转后台及方式（detach 或其他），不能时给原因。
 */
//@ chunk-8fqgaf3a.js:9950-10350 placement
function backgroundEligibility(e) {
  let { inFlight: inFlight } = e;
  if (e.isBg) return { ok: !0, via: "detach", inFlight: inFlight };
  if (!e.fleetEnabled) return { ok: !1, reason: "fleet-disabled", inFlight: inFlight };
  if (e.isRemote) return { ok: !1, reason: "remote", inFlight: inFlight };
  if (e.persistenceDisabled) return { ok: !1, reason: "persistence", inFlight: inFlight };
  if (e.isExternalLoading) return { ok: !1, reason: "loading", inFlight: inFlight };
  return { ok: !0, via: Ct(e.isLoading, e.betweenCalls), inFlight: inFlight };
}
//@ chunk-8fqgaf3a.js:10350-10385 placement
function RKn(e, o) {
  return !o && !isAssistantStreaming(e);
}
//@ chunk-8fqgaf3a.js:10385-10540 placement
function isAssistantStreaming(e) {
  for (let o = e.length - 1; o >= 0; o--) {
    let r = e[o];
    if (r.type === "assistant") return r.message?.stop_reason === null;
    if (r.type === "user") return !1;
  }
  return !1;
}
/**
 * 生成中助手文本长度。
 */
//@ chunk-8fqgaf3a.js:10540-10813 placement
function streamingTextLength(e) {
  let o = 0;
  for (let r = e.length - 1; r >= 0; r--) {
    let n = e[r];
    if (n.type === "assistant") {
      if (n.message?.stop_reason !== null) return o;
      for (let s of n.message?.content ?? [])
        if (s.type === "text" && typeof s.text === "string") o += s.text.length;
    } else if (n.type === "user") return o;
  }
  return o;
}
/**
 * 生成中助手文本（加未发送尾部）。
 */
//@ chunk-8fqgaf3a.js:10813-11175 placement
function streamingTextSoFar(e, o) {
  let r = e.length;
  for (let s = e.length - 1; s >= 0; s--) {
    let m = e[s];
    if (m.type === "assistant") {
      if (m.message?.stop_reason !== null) break;
      r = s;
    } else if (m.type === "user") break;
  }
  let n = "";
  for (let s = r; s < e.length; s++) {
    let m = e[s];
    if (m.type !== "assistant") continue;
    for (let u of m.message?.content ?? []) if (u.type === "text" && typeof u.text === "string") n += u.text;
  }
  return n + (o ?? "");
}
/**
 * 判断提示是否处于筛查保留中（读取失败视为保留）。
 */
//@ chunk-8fqgaf3a.js:11175-11363 placement
function createHeldScreeningCheck(e) {
  let o,
    r = !1;
  return (n) => {
    if (r) return !0;
    try {
      return ((o ??= b7e(e())), screensChanged(n.under, o));
    } catch (error) {
      return (
        (r = !0),
        logForDebugging(`heldScreening could not read the screening: ${error}`, { level: "error" }),
        !0
      );
    }
  };
}
/**
 * 排队命令中不能随交接带走的数量。
 */
//@ chunk-8fqgaf3a.js:11363-11641 placement
function countHeldQueuedCommands(e, o) {
  let r = 0;
  for (let n of e) {
    if (isCheckinNotification(n)) continue;
    if (
      n.priority === "later" ||
      n.drainOnly === !0 ||
      n.screeningPending === !0 ||
      (n.promptSubmitted !== void 0 && o !== void 0 && o(n.promptSubmitted)) ||
      n.mode === "bash" ||
      n.mode === "poll-event" ||
      (looksLikeSlashInput(n.value) && !n.skipSlashCommands)
    )
      r++;
  }
  return r;
}
/**
 * 等待子代理以便交接的提示。
 */
//@ chunk-8fqgaf3a.js:11641-11871 placement
function waitingForSubagentsMessage(e) {
  return `Still backgrounding after the current tool \u2014 waiting for ${e} running ${plural(e, "subagent")} so the work carries over. Press \u2190 again to skip ahead and restart ${e === 1 ? "it" : "them"} from the beginning.`;
}
//@ chunk-8fqgaf3a.js:11871-11958 placement
function qan(e, o) {
  return `Backgrounding cancelled \u2014 ${e}.${o === void 0 ? "" : ` ${o}`}`;
}
/**
 * 转后台受阻提示。
 */
//@ chunk-8fqgaf3a.js:11958-12182 placement
var UNSENT_INPUT_BLOCK = qan(
    "you have unsent text in the input",
    "Send it or clear it, then press \u2190 again.",
  ),
  WAITING_FOR_ANSWER_MESSAGE =
    "Still backgrounding after the current tool \u2014 a question is waiting for your answer.",
  TURN_STOPPED_BLOCK = qan("the turn was stopped");
//@ chunk-8fqgaf3a.js:12182-12375 placement = _temp (1)
function isToolResultUserMessage(c) {
  if (c.type !== "user") return !1;
  let o = c.message?.content;
  return (
    Array.isArray(o) &&
    o[0]?.type === "tool_result" &&
    o.every((r) => r.type === "tool_result" || r.type === "text" || r.type === "image")
  );
}
//@ chunk-8fqgaf3a.js:12375-12547 placement
function isUnfinishedTailMessage(e) {
  if (e.type === "system") return !0;
  if (e.type === "assistant") {
    let o = e.message?.stop_reason;
    return o === null || o === "tool_use";
  }
  if (e.type === "user") return isInterruptionOnlyMessage(e);
  return !1;
}
/**
 * 去掉末尾未完成的助手/中断消息。
 */
//@ chunk-8fqgaf3a.js:12547-12879 placement
function trimIncompleteTail(e) {
  let o = e.length,
    r = !1;
  while (o > 0) {
    let s = e[o - 1];
    if (s.type === "user")
      if (isInterruptionOnlyMessage(s)) r ||= isToolResultUserMessage(s);
      else if (r && isToolResultUserMessage(s));
      else break;
    else if (s.type === "assistant") {
      if (!isUnfinishedTailMessage(s)) break;
      r = !1;
    }
    o--;
  }
  let filtered = e.slice(o).filter((s) => s.type !== "user" && s.type !== "assistant" && s.type !== "system");
  if (o + filtered.length === e.length) return e;
  return [...e.slice(0, o), ...filtered];
}
/**
 * 修剪后最后一条用户或助手消息 uuid。
 */
//@ chunk-8fqgaf3a.js:12879-13010 placement
function lastSettledMessageUuid(e) {
  let o = trimIncompleteTail(e);
  for (let r = o.length - 1; r >= 0; r--) {
    let n = o[r].type;
    if (n === "user" || n === "assistant") return o[r].uuid;
  }
  return;
}
/**
 * 消息列表是否仍停在记录的位置之后。
 */
//@ chunk-8fqgaf3a.js:13010-13229 placement
function isAtResumePoint(e, o) {
  if (e === null || e.length < 1 || e.length > o.length) return !1;
  let r = e.length - 1;
  if (o[r]?.uuid !== e.uuid) return !1;
  for (let n = e.length; n < o.length; n++) {
    let s = o[n].type;
    if (s === "user" || s === "assistant") return !1;
  }
  return !0;
}
/**
 * 最后一条对话消息是非中断的用户消息。
 */
//@ chunk-8fqgaf3a.js:13229-13361 placement
function endsWithUserPrompt(e) {
  for (let o = e.length - 1; o >= 0; o--) {
    let r = e[o];
    if (r.type === "user") return !isInterruptionOnlyMessage(r);
    if (r.type === "assistant") return !1;
  }
  return !1;
}
//@ chunk-8fqgaf3a.js:13361-13407 placement
function OKn(e) {
  return e.ok && e.via !== "detach";
}
//@ chunk-8fqgaf3a.js:13407-13498 placement
function aUt(e) {
  return backgroundEligibility({
    ...e,
    fleetEnabled: isAgentsFleetEnabled(),
    isRemote: getIsRemoteMode(),
    persistenceDisabled: isTranscriptPersistenceDisabled(),
  });
}

export {
  trimIncompleteTail,
  endsWithUserPrompt,
  TURN_STOPPED_BLOCK,
  UNSENT_INPUT_BLOCK,
  aUt,
  OKn,
  countHeldQueuedCommands,
  createHeldScreeningCheck,
  streamingTextLength,
  streamingTextSoFar,
  lastSettledMessageUuid,
  RKn,
  waitingForSubagentsMessage,
  WAITING_FOR_ANSWER_MESSAGE,
  isAtResumePoint,
  qan,
  aze,
};
