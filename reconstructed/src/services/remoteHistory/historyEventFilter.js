/**
 * services/remoteHistory/historyEventFilter.ts
 *
 * 2.1.316 新增：远程会话历史事件过滤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pmgfyvx7.js (15)
 * attribution: placement 15
 */
import { parseSequenceNum, xmo, eCs, Xkr } from "../../remote/RemoteSessionManager.js";
import { capFrameDepth, isSubagentToolRequest } from "../../remote/wireFrameShape.js";
import {
  isModelRefusalFallback,
  sessionMetadataArtifacts,
  dropRemoteRateLimitFrame,
  applyRemoteTaskEvent,
  mergeSessionCapabilities,
} from "../../remote/remoteSessionEvents.js";
import {
  parseGoalState,
  parseAutocompactState,
  parseInitFrame,
  convertSDKMessage,
} from "../../remote/sdkMessageAdapter.js";
import { trackThinClientFrame, qkr, FORWARDED_MESSAGE_TYPES } from "../homeSeed/firstSend.js";
import { pgr } from "../../utils/telemetry/memorySummary.js";
import { Kkr, getForegroundBashToolUseIds, getToolResultIds } from "../../remote/backgroundTaskEvents.js";
import { PREFETCH_STATE, G } from "./historyPrefetch.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { markRemoteSourced } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { isDeviceIdentityEnabledCached } from "../analytics/violinGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { Ir, u, T, kt, o } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  SDKControlCancelRequestMessageSchema,
  parseControlRequest,
} from "../../entrypoints/sdk/controlSchemas.js";
import { clone } from "../../utils/slowOperations.js";
import { hasToolResultContent } from "../../remote/controlRequestShape.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createSystemMessage } from "../../utils/messages.js";
import { getRemoteSessionUrl } from "../../constants/product.js";

//@ chunk-pmgfyvx7.js:16650-17009 placement
function parseHistoryLine(e) {
  let r;
  try {
    r = JSON.parse(e);
  } catch {
    return null;
  }
  if (r === null || typeof r !== "object") return null;
  let i = Array.isArray(r.data) ? r.data : [],
    m = [];
  for (let l = i.length - 1; l >= 0; l--) {
    let n = i[l];
    if (n?.payload)
      m.push({
        payload: n.payload,
        createdAt: n.created_at,
        source: n.source,
        sequenceNum: parseSequenceNum(n),
      });
  }
  let s = r.next_cursor ?? null;
  return { events: m, firstId: s, hasMore: s !== null };
}
/**
 * 过滤远程会话历史事件：去掉控制帧与重复、配对工具结果、识别初始化帧。
 */
