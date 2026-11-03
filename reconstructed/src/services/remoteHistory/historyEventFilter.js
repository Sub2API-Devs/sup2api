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
import {
  parseSequenceNum,
  isToolNameDifferent,
  DIALOG_REQUEST_SUBTYPES,
  MAX_CACHED_PERMISSION_REQUESTS,
} from "../../remote/RemoteSessionManager.js";
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
import { trackThinClientFrame, supportsSendNow, FORWARDED_MESSAGE_TYPES } from "../homeSeed/firstSend.js";
import { permissionModeOfSystemEvent } from "../../utils/telemetry/memorySummary.js";
import {
  supportsBackgroundTasksMovesBash,
  getForegroundBashToolUseIds,
  getToolResultIds,
} from "../../remote/backgroundTaskEvents.js";
import { PREFETCH_STATE, projectPersonEventFilter } from "./historyPrefetch.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { markRemoteSourced } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { isDeviceIdentityEnabledCached } from "../analytics/violinGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  discriminatedUnion,
  u,
  literal,
  looseObject,
  string,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
function parseHistoryLine(body) {
  let r;
  try {
    r = JSON.parse(body);
  } catch {
    return null;
  }
  if (r === null || typeof r !== "object") return null;
  let i = Array.isArray(r.data) ? r.data : [];
  let m = [];
  for (let idx = i.length - 1; idx >= 0; idx--) {
    let n = i[idx];
    if (n?.payload)
      m.push({
        payload: n.payload,
        createdAt: n.created_at,
        source: n.source,
        sequenceNum: parseSequenceNum(n),
      });
  }
  let nextCursor = r.next_cursor ?? null;
  return {
    events: m,
    firstId: nextCursor,
    hasMore: nextCursor !== null,
  };
}
//@ chunk-pmgfyvx7.js:17009-19143 placement
/**
 * 过滤远程会话历史事件：去掉控制帧与重复、配对工具结果、识别初始化帧。
 */
