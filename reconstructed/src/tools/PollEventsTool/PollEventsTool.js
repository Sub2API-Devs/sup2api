/**
 * tools/PollEventsTool/PollEventsTool.ts
 *
 * 2.1.316 新增。PollEvents 工具：等待 harness 事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b5fpmtr5.js (8)
 * attribution: placement 8
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, Ue, u, T, U, o, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { BCt, POLL, ehi, buildPollDescription, POLL_IDLE_DESCRIPTION, DZo } from "../PollTool/prompt.js";
import {
  vYt,
  G2,
  sCt,
  getPollEventEnvelope,
  collectDeclaredPollEvents,
  iCt,
  buildPollEventDelivery,
} from "../../utils/pollEvents.js";
import { pollEventSchema, declaredKindsPrompt, Xun } from "../../utils/pollEvents/declarations.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { MAIN, LQo } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  getPollEventIngress,
  getLastMainThreadCacheTtlMs,
  getConversationToolsUsed,
} from "../../bootstrap/state.js";
import { CACHE_TTL_5M_MS } from "../../services/api/promptCacheBreakDetection.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { V2e } from "../../services/mcp/ccrTurnId.js";
import { listUnreadableToolsUsed } from "../../utils/agentListing.js";
import { filterQueuedCommandsForThread, im, Oq } from "../../utils/messageQueueManager.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-b5fpmtr5.js:12039-12293 placement = IMAGE_MIME_TYPES (0.667)
var emptyObjectSchema = DoctorLazy(() => zodStrictObject({})),
  mediaBlockSchema = DoctorLazy(() =>
    Ue([
      u({
        type: T("image"),
        source: u({
          type: T("base64"),
          media_type: U(["image/jpeg", "image/png", "image/gif", "image/webp"]),
          data: o(),
        }),
      }),
      u({
        type: T("document"),
        source: u({ type: T("base64"), media_type: T("application/pdf"), data: o() }),
      }),
    ]),
  );
//@ chunk-b5fpmtr5.js:12293-14275 placement
var POLL_EVENTS_OUTPUT_SCHEMA = DoctorLazy(() =>
    u({
      content: o().describe(`Rendered event envelopes, or "${BCt}"`),
      eventCount: E().int().describe("Number of events delivered in this result"),
      remainingWakeCount: E()
        .int()
        .describe("Wake events still queued after this chunk; they follow in the next delivery"),
      media: A(A(mediaBlockSchema()))
        .optional()
        .describe(
          "Each delivered event's images and documents, 1:1 with the events. Absent when none has any",
        ),
      toolsUsed: A(o()).optional(),
      ...{},
      provenance: A(
        u({ authority: U(vYt), senderId: o().optional(), senderText: o().optional() }).nullable(),
      ).optional(),
      declared: A(pollEventSchema().nullable()).optional(),
    }),
  ),
  tn = buildTool({
    name: POLL,
    searchHint: "wait for and receive queued harness events",
    backgrounding: "never",
    maxResultSizeChars: 200000,
    persistenceThresholdCeiling: 200000,
    skipAggregateToolResultBudget: !0,
    get inputSchema() {
      return emptyObjectSchema();
    },
    get outputSchema() {
      return POLL_EVENTS_OUTPUT_SCHEMA();
    },
    isEnabled() {
      return G2();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    async description() {
      return "Wait for pending harness events";
    },
    async prompt() {
      let e = declaredKindsPrompt(Xun());
      return e === void 0 ? ehi : buildPollDescription(POLL_IDLE_DESCRIPTION, void 0, e);
    },
    isTransparentWrapper() {
      return !1;
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return { tool_use_id: t, type: "tool_result", content: sCt(e.content, e.media) };
    },
    stripForStorage(e) {
      return e;
    },
    renderToolUseMessage() {
      return "";
    },
    extractSearchText() {
      return "";
    },
    create(e) {
      let {
        agentId: agentId,
        messageQueue: messageQueue,
        toolState: toolState,
        taskRegistry: taskRegistry,
        unlayeredPermissions: unlayeredPermissions,
      } = e;
      return {
        async call(I, M) {
          let { signal: signal, parentMessage: parentMessage, onProgress: onProgress } = M,
            W = void 0;
          if (agentId !== void 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "Poll is available on the main thread only",
              "Poll refused for this agent",
            );
          let k = MAIN,
            P = messageQueue;
          if (!P.tryBeginPollCall(void 0))
            return (
              K("duplicate_call", 0, 0),
              { data: { content: BCt, eventCount: 0, remainingWakeCount: 0 } }
            );
          let x = !1,
            s = !1,
            z;
          try {
            let now = Date.now(),
              L = await waitForPollEvents(P, signal, void 0, {
                messages: e.messages,
                ...pollWaitOptions({
                  ingress: getPollEventIngress(),
                  permissionMode: unlayeredPermissions().mode,
                  cacheTtlMs: getLastMainThreadCacheTtlMs(),
                  ...{},
                }),
                ...!1,
                liveTasks: () => [],
                ...!1,
              }),
              { endReason: endReason, ...y } = L;
            return (K(endReason, Date.now() - now, endReason === "delivered" ? y.data.eventCount : 0), y);
          } finally {
            P.endPollCall(void 0);
          }
        },
      };
    },
  });
//@ chunk-b5fpmtr5.js:14275-14319 placement
function G(e) {
  return Math.min(e ?? CACHE_TTL_5M_MS, CACHE_TTL_5M_MS) - LQo;
}
/**
 * PollEvents 的等待参数（evals 只等自身工作、等待时长取缓存 TTL）。
 */
