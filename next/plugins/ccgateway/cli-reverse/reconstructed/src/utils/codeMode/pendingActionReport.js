/**
 * utils/codeMode/pendingActionReport.ts
 *
 * Code 模式挂起待办（requires_action/idle）的上报：识别 repl_ 前缀的 can_use_tool/request_user_dialog 请求并随轮次结束更新 holding 与元数据（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a8qyz3e3.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";

//@ chunk-a8qyz3e3.js:227-243 placement
/**
 * repl_ 前缀，用于识别 Code 模式产生的请求 id。
 */
var SCRIPT_CALL_TOOL_USE_ID_PREFIX = "repl_";
//@ chunk-a8qyz3e3.js:243-407 placement
function isScriptCallRequest(request) {
  let request_2 = request.request;
  return (
    (request_2.subtype === "can_use_tool" || request_2.subtype === "request_user_dialog") &&
    typeof request_2.tool_use_id === "string" &&
    request_2.tool_use_id.startsWith(SCRIPT_CALL_TOOL_USE_ID_PREFIX)
  );
}
//@ chunk-a8qyz3e3.js:407-441 placement
/**
 * 新建挂起上报状态。
 */
function createScriptPromptState() {
  return {
    holding: false,
  };
}
//@ chunk-a8qyz3e3.js:441-595 placement (2.1.88 match: notifySessionStateChanged, 0.398)
/**
 * 按 requires_action/idle 更新上报细节与 holding。
 */
function noteStateReported(scriptState, open, state, details) {
  if (!codeModeAccepted()) return;
  if (state === "requires_action")
    scriptState.reported = {
      details: details ?? null,
      open: open.size,
    };
  else {
    scriptState.reported = undefined;
    if (state === "idle") scriptState.holding = false;
  }
}
//@ chunk-a8qyz3e3.js:595-672 placement
/**
 * 判定请求是否为 Code 模式的挂起请求并置 holding。
 */
function keepsTurnEnded(scriptState, entry) {
  if (!codeModeAccepted()) return false;
  if (!isScriptCallRequest(entry)) return false;
  scriptState.holding = true;
  return true;
}
//@ chunk-a8qyz3e3.js:672-768 placement
/**
 * 队列里出现 Code 模式挂起请求时置 holding。
 */
function noteScriptPromptsShown(scriptState, openRequests) {
  if (!codeModeAccepted()) return;
  for (let entry of openRequests.values())
    if (isScriptCallRequest(entry.request)) {
      scriptState.holding = true;
      return;
    }
}
//@ chunk-a8qyz3e3.js:768-842 placement
function findLatestScriptRequest(openRequests, isOurs) {
  let found;
  for (let [id, entry] of openRequests) if (isOurs(id) && isScriptCallRequest(entry.request)) found = entry;
  return found;
}
//@ chunk-a8qyz3e3.js:842-1039 placement
/**
 * 在待办里查到匹配项时置 holding，并按需上报 requires_action。
 */
function holdAtTurnEnd(scriptState, openRequests, isOurs, state, report) {
  if (!codeModeAccepted()) return false;
  let found = findLatestScriptRequest(openRequests, isOurs);
  if (found === undefined) return false;
  scriptState.holding = true;
  if (state !== "requires_action" || scriptState.reported?.details !== (found.details ?? null))
    report("requires_action", found.details);
  return true;
}
//@ chunk-a8qyz3e3.js:1039-1587 placement
/**
 * 轮次结束时按 holding 与上报状态补发 idle/requires_action，并在待办变少时更新元数据。
 */
function reportAfterTurnEnded(scriptState, openRequests, isOurs, state, report, options = {}) {
  if (!codeModeAccepted()) return;
  let found = findLatestScriptRequest(openRequests, isOurs);
  if (!scriptState.holding) return;
  if (found === undefined) {
    report("idle");
    return;
  }
  let details = scriptState.reported;
  if (state !== "requires_action" || details?.details !== (found.details ?? null))
    report("requires_action", found.details);
  else if (
    options.metadata !== undefined &&
    found.details !== undefined &&
    details !== undefined &&
    openRequests.size < details.open
  ) {
    let others = found.details;
    options.metadata.transport.reportMetadata({
      pending_action: others,
      pending_actions: options.metadata.buildPendingActionsPlural(
        others,
        [...openRequests.values()]
          .flatMap((entry) => (entry.details ? [entry.details] : []))
          .reverse()
          .filter((otherDetails) => otherDetails !== others),
      ),
    });
    scriptState.reported = {
      details: details.details,
      open: openRequests.size,
    };
  }
}
export {
  SCRIPT_CALL_TOOL_USE_ID_PREFIX,
  createScriptPromptState,
  holdAtTurnEnd,
  keepsTurnEnded,
  noteScriptPromptsShown,
  noteStateReported,
  reportAfterTurnEnded,
};
