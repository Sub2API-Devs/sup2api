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
import { Xwr } from "../../utils/sanitization.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { findUnresolvedToolUsesInTranscript } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { UJn } from "../../plugins/functionHooks/toolCallHooks.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { safeCallback } from "./proactivityControl.js";

//@ chunk-tyg7f3ek.js:83041-84169 placement
function describeUnsentServedCalls(
  { supersededToolNames: supersededToolNames, servedCallsNeverSent: servedCallsNeverSent },
  r,
  s = !1,
) {
  let h = servedCallsNeverSent ?? [],
    y = new Set(h.map((q) => q.toolUseID)),
    S = new Set(
      h
        .filter(
          ({ assistantMessage: assistantMessage }) =>
            !Array.isArray(assistantMessage.message.content) ||
            assistantMessage.message.content.every((x) => x.type !== "tool_use" || y.has(x.id)),
        )
        .map((q) => q.toolUseID),
    ),
    reduced = [...(supersededToolNames ?? new Map())]
      .filter(([q]) => r(q) && !S.has(q))
      .reduce((q, [, x]) => {
        let G = s && !Xwr(x) ? "another tool" : x;
        return q.set(G, (q.get(G) ?? 0) + 1);
      }, new Map()),
    mapped = [...reduced].map(([q, x]) => (x === 1 ? q : `${q} \xD7${x}`)),
    reduced_2 = [...reduced.values()].reduce((q, x) => q + x, 0);
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
    ),
    h = describeUnsentServedCalls(e, (y) => s.has(y), !0);
  return h !== void 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_lightning", !1)
    ? () => (
        logFeatureOk("ccr_lost_calls_note"),
        createAttachmentMessage({ type: "critical_system_reminder", content: h })
      )
    : void 0;
}
//@ chunk-tyg7f3ek.js:84520-84833 placement
var UNANSWERED_PERMISSION_DENIAL =
  "Nobody answered this permission request; the person may be away, so other requests for approval are likely to go unanswered too. Until the person writes again, do not retry the call and do not make other calls that may need approval. Finish what needs no approval, then say what you needed approval for.";
//@ chunk-tyg7f3ek.js:84833-85119 placement
function staleCanUseToolRequests(e, n, r = () => !1) {
  try {
    let pendingPermissionRequests = e.getPendingPermissionRequests(),
      h = ({ request: request }) => (request.subtype === "can_use_tool" ? [request.tool_use_id] : []),
      y = findUnresolvedToolUsesInTranscript(n(), pendingPermissionRequests.flatMap(h));
    return pendingPermissionRequests.filter(
      (S) => !h(S).some((R) => y.has(R)) || (S.request.subtype === "can_use_tool" && r(S.request.tool_name)),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:85119-85301 placement
function denyPermissionRequests(e, n, r = UNANSWERED_PERMISSION_DENIAL) {
  return count(n, ({ request_id: request_id }) =>
    e.injectControlResponse({
      type: "control_response",
      response: { subtype: "success", request_id: request_id, response: { behavior: "deny", message: r } },
    }),
  );
}
//@ chunk-tyg7f3ek.js:85301-85453 placement
var PERMISSION_WITHDRAWN_MESSAGE =
    "Permission request withdrawn unanswered: the person pressed Stop, or the session is ending. Do not ask again.",
  bT = { first: 100, most: 2000 },
  Qh = 5000;
/**
 * 轮次结束时等待未答复的 can_use_tool 请求（宽限期），超时则代为拒绝。
 */
//@ chunk-tyg7f3ek.js:85453-86501 placement
async function awaitPendingPermissionAnswers(
  e,
  { loopInput: loopInput, io: io, urgencyOf: urgencyOf, onLate: onLate, graceMs: graceMs = Qh },
) {
  let S = new Set(io.getPendingPermissionRequests().map((ie) => ie.request_id)),
    R = () =>
      io
        .getPendingPermissionRequests()
        .filter(
          ({ request_id: request_id, request: request }) =>
            !S.has(request_id) && request.subtype === "can_use_tool" && UJn(request.tool_use_id),
        ),
    w = !1,
    P = () => {
      if (!w || isTerminalShutdown()) return;
      let ie = denyPermissionRequests(io, R(), PERMISSION_WITHDRAWN_MESSAGE);
      if (ie > 0) logForDiagnosticsNoPII("info", "cli_receive_hook_cards_declined", { declined: ie });
    },
    L,
    first = bT.first,
    onRequestPending = io.onRequestPending(
      safeCallback(() => {
        if (w && L === void 0 && R().length > 0)
          ((L = setTimeout(
            safeCallback(() => {
              ((L = void 0), P());
            }),
            first,
          )),
            (first = Math.min(first * 2, bT.most)));
      }),
    ),
    G = () => {},
    promise = new Promise((ie) => {
      G = () => ie("given-up");
    }),
    re,
    Ae = (ie) => {
      if (isTerminalShutdown()) return;
      if (ie === "end")
        re ??= setTimeout(() => {
          if (!isTerminalShutdown()) G();
        }, graceMs);
      ((w = !0), P());
    },
    Ue = () => {
      (onRequestPending(), clearTimeout(L));
    },
    ce = !1,
    nt;
  try {
    let ie = await loopInput.readWhile(
      () => ((nt = e()), Promise.race([nt.then((Se) => ({ received: Se })), promise])),
      {
        onSetAside: safeCallback((Se) => {
          let me = urgencyOf(Se);
          if (me !== void 0) Ae(me);
        }),
        onEnded: safeCallback(() => Ae("end")),
      },
    );
    if (ie === "given-up")
      (logForDiagnosticsNoPII("warn", "cli_receive_hooks_given_up"),
        (ce = !0),
        nt?.then(safeCallback(onLate), () => {}).finally(Ue));
    return ie;
  } finally {
    if ((clearTimeout(re), !ce)) Ue();
  }
}

export {
  ccrLostCallsNote,
  awaitPendingPermissionAnswers,
  Qh,
  staleCanUseToolRequests,
  denyPermissionRequests,
  describeUnsentServedCalls,
};
