/**
 * services/remoteHistory/historyEventFilter.ts
 *
 * 2.1.316 新增：远程会话历史事件过滤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bwxq9hmx.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  objectSchema,
  literal,
  looseObject,
  stringSchema,
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

//@ chunk-bwxq9hmx.js:17826-18185 placement
function parseHistoryLine(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  let rawEvents = Array.isArray(parsed.data) ? parsed.data : [];
  let events = [];
  for (let idx = rawEvents.length - 1; idx >= 0; idx--) {
    let rawEvent = rawEvents[idx];
    if (rawEvent?.payload)
      events.push({
        payload: rawEvent.payload,
        createdAt: rawEvent.created_at,
        source: rawEvent.source,
        sequenceNum: parseSequenceNum(rawEvent),
      });
  }
  let nextCursor = parsed.next_cursor ?? null;
  return {
    events,
    firstId: nextCursor,
    hasMore: nextCursor !== null,
  };
}
//@ chunk-bwxq9hmx.js:18185-20319 placement
/**
 * 过滤远程会话历史事件：去掉控制帧与重复、配对工具结果、识别初始化帧。
 */
function filterHistoryEvents(historyLine) {
  let controlEvents = indexControlEvents(historyLine.events);
  let toolEvents = indexToolEvents(historyLine.events);
  let lastUuid = undefined;
  let lastConversationId = undefined;
  let messages = [];
  let maxSequenceNum = 0;
  let refusals = new Set();
  let nestedUuidAliases = new Map();
  let hasReplyChannel = false;
  let replyChannelToolUseIds = new Set();
  let lastActiveGoal;
  let lastAutocompactState;
  let lastSessionArtifacts;
  let lastWorkerPermissionMode;
  let lastWorkerInventory;
  let lastWorkerSendsNow;
  let lastWorkerMovesBash;
  let rateLimitInfos = [];
  let backgroundTasks = {
    running: new Map(),
    awaitingFinish: new Set(),
    foreground: new Set(),
  };
  let workflowRuns = new Map();
  for (let event of controlEvents) {
    if (event.sequenceNum !== undefined && event.sequenceNum > maxSequenceNum)
      maxSequenceNum = event.sequenceNum;
    try {
      if (!capFrameDepth(event.payload)) continue;
      if (event.source === "worker") {
        let refusal = isModelRefusalFallback(event.payload);
        if (refusal) for (let uuid of refusal.uuids) refusals.add(uuid);
        if (event.payload.type === "active_goal") {
          lastActiveGoal = parseGoalState(event.payload.value);
          continue;
        }
        if (event.payload.type === "autocompact_state") {
          lastAutocompactState = parseAutocompactState(event.payload.value);
          continue;
        }
        let artifacts = sessionMetadataArtifacts(event.payload);
        if (artifacts !== undefined) {
          lastSessionArtifacts = artifacts;
          continue;
        }
        if (event.payload.type === "rate_limit_event") {
          let info = dropRemoteRateLimitFrame(event.payload.rate_limit_info);
          if (info !== undefined) rateLimitInfos.push(info);
          continue;
        }
        trackThinClientFrame(backgroundTasks, event.payload);
        let timestamp = Date.parse(event.createdAt ?? "");
        applyRemoteTaskEvent(
          workflowRuns,
          event.payload,
          timestamp > 0 ? Math.min(timestamp, Date.now()) : Date.now(),
        );
        lastWorkerPermissionMode = permissionModeOfSystemEvent(event.payload) ?? lastWorkerPermissionMode;
        if (event.payload.type === "system" && event.payload.subtype === "init") {
          lastWorkerInventory = mergeSessionCapabilities(lastWorkerInventory, parseInitFrame(event.payload));
          lastWorkerSendsNow = supportsSendNow(event.payload);
          lastWorkerMovesBash = supportsBackgroundTasksMovesBash(event.payload);
        }
        if (lastWorkerMovesBash === true) {
          getForegroundBashToolUseIds(event.payload).forEach((toolUseId) =>
            backgroundTasks.foreground.add(toolUseId),
          );
          getToolResultIds(event.payload).forEach((toolUseId) =>
            backgroundTasks.foreground.delete(toolUseId),
          );
        }
      }
      if (!isDisplayableHistoryEvent(event, false)) continue;
      if (isConversationResetEvent(event)) {
        messages = [];
        refusals.clear();
        nestedUuidAliases.clear();
        hasReplyChannel = false;
        replyChannelToolUseIds.clear();
        continue;
      }
      if (PREFETCH_STATE !== null) {
        if (!hasReplyChannel) hasReplyChannel = isInitForCurrentSession(event.payload);
        collectReplyChannelToolUseIds(event.payload, replyChannelToolUseIds);
      }
      let nested = null;
      if (nested !== null) {
        let uuid = event.payload.uuid;
        if (typeof uuid === "string")
          nestedUuidAliases.set(
            uuid,
            nested.map((item) => item.uuid),
          );
        messages.push(...nested);
        continue;
      }
      let converted = convertSDKMessage(event.payload, {
        convertUserTextMessages: true,
      });
      if (converted.type === "message") {
        let message = converted.message;
        messages.push(message);
      }
    } catch (error) {
      logForDebugging(
        `[historyPrefetch] Skipping ${event.payload.type} frame seq=${event.sequenceNum ?? "?"} \u2014 conversion threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  if (refusals.size > 0) {
    let refusalSet = new Set(refusals);
    for (let uuid of refusals)
      for (let aliasUuid of nestedUuidAliases.get(uuid) ?? []) refusalSet.add(aliasUuid);
    messages = messages.filter((message) => !refusalSet.has(message.uuid));
  }
  return {
    messages: markRemoteSourced(messages),
    maxSequenceNum,
    complete: !historyLine.hasMore,
    nestedUuidAliases: [...nestedUuidAliases.entries()].filter(([, aliases]) => aliases.length > 1),
    hasReplyChannel,
    replyChannelToolUseIds: [...replyChannelToolUseIds],
    lastActiveGoal,
    lastAutocompactState,
    lastSessionArtifacts,
    lastWorkerPermissionMode,
    lastWorkerInventory,
    lastWorkerSendsNow,
    lastWorkerMovesBash,
    rateLimitInfos,
    backgroundTasks: {
      running: [...backgroundTasks.running.values()],
      awaitingFinish: [...backgroundTasks.awaitingFinish],
      foreground: [...backgroundTasks.foreground],
    },
    workflowRuns: [...workflowRuns.values()],
    ...toolEvents,
  };
}
//@ chunk-bwxq9hmx.js:20319-21305 placement
function indexControlEvents(events) {
  let pending = new Map();
  for (let idx = 0; idx < events.length; idx++) {
    let event = events[idx];
    let payload = event.payload;
    if (payload.type === "control_response") {
      let response = payload.response;
      if (
        typeof response === "object" &&
        response !== null &&
        "request_id" in response &&
        typeof response.request_id === "string"
      ) {
        let existing = pending.get(response.request_id);
        if (!(
          isToolNameDifferent(response, existing?.toolName) ||
          (existing?.subtype === "request_user_dialog" &&
            "subtype" in response &&
            response.subtype === "error" &&
            isDeviceIdentityEnabledCached())
        ))
          pending.delete(response.request_id);
      }
    } else if (
      event.source === "worker" &&
      payload.type === "control_cancel_request" &&
      typeof payload.request_id === "string"
    )
      pending.delete(payload.request_id);
    else if ((payload.type === "result" && event.source === "worker") || isConversationResetEvent(event))
      pending.clear();
    else if (
      event.source === "worker" &&
      payload.type === "control_request" &&
      event.sequenceNum !== undefined &&
      typeof payload.request_id === "string"
    ) {
      let request = payload.request;
      if (
        typeof request === "object" &&
        request !== null &&
        "subtype" in request &&
        typeof request.subtype === "string" &&
        DIALOG_REQUEST_SUBTYPES.includes(request.subtype) &&
        readWorkerPermissionRequest(event) === undefined
      )
        pending.set(payload.request_id, {
          at: idx,
          subtype: request.subtype,
          toolName: "tool_name" in request ? request.tool_name : undefined,
        });
    }
  }
  if (pending.size === 0) return events;
  let cutIndex = events.length;
  for (let { at } of pending.values()) cutIndex = Math.min(cutIndex, at);
  return events.slice(0, cutIndex);
}
//@ chunk-bwxq9hmx.js:21305-21400 placement
var historyControlMessageSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    SDKControlCancelRequestMessageSchema(),
    objectSchema({
      type: literal("control_response"),
      response: looseObject({
        request_id: stringSchema(),
      }),
    }),
  ]),
);
//@ chunk-bwxq9hmx.js:21400-22049 placement
function indexToolEvents(events) {
  let openRequests = new Map();
  let answeredIds = new Set();
  let askersPastATurn = new Set();
  for (let event of events) {
    let workerPermissionRequest = readWorkerPermissionRequest(event);
    if (workerPermissionRequest !== undefined) {
      if (
        !openRequests.has(workerPermissionRequest.request_id) &&
        !answeredIds.has(workerPermissionRequest.request_id)
      )
        openRequests.set(workerPermissionRequest.request_id, workerPermissionRequest);
      continue;
    }
    if (event.source === "worker" && event.payload.type === "result") {
      for (let { request } of openRequests.values()) askersPastATurn.add(String(request.agent_id));
      continue;
    }
    let control = historyControlMessageSchema().safeParse(event.payload).data;
    if (control === undefined) continue;
    let resolved =
      control.type === "control_cancel_request"
        ? event.source === "worker"
        : !isToolNameDifferent(
            control.response,
            openRequests.get(control.response.request_id)?.request.tool_name,
          );
    let requestId =
      control.type === "control_cancel_request" ? control.request_id : control.response.request_id;
    if (resolved && openRequests.delete(requestId)) answeredIds.add(requestId);
  }
  return {
    openSubagentRequests: [...openRequests.values()].slice(-MAX_CACHED_PERMISSION_REQUESTS),
    askersPastATurn: [...askersPastATurn],
  };
}
//@ chunk-bwxq9hmx.js:22049-22231 placement
function readWorkerPermissionRequest(event) {
  let payload = event.payload;
  if (event.source !== "worker" || payload.type !== "control_request") return;
  let controlRequest = parseControlRequest(payload, "can_use_tool");
  if (controlRequest === null || !isSubagentToolRequest(controlRequest.request)) return;
  try {
    return clone(controlRequest);
  } catch {
    return;
  }
}
//@ chunk-bwxq9hmx.js:22231-22400 placement
function collectReplyChannelToolUseIds(payload, ids) {
  let prefetchState = PREFETCH_STATE;
  if (prefetchState === null || payload.type !== "assistant") return;
  for (let block of payload.message.content)
    if (block.type === "tool_use" && prefetchState.replyChannelBlockKind(block) !== undefined)
      ids.add(block.id);
}
//@ chunk-bwxq9hmx.js:22400-22687 placement
function isInitForCurrentSession(frame) {
  let prefetchState = PREFETCH_STATE;
  if (prefetchState === null) return false;
  if (frame.type === "system" && frame.subtype === "init") {
    let initFrame = parseInitFrame(frame);
    return prefetchState.hasReplyChannelInit({
      mcp_servers: initFrame.mcpServers,
      tools: initFrame.tools,
    });
  }
  return (
    frame.type === "assistant" &&
    !frame.parent_tool_use_id &&
    frame.message.content.some((block) => prefetchState.replyChannelBlockKind(block) !== undefined)
  );
}
//@ chunk-bwxq9hmx.js:22687-22862 placement
function isConversationResetEvent(event) {
  if (
    event.payload.type !== "conversation_reset" ||
    (event.source !== undefined && event.source !== "worker")
  )
    return false;
  let newConversationId = event.payload.new_conversation_id;
  return typeof newConversationId === "string" && newConversationId !== "";
}
//@ chunk-bwxq9hmx.js:22862-22893 placement
function hasBackgroundEvents(events) {
  return events.some(isConversationResetEvent);
}
//@ chunk-bwxq9hmx.js:22893-23042 placement
function isWorkerBackgroundEvent(event) {
  return (
    event.source === "worker" &&
    event.payload.type === "system" &&
    event.payload.subtype === "background_tasks_changed" &&
    Array.isArray(event.payload.tasks)
  );
}
//@ chunk-bwxq9hmx.js:23042-23247 placement
function isDisplayableHistoryEvent(event, checkProjectPerson) {
  if (event.source === undefined || event.source === "worker") return true;
  if (event.payload.type === "user")
    return (
      !hasToolResultContent(event.payload) ||
      (checkProjectPerson &&
        projectPersonEventFilter !== null &&
        projectPersonEventFilter.isProjectPersonEvent(event.payload, event.source))
    );
  return FORWARDED_MESSAGE_TYPES.has(event.payload.type);
}
//@ chunk-bwxq9hmx.js:23247-23561 placement
function logPrefetchResult(result) {
  if (result === null) logFeatureSad("remote_history_prefetch", "miss");
  else if (result.maxSequenceNum === 0) logFeatureSad("remote_history_prefetch", "no_seq");
  else if (!result.complete && result.messages.length === 0)
    logFeatureSad("remote_history_prefetch", "empty_partial");
  else if (!result.complete) logFeatureSad("remote_history_prefetch", "incomplete");
  else logFeatureOk("remote_history_prefetch");
}
//@ chunk-bwxq9hmx.js:23561-23681 placement
function nonEmptyHistoryPage(result) {
  if (result === null || result.maxSequenceNum === 0) return null;
  if (!result.complete && result.messages.length === 0) return null;
  return result;
}
//@ chunk-bwxq9hmx.js:23681-23798 placement
function recentMessagesNotice(session) {
  return createSystemMessage(
    `Showing recent messages \xB7 full history at ${getRemoteSessionUrl(session, undefined, {
      from: "cli",
      m: "0",
    })}`,
    "notice",
  );
}
export {
  parseHistoryLine,
  filterHistoryEvents,
  hasBackgroundEvents,
  isWorkerBackgroundEvent,
  nonEmptyHistoryPage,
  recentMessagesNotice,
  logPrefetchResult,
};