//@ chunk-b5fpmtr5.js:14319-14468 placement
function pollWaitOptions(e) {
  let { ingress: ingress, permissionMode: permissionMode, cacheTtlMs: cacheTtlMs } = e;
  return {
    ownWorkOnly: ingress === "evals" || !1,
    inputClosed: !1,
    waitMs: (cacheTtlMs ?? CACHE_TTL_5M_MS) - LQo,
    idleWaitMs: void 0,
  };
}
//@ chunk-b5fpmtr5.js:14468-15884 placement
async function waitForPollEvents(e, t, d, m) {
  let {
      ownWorkOnly: ownWorkOnly,
      inputClosed: inputClosed,
      liveTasks: liveTasks,
      waitMs: waitMs,
      idleWaitMs: idleWaitMs,
      agentId: agentId,
    } = m,
    j = agentId ?? MAIN,
    now = Date.now(),
    k = () =>
      (ownWorkOnly || (inputClosed && e.pollEventAdmissionsPending() === 0)) &&
      !0 &&
      liveTasks().length === 0,
    min = Math.min(waitMs, G(null));
  function x() {
    return !1;
  }
  for (;;) {
    if (t.aborted) return w("aborted");
    let { commands: commands, remainingWakeCount: remainingWakeCount } = e.drainPollEventChunk(agentId);
    if (commands.length > 0) {
      let mapped = commands.map(getPollEventEnvelope),
        i = collectDeclaredPollEvents(commands);
      (logFeatureOk("poll_event_delivery"), V2e(commands), iCt(commands));
      let r = listUnreadableToolsUsed(getConversationToolsUsed().names(), m.messages?.() ?? []);
      return {
        data: {
          content: buildPollEventDelivery(mapped, remainingWakeCount, r),
          eventCount: commands.length,
          remainingWakeCount: remainingWakeCount,
          ...(r.length > 0 && { toolsUsed: r }),
          ...(commands.some((v) => v.pollEvent?.media !== void 0) && {
            media: commands.map((v) => v.pollEvent?.media ?? []),
          }),
          provenance: commands.map((v) => v.pollEvent?.provenance ?? null),
          ...(i !== void 0 && { declared: i }),
        },
        endReason: "delivered",
      };
    }
    if (hasPendingPollWork(e, x(), agentId))
      return w(hasPendingPollWork(e, !0, agentId) ? "queued_input" : "queued_input_for_turn_end");
    if (k())
      return inputClosed && !ownWorkOnly
        ? {
            data: { content: DZo(), eventCount: 0, remainingWakeCount: 0 },
            endReason: "nothing_to_wait_for_input_closed",
          }
        : w("nothing_to_wait_for");
    let D = Date.now() - now,
      R = [],
      L = R.length > 0 ? [] : liveTasks();
    if (D >= waitMs);
    let h = R.length === 0 && L.length === 0;
    if (h && idleWaitMs !== void 0 && D >= idleWaitMs) return w("wait_limit_nothing_running");
    await new Promise((y) => {
      let i = h ? idleWaitMs : hasPendingPollWork(e, !1, agentId) ? min : waitMs,
        r = i !== void 0 ? setTimeout(_, Math.max(0, i - D)) : void 0;
      function _() {
        if (r !== void 0) clearTimeout(r);
        (subscribe(), N(), t.removeEventListener("abort", _), y());
      }
      let subscribe = e.subscribe(_),
        N = () => {};
      if ((t.addEventListener("abort", _), t.aborted || hasPendingPollWork(e, x(), agentId) || k())) _();
    });
  }
}
/**
 * 队列中是否有需要唤醒 PollEvents 的命令。
 */
//@ chunk-b5fpmtr5.js:15884-16327 placement
function hasPendingPollWork(e, t, d) {
  if (d !== void 0)
    return (
      !e.isMidTurnFoldSuspended() &&
      filterQueuedCommandsForThread(e.getCommandsByMaxPriority("next"), {
        isMainThread: !1,
        currentAgentId: d,
      }).length > 0
    );
  let isMidTurnFoldSuspended = e.isMidTurnFoldSuspended(),
    b = t && !isMidTurnFoldSuspended;
  return (
    e.peek((l) => im(l) && !(b && l.priority === "later" && l.mode !== "poll-event")) !== void 0 ||
    (isMidTurnFoldSuspended
      ? !isTerminalShutdown() && e.peek(Oq) !== void 0
      : filterQueuedCommandsForThread(e.getCommandsByMaxPriority("next"), {
          isMainThread: !0,
          currentAgentId: void 0,
        }).some((l) => l.drainOnly !== !0 && l.screeningPending !== !0))
  );
}
//@ chunk-b5fpmtr5.js:16327-16414 placement
function w(e) {
  return { data: { content: BCt, eventCount: 0, remainingWakeCount: 0 }, endReason: e };
}
//@ chunk-b5fpmtr5.js:16414-16504 placement
function K(e, t, d) {
  logEvent("tengu_poll_call_end", { reason: fromEnum(e), waitedMs: t, deliveredEventCount: d });
}
