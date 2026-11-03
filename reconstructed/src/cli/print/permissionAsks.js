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
function describeUnsentServedCalls({ supersededToolNames, servedCallsNeverSent }, r, s = false) {
  let h = servedCallsNeverSent ?? [];
  let y = new Set(h.map((q) => q.toolUseID));
  let S = new Set(
    h
      .filter(
        ({ assistantMessage }) =>
          !Array.isArray(assistantMessage.message.content) ||
          assistantMessage.message.content.every((x) => x.type !== "tool_use" || y.has(x.id)),
      )
      .map((q) => q.toolUseID),
  );
  let reduced = [...(supersededToolNames ?? new Map())]
    .filter(([q]) => r(q) && !S.has(q))
    .reduce((acc, [, x]) => {
      let G = s && !isUnicodeIdentifier(x) ? "another tool" : x;
      return acc.set(G, (acc.get(G) ?? 0) + 1);
    }, new Map());
  let mapped = [...reduced].map(([q, x]) => (x === 1 ? q : `${q} \xD7${x}`));
  let reduced_2 = [...reduced.values()].reduce((acc, x) => acc + x, 0);
  if (reduced_2 === 0) return;
  return `${s ? `Besides the tool calls answered above, your previous turn had also issued ${reduced_2 === 1 ? "a call that is no longer shown above and that has" : "calls that are no longer shown above and that have"} no result` : `This session restarted during your previous turn. Besides the tool calls answered above, that turn had also issued ${reduced_2 === 1 ? "a call whose result was" : "calls whose results were"} lost to the restart`}: ${mapped.join(", ")} \u2014 ${reduced_2 === 1 ? "it" : "they"} may not have run, or not completely. Check before issuing ${reduced_2 === 1 ? "it" : "them"} again, and decide whether ${reduced_2 === 1 ? "it is" : "they are"} still needed.`;
}
//@ chunk-tyg7f3ek.js:84169-84520 placement
function ccrLostCallsNote(e, n, r) {
  let s = new Set(
    n
      .map((y) =>
        Array.isArray(y.message.content)
          ? y.message.content.flatMap((S) => (S.type === "tool_use" ? [S.id] : []))
          : [],
      )
      .filter((y) => !y.some((S) => r.has(S)))
      .flat(),
  );
  let h = describeUnsentServedCalls(e, (y) => s.has(y), true);
  return h !== undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_lightning", false)
    ? () => {
        logFeatureOk("ccr_lost_calls_note");
        return createAttachmentMessage({
          type: "critical_system_reminder",
          content: h,
        });
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:84520-84833 placement
var UNANSWERED_PERMISSION_DENIAL =
  "Nobody answered this permission request; the person may be away, so other requests for approval are likely to go unanswered too. Until the person writes again, do not retry the call and do not make other calls that may need approval. Finish what needs no approval, then say what you needed approval for.";
//@ chunk-tyg7f3ek.js:84833-85119 placement
function staleCanUseToolRequests(e, mainTranscript, r = () => false) {
  try {
    let pendingPermissionRequests = e.getPendingPermissionRequests();
    let h = ({ request }) => (request.subtype === "can_use_tool" ? [request.tool_use_id] : []);
    let unresolvedToolUsesInTranscript = findUnresolvedToolUsesInTranscript(
      mainTranscript(),
      pendingPermissionRequests.flatMap(h),
    );
    return pendingPermissionRequests.filter(
      (S) =>
        !h(S).some((R) => unresolvedToolUsesInTranscript.has(R)) ||
        (S.request.subtype === "can_use_tool" && r(S.request.tool_name)),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:85119-85301 placement
function denyPermissionRequests(e, n, message = UNANSWERED_PERMISSION_DENIAL) {
  return count(n, ({ request_id: requestId }) =>
    e.injectControlResponse({
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
  e,
  { loopInput, io, urgencyOf, onLate, graceMs = PENDING_PERMISSION_ANSWER_GRACE_MS },
) {
  let S = new Set(io.getPendingPermissionRequests().map((ie) => ie.request_id));
  let R = () =>
    io
      .getPendingPermissionRequests()
      .filter(
        ({ request_id: requestId, request }) =>
          !S.has(requestId) && request.subtype === "can_use_tool" && TOOLU_PLUGIN(request.tool_use_id),
      );
  let w = false;
  let P = () => {
    if (!w || isTerminalShutdown()) return;
    let ie = denyPermissionRequests(io, R(), PERMISSION_WITHDRAWN_MESSAGE);
    if (ie > 0)
      logForDiagnosticsNoPII("info", "cli_receive_hook_cards_declined", {
        declined: ie,
      });
  };
  let L;
  let first = PERMISSION_ANSWER_BACKOFF.first;
  let x = io.onRequestPending(
    safeCallback(() => {
      if (w && L === undefined && R().length > 0) {
        L = setTimeout(
          safeCallback(() => {
            L = undefined;
            P();
          }),
          first,
        );
        first = Math.min(first * 2, PERMISSION_ANSWER_BACKOFF.most);
      }
    }),
  );
  let G = () => {};
  let promise = new Promise((resolve) => {
    G = () => resolve("given-up");
  });
  let re;
  let Ae = (ie) => {
    if (isTerminalShutdown()) return;
    if (ie === "end")
      re ??= setTimeout(() => {
        if (!isTerminalShutdown()) G();
      }, graceMs);
    w = true;
    P();
  };
  let Ue = () => {
    x();
    clearTimeout(L);
  };
  let ce = false;
  let nt;
  try {
    let ie = await loopInput.readWhile(
      () => {
        nt = e();
        return Promise.race([
          nt.then((received) => ({
            received,
          })),
          promise,
        ]);
      },
      {
        onSetAside: safeCallback((Se) => {
          let me = urgencyOf(Se);
          if (me !== undefined) Ae(me);
        }),
        onEnded: safeCallback(() => Ae("end")),
      },
    );
    if (ie === "given-up") {
      logForDiagnosticsNoPII("warn", "cli_receive_hooks_given_up");
      ce = true;
      nt?.then(safeCallback(onLate), () => {}).finally(Ue);
    }
    return ie;
  } finally {
    clearTimeout(re);
    if (!ce) Ue();
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
