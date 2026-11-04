/**
 * cli/print/permissionAsks.ts
 *
 * 2.1.316 新增：未答复权限请求的等待、拒绝与丢失调用说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (7)
 * attribution: placement 7
 */
import { isUnicodeIdentifier } from "../../utils/sanitization.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { findUnresolvedToolUsesInTranscript } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { TOOLU_PLUGIN } from "../../plugins/functionHooks/toolCallHooks.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { safeCallback } from "./proactivityControl.js";

//@ chunk-tyg7f3ek.js:83041-84169 placement
function describeUnsentServedCalls(
  { supersededToolNames, servedCallsNeverSent },
  isKnown,
  restarted = false,
) {
  let neverSent = servedCallsNeverSent ?? [];
  let neverSentIds = new Set(neverSent.map((call) => call.toolUseID));
  let fullyUnanswered = new Set(
    neverSent
      .filter(
        ({ assistantMessage }) =>
          !Array.isArray(assistantMessage.message.content) ||
          assistantMessage.message.content.every(
            (block) => block.type !== "tool_use" || neverSentIds.has(block.id),
          ),
      )
      .map((call) => call.toolUseID),
  );
  let reduced = [...(supersededToolNames ?? new Map())]
    .filter(([toolName]) => isKnown(toolName) && !fullyUnanswered.has(toolName))
    .reduce((acc, [, name]) => {
      let label = restarted && !isUnicodeIdentifier(name) ? "another tool" : name;
      return acc.set(label, (acc.get(label) ?? 0) + 1);
    }, new Map());
  let mapped = [...reduced].map(([name, count]) => (count === 1 ? name : `${name} \xD7${count}`));
  let reduced_2 = [...reduced.values()].reduce((acc, count) => acc + count, 0);
  if (reduced_2 === 0) return;
  return `${restarted ? `Besides the tool calls answered above, your previous turn had also issued ${reduced_2 === 1 ? "a call that is no longer shown above and that has" : "calls that are no longer shown above and that have"} no result` : `This session restarted during your previous turn. Besides the tool calls answered above, that turn had also issued ${reduced_2 === 1 ? "a call whose result was" : "calls whose results were"} lost to the restart`}: ${mapped.join(", ")} \u2014 ${reduced_2 === 1 ? "it" : "they"} may not have run, or not completely. Check before issuing ${reduced_2 === 1 ? "it" : "them"} again, and decide whether ${reduced_2 === 1 ? "it is" : "they are"} still needed.`;
}
//@ chunk-tyg7f3ek.js:84169-84520 placement
function ccrLostCallsNote(names, holders, handled) {
  let unhandledCallIds = new Set(
    holders
      .map((holder) =>
        Array.isArray(holder.message.content)
          ? holder.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
          : [],
      )
      .filter((ids) => !ids.some((id) => handled.has(id)))
      .flat(),
  );
  let note = describeUnsentServedCalls(names, (id) => unhandledCallIds.has(id), true);
  return note !== undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_lightning", false)
    ? () => {
        logFeatureOk("ccr_lost_calls_note");
        return createAttachmentMessage({
          type: "critical_system_reminder",
          content: note,
        });
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:84520-84833 placement
var UNANSWERED_PERMISSION_DENIAL =
  "Nobody answered this permission request; the person may be away, so other requests for approval are likely to go unanswered too. Until the person writes again, do not retry the call and do not make other calls that may need approval. Finish what needs no approval, then say what you needed approval for.";
//@ chunk-tyg7f3ek.js:84833-85119 placement
function staleCanUseToolRequests(io, mainTranscript, isKnownPending = () => false) {
  try {
    let pendingPermissionRequests = io.getPendingPermissionRequests();
    let toolUseIds = ({ request }) => (request.subtype === "can_use_tool" ? [request.tool_use_id] : []);
    let unresolvedToolUsesInTranscript = findUnresolvedToolUsesInTranscript(
      mainTranscript(),
      pendingPermissionRequests.flatMap(toolUseIds),
    );
    return pendingPermissionRequests.filter(
      (request) =>
        !toolUseIds(request).some((id) => unresolvedToolUsesInTranscript.has(id)) ||
        (request.request.subtype === "can_use_tool" && isKnownPending(request.request.tool_name)),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:85119-85301 placement
function denyPermissionRequests(io, requests, message = UNANSWERED_PERMISSION_DENIAL) {
  return count(requests, ({ request_id: requestId }) =>
    io.injectControlResponse({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: {
          behavior: "deny",
          message,
        },
      },
    }),
  );
}
//@ chunk-tyg7f3ek.js:85301-85453 placement
var PERMISSION_WITHDRAWN_MESSAGE =
  "Permission request withdrawn unanswered: the person pressed Stop, or the session is ending. Do not ask again.";
var PERMISSION_ANSWER_BACKOFF = {
  first: 100,
  most: 2000,
};
var PENDING_PERMISSION_ANSWER_GRACE_MS = 5000;
//@ chunk-tyg7f3ek.js:85453-86501 placement
/**
 * 轮次结束时等待未答复的 can_use_tool 请求（宽限期），超时则代为拒绝。
 */
async function awaitPendingPermissionAnswers(
  readInput,
  { loopInput, io, urgencyOf, onLate, graceMs = PENDING_PERMISSION_ANSWER_GRACE_MS },
) {
  let seenRequestIds = new Set(io.getPendingPermissionRequests().map((request) => request.request_id));
  let newRequests = () =>
    io
      .getPendingPermissionRequests()
      .filter(
        ({ request_id: requestId, request }) =>
          !seenRequestIds.has(requestId) &&
          request.subtype === "can_use_tool" &&
          TOOLU_PLUGIN(request.tool_use_id),
      );
  let sawEnd = false;
  let declineNew = () => {
    if (!sawEnd || isTerminalShutdown()) return;
    let declinedCount = denyPermissionRequests(io, newRequests(), PERMISSION_WITHDRAWN_MESSAGE);
    if (declinedCount > 0)
      logForDiagnosticsNoPII("info", "cli_receive_hook_cards_declined", {
        declined: declinedCount,
      });
  };
  let retryTimer;
  let first = PERMISSION_ANSWER_BACKOFF.first;
  let unsubscribe = io.onRequestPending(
    safeCallback(() => {
      if (sawEnd && retryTimer === undefined && newRequests().length > 0) {
        retryTimer = setTimeout(
          safeCallback(() => {
            retryTimer = undefined;
            declineNew();
          }),
          first,
        );
        first = Math.min(first * 2, PERMISSION_ANSWER_BACKOFF.most);
      }
    }),
  );
  let giveUp = () => {};
  let promise = new Promise((resolve) => {
    giveUp = () => resolve("given-up");
  });
  let endTimer;
  let observeUrgency = (urgency) => {
    if (isTerminalShutdown()) return;
    if (urgency === "end")
      endTimer ??= setTimeout(() => {
        if (!isTerminalShutdown()) giveUp();
      }, graceMs);
    sawEnd = true;
    declineNew();
  };
  let stopWatching = () => {
    unsubscribe();
    clearTimeout(retryTimer);
  };
  let givenUp = false;
  let readPromise;
  try {
    let result = await loopInput.readWhile(
      () => {
        readPromise = readInput();
        return Promise.race([
          readPromise.then((received) => ({
            received,
          })),
          promise,
        ]);
      },
      {
        onSetAside: safeCallback((item) => {
          let urgency = urgencyOf(item);
          if (urgency !== undefined) observeUrgency(urgency);
        }),
        onEnded: safeCallback(() => observeUrgency("end")),
      },
    );
    if (result === "given-up") {
      logForDiagnosticsNoPII("warn", "cli_receive_hooks_given_up");
      givenUp = true;
      readPromise?.then(safeCallback(onLate), () => {}).finally(stopWatching);
    }
    return result;
  } finally {
    clearTimeout(endTimer);
    if (!givenUp) stopWatching();
  }
}
export {
  ccrLostCallsNote,
  awaitPendingPermissionAnswers,
  PENDING_PERMISSION_ANSWER_GRACE_MS,
  staleCanUseToolRequests,
  denyPermissionRequests,
  describeUnsentServedCalls,
};