//@ chunk-pmgfyvx7.js:17009-19143 placement
function filterHistoryEvents(e) {
  let r = indexControlEvents(e.events),
    i = indexToolEvents(e.events),
    m = void 0,
    s = void 0,
    l = [],
    n = 0,
    h = new Set(),
    S = new Map(),
    w = !1,
    y = new Set(),
    R,
    _,
    b,
    E,
    P,
    K,
    O,
    U = [],
    q = { running: new Map(), awaitingFinish: new Set(), foreground: new Set() },
    W = new Map();
  for (let c of r) {
    if (c.sequenceNum !== void 0 && c.sequenceNum > n) n = c.sequenceNum;
    try {
      if (!capFrameDepth(c.payload)) continue;
      if (c.source === "worker") {
        let M = isModelRefusalFallback(c.payload);
        if (M) for (let uuid of M.uuids) h.add(uuid);
        if (c.payload.type === "active_goal") {
          R = parseGoalState(c.payload.value);
          continue;
        }
        if (c.payload.type === "autocompact_state") {
          _ = parseAutocompactState(c.payload.value);
          continue;
        }
        let D = sessionMetadataArtifacts(c.payload);
        if (D !== void 0) {
          b = D;
          continue;
        }
        if (c.payload.type === "rate_limit_event") {
          let A = dropRemoteRateLimitFrame(c.payload.rate_limit_info);
          if (A !== void 0) U.push(A);
          continue;
        }
        trackThinClientFrame(q, c.payload);
        let parse = Date.parse(c.createdAt ?? "");
        if (
          (applyRemoteTaskEvent(W, c.payload, parse > 0 ? Math.min(parse, Date.now()) : Date.now()),
          (E = pgr(c.payload) ?? E),
          c.payload.type === "system" && c.payload.subtype === "init")
        )
          ((P = mergeSessionCapabilities(P, parseInitFrame(c.payload))),
            (K = qkr(c.payload)),
            (O = Kkr(c.payload)));
        if (O === !0)
          (getForegroundBashToolUseIds(c.payload).forEach((A) => q.foreground.add(A)),
            getToolResultIds(c.payload).forEach((A) => q.foreground.delete(A)));
      }
      if (!isDisplayableHistoryEvent(c, !1)) continue;
      if (isConversationResetEvent(c)) {
        ((l = []), h.clear(), S.clear(), (w = !1), y.clear());
        continue;
      }
      if (PREFETCH_STATE !== null) {
        if (!w) w = isInitForCurrentSession(c.payload);
        collectReplyChannelToolUseIds(c.payload, y);
      }
      let v = null;
      if (v !== null) {
        let uuid = c.payload.uuid;
        if (typeof uuid === "string")
          S.set(
            uuid,
            v.map((D) => D.uuid),
          );
        l.push(...v);
        continue;
      }
      let C = convertSDKMessage(c.payload, { convertUserTextMessages: !0 });
      if (C.type === "message") {
        let message = C.message;
        l.push(message);
      }
    } catch (error) {
      logForDebugging(
        `[historyPrefetch] Skipping ${c.payload.type} frame seq=${c.sequenceNum ?? "?"} \u2014 conversion threw: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
  }
  if (h.size > 0) {
    let c = new Set(h);
    for (let v of h) for (let C of S.get(v) ?? []) c.add(C);
    l = l.filter((v) => !c.has(v.uuid));
  }
  return {
    messages: markRemoteSourced(l),
    maxSequenceNum: n,
    complete: !e.hasMore,
    nestedUuidAliases: [...S.entries()].filter(([, c]) => c.length > 1),
    hasReplyChannel: w,
    replyChannelToolUseIds: [...y],
    lastActiveGoal: R,
    lastAutocompactState: _,
    lastSessionArtifacts: b,
    lastWorkerPermissionMode: E,
    lastWorkerInventory: P,
    lastWorkerSendsNow: K,
    lastWorkerMovesBash: O,
    rateLimitInfos: U,
    backgroundTasks: {
      running: [...q.running.values()],
      awaitingFinish: [...q.awaitingFinish],
      foreground: [...q.foreground],
    },
    workflowRuns: [...W.values()],
    ...i,
  };
}
//@ chunk-pmgfyvx7.js:19143-20129 placement
function indexControlEvents(e) {
  let r = new Map();
  for (let m = 0; m < e.length; m++) {
    let s = e[m],
      payload = s.payload;
    if (payload.type === "control_response") {
      let response = payload.response;
      if (
        typeof response === "object" &&
        response !== null &&
        "request_id" in response &&
        typeof response.request_id === "string"
      ) {
        let h = r.get(response.request_id);
        if (!(
          xmo(response, h?.toolName) ||
          (h?.subtype === "request_user_dialog" &&
            "subtype" in response &&
            response.subtype === "error" &&
            isDeviceIdentityEnabledCached())
        ))
          r.delete(response.request_id);
      }
    } else if (
      s.source === "worker" &&
      payload.type === "control_cancel_request" &&
      typeof payload.request_id === "string"
    )
      r.delete(payload.request_id);
    else if ((payload.type === "result" && s.source === "worker") || isConversationResetEvent(s)) r.clear();
    else if (
      s.source === "worker" &&
      payload.type === "control_request" &&
      s.sequenceNum !== void 0 &&
      typeof payload.request_id === "string"
    ) {
      let request = payload.request;
      if (
        typeof request === "object" &&
        request !== null &&
        "subtype" in request &&
        typeof request.subtype === "string" &&
        eCs.includes(request.subtype) &&
        readWorkerPermissionRequest(s) === void 0
      )
        r.set(payload.request_id, {
          at: m,
          subtype: request.subtype,
          toolName: "tool_name" in request ? request.tool_name : void 0,
        });
    }
  }
  if (r.size === 0) return e;
  let i = e.length;
  for (let { at: at } of r.values()) i = Math.min(i, at);
  return e.slice(0, i);
}
//@ chunk-pmgfyvx7.js:20129-20224 placement
var Se = DoctorLazy(() =>
  Ir("type", [
    SDKControlCancelRequestMessageSchema(),
    u({ type: T("control_response"), response: kt({ request_id: o() }) }),
  ]),
);
//@ chunk-pmgfyvx7.js:20224-20873 placement
function indexToolEvents(e) {
  let r = new Map(),
    i = new Set(),
    m = new Set();
  for (let s of e) {
    let l = readWorkerPermissionRequest(s);
    if (l !== void 0) {
      if (!r.has(l.request_id) && !i.has(l.request_id)) r.set(l.request_id, l);
      continue;
    }
    if (s.source === "worker" && s.payload.type === "result") {
      for (let { request: request } of r.values()) m.add(String(request.agent_id));
      continue;
    }
    let n = Se().safeParse(s.payload).data;
    if (n === void 0) continue;
    let h =
        n.type === "control_cancel_request"
          ? s.source === "worker"
          : !xmo(n.response, r.get(n.response.request_id)?.request.tool_name),
      S = n.type === "control_cancel_request" ? n.request_id : n.response.request_id;
    if (h && r.delete(S)) i.add(S);
  }
  return { openSubagentRequests: [...r.values()].slice(-Xkr), askersPastATurn: [...m] };
}
//@ chunk-pmgfyvx7.js:20873-21055 placement
function readWorkerPermissionRequest(e) {
  let payload = e.payload;
  if (e.source !== "worker" || payload.type !== "control_request") return;
  let i = parseControlRequest(payload, "can_use_tool");
  if (i === null || !isSubagentToolRequest(i.request)) return;
  try {
    return clone(i);
  } catch {
    return;
  }
}
//@ chunk-pmgfyvx7.js:21055-21224 placement
function collectReplyChannelToolUseIds(e, r) {
  let i = PREFETCH_STATE;
  if (i === null || e.type !== "assistant") return;
  for (let m of e.message.content)
    if (m.type === "tool_use" && i.replyChannelBlockKind(m) !== void 0) r.add(m.id);
}
//@ chunk-pmgfyvx7.js:21224-21511 placement
function isInitForCurrentSession(e) {
  let r = PREFETCH_STATE;
  if (r === null) return !1;
  if (e.type === "system" && e.subtype === "init") {
    let i = parseInitFrame(e);
    return r.hasReplyChannelInit({ mcp_servers: i.mcpServers, tools: i.tools });
  }
  return (
    e.type === "assistant" &&
    !e.parent_tool_use_id &&
    e.message.content.some((i) => r.replyChannelBlockKind(i) !== void 0)
  );
}
//@ chunk-pmgfyvx7.js:21511-21686 placement
function isConversationResetEvent(e) {
  if (e.payload.type !== "conversation_reset" || (e.source !== void 0 && e.source !== "worker")) return !1;
  let new_conversation_id = e.payload.new_conversation_id;
  return typeof new_conversation_id === "string" && new_conversation_id !== "";
}
//@ chunk-pmgfyvx7.js:21686-21717 placement
function hasBackgroundEvents(e) {
  return e.some(isConversationResetEvent);
}
//@ chunk-pmgfyvx7.js:21717-21866 placement
function isWorkerBackgroundEvent(e) {
  return (
    e.source === "worker" &&
    e.payload.type === "system" &&
    e.payload.subtype === "background_tasks_changed" &&
    Array.isArray(e.payload.tasks)
  );
}
//@ chunk-pmgfyvx7.js:21866-22071 placement
function isDisplayableHistoryEvent(e, r) {
  if (e.source === void 0 || e.source === "worker") return !0;
  if (e.payload.type === "user")
    return (
      !hasToolResultContent(e.payload) || (r && G !== null && G.isProjectPersonEvent(e.payload, e.source))
    );
  return FORWARDED_MESSAGE_TYPES.has(e.payload.type);
}
//@ chunk-pmgfyvx7.js:22071-22385 placement
function logPrefetchResult(e) {
  if (e === null) logFeatureSad("remote_history_prefetch", "miss");
  else if (e.maxSequenceNum === 0) logFeatureSad("remote_history_prefetch", "no_seq");
  else if (!e.complete && e.messages.length === 0) logFeatureSad("remote_history_prefetch", "empty_partial");
  else if (!e.complete) logFeatureSad("remote_history_prefetch", "incomplete");
  else logFeatureOk("remote_history_prefetch");
}
//@ chunk-pmgfyvx7.js:22385-22505 placement
function nonEmptyHistoryPage(e) {
  if (e === null || e.maxSequenceNum === 0) return null;
  if (!e.complete && e.messages.length === 0) return null;
  return e;
}
//@ chunk-pmgfyvx7.js:22505-22622 placement
function recentMessagesNotice(e) {
  return createSystemMessage(
    `Showing recent messages \xB7 full history at ${getRemoteSessionUrl(e, void 0, { from: "cli", m: "0" })}`,
    "notice",
  );
}

export { parseHistoryLine, filterHistoryEvents, hasBackgroundEvents, isWorkerBackgroundEvent };