function filterHistoryEvents(historyLine) {
  let r = indexControlEvents(historyLine.events);
  let i = indexToolEvents(historyLine.events);
  let m = undefined;
  let s = undefined;
  let l = [];
  let n = 0;
  let h = new Set();
  let S = new Map();
  let w = false;
  let y = new Set();
  let lastActiveGoal;
  let lastAutocompactState;
  let lastSessionArtifacts;
  let E;
  let P;
  let lastWorkerSendsNow;
  let O;
  let U = [];
  let q = {
    running: new Map(),
    awaitingFinish: new Set(),
    foreground: new Set(),
  };
  let W = new Map();
  for (let c of r) {
    if (c.sequenceNum !== undefined && c.sequenceNum > n) n = c.sequenceNum;
    try {
      if (!capFrameDepth(c.payload)) continue;
      if (c.source === "worker") {
        let M = isModelRefusalFallback(c.payload);
        if (M) for (let uuid of M.uuids) h.add(uuid);
        if (c.payload.type === "active_goal") {
          lastActiveGoal = parseGoalState(c.payload.value);
          continue;
        }
        if (c.payload.type === "autocompact_state") {
          lastAutocompactState = parseAutocompactState(c.payload.value);
          continue;
        }
        let D = sessionMetadataArtifacts(c.payload);
        if (D !== undefined) {
          lastSessionArtifacts = D;
          continue;
        }
        if (c.payload.type === "rate_limit_event") {
          let A = dropRemoteRateLimitFrame(c.payload.rate_limit_info);
          if (A !== undefined) U.push(A);
          continue;
        }
        trackThinClientFrame(q, c.payload);
        let timestamp = Date.parse(c.createdAt ?? "");
        applyRemoteTaskEvent(W, c.payload, timestamp > 0 ? Math.min(timestamp, Date.now()) : Date.now());
        E = permissionModeOfSystemEvent(c.payload) ?? E;
        if (c.payload.type === "system" && c.payload.subtype === "init") {
          P = mergeSessionCapabilities(P, parseInitFrame(c.payload));
          lastWorkerSendsNow = supportsSendNow(c.payload);
          O = supportsBackgroundTasksMovesBash(c.payload);
        }
        if (O === true) {
          getForegroundBashToolUseIds(c.payload).forEach((A) => q.foreground.add(A));
          getToolResultIds(c.payload).forEach((A) => q.foreground.delete(A));
        }
      }
      if (!isDisplayableHistoryEvent(c, false)) continue;
      if (isConversationResetEvent(c)) {
        l = [];
        h.clear();
        S.clear();
        w = false;
        y.clear();
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
      let C = convertSDKMessage(c.payload, {
        convertUserTextMessages: true,
      });
      if (C.type === "message") {
        let message = C.message;
        l.push(message);
      }
    } catch (error) {
      logForDebugging(
        `[historyPrefetch] Skipping ${c.payload.type} frame seq=${c.sequenceNum ?? "?"} \u2014 conversion threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
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
    complete: !historyLine.hasMore,
    nestedUuidAliases: [...S.entries()].filter(([, c]) => c.length > 1),
    hasReplyChannel: w,
    replyChannelToolUseIds: [...y],
    lastActiveGoal,
    lastAutocompactState,
    lastSessionArtifacts,
    lastWorkerPermissionMode: E,
    lastWorkerInventory: P,
    lastWorkerSendsNow,
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
function indexControlEvents(events) {
  let r = new Map();
  for (let idx = 0; idx < events.length; idx++) {
    let s = events[idx];
    let payload = s.payload;
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
          isToolNameDifferent(response, h?.toolName) ||
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
      s.sequenceNum !== undefined &&
      typeof payload.request_id === "string"
    ) {
      let request = payload.request;
      if (
        typeof request === "object" &&
        request !== null &&
        "subtype" in request &&
        typeof request.subtype === "string" &&
        DIALOG_REQUEST_SUBTYPES.includes(request.subtype) &&
        readWorkerPermissionRequest(s) === undefined
      )
        r.set(payload.request_id, {
          at: idx,
          subtype: request.subtype,
          toolName: "tool_name" in request ? request.tool_name : undefined,
        });
    }
  }
  if (r.size === 0) return events;
  let i = events.length;
  for (let { at } of r.values()) i = Math.min(i, at);
  return events.slice(0, i);
}
//@ chunk-pmgfyvx7.js:20129-20224 placement
var historyControlMessageSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    SDKControlCancelRequestMessageSchema(),
    u({
      type: literal("control_response"),
      response: looseObject({
        request_id: string(),
      }),
    }),
  ]),
);
//@ chunk-pmgfyvx7.js:20224-20873 placement
function indexToolEvents(events) {
  let r = new Map();
  let i = new Set();
  let m = new Set();
  for (let s of events) {
    let workerPermissionRequest = readWorkerPermissionRequest(s);
    if (workerPermissionRequest !== undefined) {
      if (!r.has(workerPermissionRequest.request_id) && !i.has(workerPermissionRequest.request_id))
        r.set(workerPermissionRequest.request_id, workerPermissionRequest);
      continue;
    }
    if (s.source === "worker" && s.payload.type === "result") {
      for (let { request } of r.values()) m.add(String(request.agent_id));
      continue;
    }
    let n = historyControlMessageSchema().safeParse(s.payload).data;
    if (n === undefined) continue;
    let h =
      n.type === "control_cancel_request"
        ? s.source === "worker"
        : !isToolNameDifferent(n.response, r.get(n.response.request_id)?.request.tool_name);
    let requestId = n.type === "control_cancel_request" ? n.request_id : n.response.request_id;
    if (h && r.delete(requestId)) i.add(requestId);
  }
  return {
    openSubagentRequests: [...r.values()].slice(-MAX_CACHED_PERMISSION_REQUESTS),
    askersPastATurn: [...m],
  };
}
//@ chunk-pmgfyvx7.js:20873-21055 placement
function readWorkerPermissionRequest(e) {
  let payload = e.payload;
  if (e.source !== "worker" || payload.type !== "control_request") return;
  let controlRequest = parseControlRequest(payload, "can_use_tool");
  if (controlRequest === null || !isSubagentToolRequest(controlRequest.request)) return;
  try {
    return clone(controlRequest);
  } catch {
    return;
  }
}
//@ chunk-pmgfyvx7.js:21055-21224 placement
function collectReplyChannelToolUseIds(payload, r) {
  let i = PREFETCH_STATE;
  if (i === null || payload.type !== "assistant") return;
  for (let m of payload.message.content)
    if (m.type === "tool_use" && i.replyChannelBlockKind(m) !== undefined) r.add(m.id);
}
//@ chunk-pmgfyvx7.js:21224-21511 placement
function isInitForCurrentSession(frame) {
  let r = PREFETCH_STATE;
  if (r === null) return false;
  if (frame.type === "system" && frame.subtype === "init") {
    let initFrame = parseInitFrame(frame);
    return r.hasReplyChannelInit({
      mcp_servers: initFrame.mcpServers,
      tools: initFrame.tools,
    });
  }
  return (
    frame.type === "assistant" &&
    !frame.parent_tool_use_id &&
    frame.message.content.some((i) => r.replyChannelBlockKind(i) !== undefined)
  );
}
//@ chunk-pmgfyvx7.js:21511-21686 placement
function isConversationResetEvent(e) {
  if (e.payload.type !== "conversation_reset" || (e.source !== undefined && e.source !== "worker"))
    return false;
  let newConversationId = e.payload.new_conversation_id;
  return typeof newConversationId === "string" && newConversationId !== "";
}
//@ chunk-pmgfyvx7.js:21686-21717 placement
function hasBackgroundEvents(events) {
  return events.some(isConversationResetEvent);
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
  if (e.source === undefined || e.source === "worker") return true;
  if (e.payload.type === "user")
    return (
      !hasToolResultContent(e.payload) ||
      (r &&
        projectPersonEventFilter !== null &&
        projectPersonEventFilter.isProjectPersonEvent(e.payload, e.source))
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
    `Showing recent messages \xB7 full history at ${getRemoteSessionUrl(e, undefined, {
      from: "cli",
      m: "0",
    })}`,
    "notice",
  );
}
export { parseHistoryLine, filterHistoryEvents, hasBackgroundEvents, isWorkerBackgroundEvent };
