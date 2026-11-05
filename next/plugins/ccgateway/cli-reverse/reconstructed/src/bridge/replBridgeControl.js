/**
 * bridge/replBridgeControl.ts
 *
 * 2.1.316 新增。REPL 侧 Remote Control 控制请求处理（设置模型、权限模式、中断等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (17), chunk-vr5v4gzz.js (1)
 * attribution: placement 16, layout 2
 */
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { WireSafeControlError, errorMessage } from "../utils/errors.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isAgentsFleetEnabled } from "../utils/fleetGates.js";
import { isSafeMode, isBareMode } from "../utils/envUtils.js";
import { getForkRestrictedLaunchConfig, getSessionId, getOriginalCwd } from "../bootstrap/state.js";
import { isCoordinatorMode_2 } from "../coordinator/coordinatorMode.js";
import {
  isTranscriptPersistenceDisabled,
  isRemoteEgressSuppressedFor,
  pinSessionId,
  getCurrentSessionDisplayTitle,
  readHistorySuppressionFromDisk,
} from "../utils/sessionStorage.js";
import { findRewindTarget } from "../cli/print/rewindStandIn.js";
import { hasCronToolUse } from "../cli/print/rateLimitForwarding.js";
import { lastResumableMessage } from "../utils/processRelaunch.js";
import {
  uploadForkDisplayHistory,
  archiveAbandonedForkSession,
  postForkFailureNotice,
} from "./forkHistoryUpload.js";
import { inSessionIdCostumeOf, toCompatSessionId } from "./sessionIdCompat.js";
import { withDeadline } from "../utils/sleep.js";
import { REMOTE_CONTROL_FORK, REMOTE_CONTROL_FORK_PARENT } from "./sessionOrigins.js";
import { getPermissionModeCycle } from "../utils/permissions/permissions.js";
import { promptProactivityLevel } from "../utils/proactivityLevel.js";
import { buildBridgeReattachEnv } from "../services/daemon/jobState.js";
import { logForDebugging } from "../utils/debug.js";
import { sanitizeSessionTitle, truncateToLength } from "../utils/stringUtils.js";
import { forkTitleFor } from "../utils/messages/ultrathinkPaste.js";
import { deriveTitleFromHumanTurn } from "./bridgeMessaging.js";
import { prepareApiRequest } from "../utils/teleport/api.js";
import { snapshotGitEvidenceForBridge } from "../utils/git.js";
import { noopAsync, noop as noop_7, noopTwoArgs } from "./remoteBridgeSettle.js";
import { createCodeSession, isCreateSessionFailure, isCredentialsRejection } from "./codeSessionApi.js";
import { getBridgeBaseUrl } from "./bridgeConfig.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { getMcpConfigByName } from "../services/mcp/config.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vr5v4gzz.js:15386-15413 placement
/**
 * REPL 侧桥接控制上下文的占位：恒返回 null（本构建不提供对话框）。
 */
function noBridgeControlContext() {
  return null;
}
//@ chunk-czq1j3j2.js:1610405-1610422 placement
function noopHandler(unused) {}
//@ chunk-czq1j3j2.js:1610422-1610455 placement
/**
 * 同上但为 async 版本，恒返回 null。
 */
async function noBridgeControlContextAsync() {
  return null;
}
//@ chunk-czq1j3j2.js:1610455-1610488 layout
async function createControlStub() {
  return null;
}
//@ chunk-czq1j3j2.js:1610488-1610562 placement
/**
 * REPL 侧拒绝弹对话框：返回 {token: Symbol, handle: null}，表示不在本地开对话框。
 */
function refusedBridgeDialogToken(unused) {
  return {
    token: Symbol("remote-control dialog"),
    handle: null,
  };
}
//@ chunk-czq1j3j2.js:1610562-1610581 placement
/**
 * 空的桥接对话框回调占位（两参数，无操作）。
 */
function noopBridgeDialogCallback(unused, unusedOther) {}
//@ chunk-czq1j3j2.js:1610581-1610652 layout
function refusedShare(share, ctx) {
  return refusedShareOutcome(share, ctx.handle, {
    kind: "dialog",
    token: ctx.token,
  });
}
//@ chunk-czq1j3j2.js:1610652-1610750 placement
/**
 * 返回固定的拒绝分享结果：{outcome: {is:'refused', why:'threw'}, line: 说明文字}。
 */
async function refusedShareOutcome(share, unused, opts) {
  let outcome = {
    is: "refused",
    why: "threw",
  };
  return {
    outcome,
    line: describeShareOutcome(share, outcome, opts.kind),
  };
}
//@ chunk-czq1j3j2.js:1610750-1611218 placement
/**
 * 按分享结果（is/why）返回说明文字；当前构建中该分支被常量 false 关掉，总是返回空串。
 */
function describeShareOutcome(share, outcome, kind) {
  if (false)
    switch (outcome.is) {
      case "shared":
      case "already_shared":
      case "refused":
        switch (outcome.why) {
          case "no_connection":
          case "dialog_closed":
          case "question_withdrawn":
          case "not_listed":
          case "not_connected":
          case "could_not_check":
          case "nothing_listens":
          case "never_shared":
          case "owner_changed":
          case "session_refuses":
          case "connection_refuses":
          case "sign_in_unconfirmed":
          case "sign_in_unreadable":
          case "sign_in_changed":
          case "no_sign_in_check":
          case "threw":
          default:
        }
      default:
    }
  return "";
}
//@ chunk-czq1j3j2.js:1611218-1611398 placement
/**
 * 撤回由桥接（Remote Control）送进队列的某条消息：正在折叠中则失败；否则按 uuid 移除桥接来源的条目，或撤回尚未入列的入站消息，成功返回 true。
 */
function withdrawBridgeInboundMessage(queue, uuid) {
  if (queue.isFoldInFlight(uuid)) return false;
  return (
    queue.removeByFilter((message) => message.uuid === uuid && message.bridgeOrigin === true, {
      reason: "cancelled_by_sender",
    }).length > 0 || queue.withdrawInboundIngest(uuid)
  );
}
//@ chunk-czq1j3j2.js:1611398-1611825 placement
/**
 * 远程控制分叉会话的常量：答复截止时间、上限、拒绝原因映射与失败结果。
 */
var FORK_ANSWER_DEADLINE_MS = 8000;
var FORK_TITLE_MAX_LENGTH = 50;
var FORK_RESULT_CACHE_MAX = 16;
var FORK_REFUSAL_REASONS = {
  unsupported: "unsupported",
  "turn running": "turn_running",
  "commands queued": "commands_queued",
  "prompt pending": "prompt_pending",
  "target not found": "target_not_found",
  "target splits a tool call": "target_splits_tool_call",
  "history suppressed": "history_suppressed",
};
var FORK_UNSUPPORTED_RESULT = {
  forked: false,
  error: "unsupported",
  reason: "background_sessions_unavailable",
};
var FORK_FAILED_RESULT = {
  forked: false,
  error: "fork failed",
  reason: "fork_failed",
};
//@ chunk-czq1j3j2.js:1611825-1612189 placement
/**
 * 包装请求处理函数：同一 requestId 的并发请求共享同一个 Promise，已完成的结果按 requestId 缓存（最多 FORK_RESULT_CACHE_MAX 条，先进先出淘汰）。
 */
function dedupeByRequestId(handler) {
  let inFlight = new Map();
  let settled = new Map();
  return (session, request) => {
    let cached = settled.get(request.requestId);
    if (cached) return Promise.resolve(cached);
    let pending = inFlight.get(request.requestId);
    if (pending) return pending;
    let promise = handler(session, request)
      .then((result) => {
        settled.set(request.requestId, result);
        if (settled.size > FORK_RESULT_CACHE_MAX) {
          let oldestId = settled.keys().next().value;
          if (oldestId !== undefined) settled.delete(oldestId);
        }
        return result;
      })
      .finally(() => {
        inFlight.delete(request.requestId);
      });
    inFlight.set(request.requestId, promise);
    return promise;
  };
}
//@ chunk-czq1j3j2.js:1612189-1616008 placement
/**
 * 处理 Remote Control 发来的会话分叉请求（rc fork conversation）。
 */
async function handleRcForkConversation(request, state, host) {
  let logged = false;
  let logOnce = (leg, code = "") => {
    if (logged) return;
    logged = true;
    if (leg === "ok") logFeatureOk("rc_repl_fork_conversation");
    else if (leg === "sad") logFeatureSad("rc_repl_fork_conversation", code);
    else logFeatureBad("rc_repl_fork_conversation", code);
  };
  let refuse = (errorCode, reason = FORK_REFUSAL_REASONS[errorCode]) => {
    if (errorCode !== "unsupported") logOnce("sad", reason);
    return {
      forked: false,
      error: errorCode,
      reason: FORK_REFUSAL_REASONS[errorCode],
    };
  };
  let fail = (reason) => {
    logOnce("bad", reason);
    return FORK_FAILED_RESULT;
  };
  let targetMessageUuid = request.target_message_uuid;
  if (targetMessageUuid !== undefined && typeof targetMessageUuid !== "string")
    throw new WireSafeControlError("fork_conversation: target_message_uuid must be a string");
  let title = request.title;
  if (title !== undefined && typeof title !== "string")
    throw new WireSafeControlError("fork_conversation: title must be a string");
  let reference = host.ownBridgeSessionId();
  if (!isFirstPartyProvider() || isEssentialTrafficOnly() || reference === undefined)
    return refuse("unsupported");
  if (
    !isAgentsFleetEnabled() ||
    isSafeMode() ||
    isBareMode() ||
    getForkRestrictedLaunchConfig() ||
    isCoordinatorMode_2()
  )
    return FORK_UNSUPPORTED_RESULT;
  if (host.queuedCommandCount() > 0) return refuse("commands queued");
  if (host.isTurnActive()) return refuse("turn running");
  if (state.promptPending) return refuse("prompt pending");
  if (isTranscriptPersistenceDisabled()) return refuse("history suppressed", "persistence_disabled");
  let sliced = host.getMessages().slice();
  let messages;
  let targetUuid;
  let prefillText;
  if (targetMessageUuid !== undefined) {
    let rewindTarget = findRewindTarget(sliced, targetMessageUuid);
    if (!rewindTarget) return refuse("target not found");
    if (hasCronToolUse(sliced, rewindTarget.index)) return refuse("target splits a tool call");
    messages = sliced.slice(0, rewindTarget.index);
    targetUuid = rewindTarget.uuid;
    prefillText = rewindTarget.prefillText ?? undefined;
  } else messages = sliced;
  let resumeAtLeaf = lastResumableMessage(messages)?.uuid ?? null;
  let sessionId = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return refuse("history suppressed");
  let title_2 = deriveForkTitle(title, messages);
  let createSession = host.createSession ?? createForkCodeSession;
  let uploadHistory =
    host.uploadHistory ??
    ((sessionId, messages, credentials) =>
      uploadForkDisplayHistory(
        sessionId,
        messages,
        credentials,
        "rc_repl_fork_conversation",
        host.host,
        host.getTools?.(),
      ));
  let archiveSession = host.archiveSession ?? archiveAbandonedForkSession;
  let notifyFailure = host.notifyFailure ?? postForkFailureNotice;
  let loadBackground = host.loadBackground ?? (() => import("../utils/background/spawnBackgroundFork.js"));
  let childSessionId = null;
  let outcomeDecided = false;
  let outcomeState = "none";
  let getOutcomeState = () => outcomeState;
  let forkedResult = (id) => ({
    forked: true,
    sessionId: inSessionIdCostumeOf(reference, id),
    ...(targetUuid !== undefined && {
      targetMessageUuid: targetUuid,
    }),
    ...(prefillText !== undefined && {
      prefillText,
    }),
  });
  let abandonChild = (finish, reason) => {
    outcomeDecided = true;
    let child = childSessionId;
    if (child !== null && outcomeState === "forked") {
      notifyFailure(child, host.credentials).then(() => archiveSession(child, host.credentials));
      return fail(reason);
    }
    if (child !== null) archiveSession(child, host.credentials);
    return finish();
  };
  let answer = await withDeadline(
    (async () => {
      try {
        let suppression = await checkForkHistorySuppressed(sessionId, host.storageV5);
        if (getOutcomeState() === "failed") return FORK_FAILED_RESULT;
        if (suppression !== null) return refuse("history suppressed", suppression);
        let session = await createSession({
          title: title_2,
          tags: [REMOTE_CONTROL_FORK, `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(reference)}`],
          sessionGroupingId: host.ownSessionGroupingId(),
          credentials: host.credentials,
        });
        if (session === null) return fail("session_create_failed");
        let sessionId_2 = session.sessionId;
        if (getOutcomeState() === "failed") {
          archiveSession(sessionId_2, host.credentials);
          return FORK_FAILED_RESULT;
        }
        childSessionId = sessionId_2;
        let suppressionAfterAnswer = await checkForkHistorySuppressed(sessionId, host.storageV5);
        if (suppressionAfterAnswer !== null)
          return abandonChild(
            () => refuse("history suppressed", suppressionAfterAnswer),
            "history_suppressed_after_answer",
          );
        let uploadError = await uploadHistory(sessionId_2, messages, host.credentials);
        if (uploadError !== null) return abandonChild(() => fail(uploadError), `${uploadError}_after_answer`);
        let { spawnBackgroundFork, deriveBackgroundSeed } = await loadBackground();
        let messages_2 = host.getMessages();
        if (
          targetMessageUuid !== undefined &&
          findRewindTarget(messages_2.slice(0, sliced.length), targetMessageUuid) === null
        )
          return abandonChild(() => refuse("target not found"), "target_not_found_after_answer");
        if (messages.some((message, index) => messages_2[index]?.uuid !== message.uuid))
          return abandonChild(() => fail("conversation_changed"), "conversation_changed_after_answer");
        let context = host.getLaunchState();
        let seed = deriveBackgroundSeed(messages, "", "(forked)") ?? {
          intent: "(forked)",
          name: getCurrentSessionDisplayTitle(sessionId),
        };
        let backgroundFork = await spawnBackgroundFork(
          seed,
          null,
          context.sessionEffort,
          getPermissionModeCycle(context),
          context.toolPermissionContext.additionalWorkingDirectories,
          context.toolPermissionContext.alwaysAllowRules,
          context.toolPermissionContext.alwaysDenyRules,
          "remote_fork",
          messages_2,
          {
            keepParent: true,
            resumeAtLeaf,
            taskFreeInFlight: {
              tasks: 0,
              queued: 0,
              kinds: [],
            },
            proactivityLevel: promptProactivityLevel(context),
            storageV5: host.storageV5,
            credentials: host.credentials,
            extraEnv: buildBridgeReattachEnv(sessionId_2, undefined, false, session.sessionGroupingId),
          },
        );
        if (!backgroundFork.ok)
          return abandonChild(
            () =>
              backgroundFork.reason === "fork_point_missing"
                ? refuse("target not found")
                : fail(backgroundFork.reason ?? "spawn_failed"),
            "spawn_failed_after_answer",
          );
        await host
          .recordChildBridgeSession(backgroundFork.short, sessionId_2, session.sessionGroupingId)
          .catch((error) =>
            logForDebugging(
              `[rc-fork] Could not record the fork's session in job ${backgroundFork.short}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            ),
          );
        logOnce("ok");
        return forkedResult(sessionId_2);
      } catch (error) {
        logForDebugging(`[rc-fork] fork_conversation failed: ${errorMessage(error)}`, {
          level: "error",
        });
        return abandonChild(() => fail("exception"), "exception_after_answer");
      }
    })(),
    FORK_ANSWER_DEADLINE_MS,
    host.armAnswerDeadline,
  );
  if (answer !== undefined) return answer;
  if (childSessionId !== null && !outcomeDecided) {
    outcomeState = "forked";
    return forkedResult(childSessionId);
  }
  outcomeState = "failed";
  return fail("deadline");
}
//@ chunk-czq1j3j2.js:1616008-1616256 placement
/**
 * 生成分叉会话标题：优先用请求给的标题；其次当前会话标题加 " (fork)"；再次从人类消息推导（截到 FORK_TITLE_MAX_LENGTH）；都没有则 "Forked session"。
 */
function deriveForkTitle(requestedTitle, messages) {
  let normalizeTitle = (raw) => sanitizeSessionTitle(raw).replace(/\s+/g, " ").trim();
  let requested = requestedTitle !== undefined ? normalizeTitle(requestedTitle) : "";
  if (requested) return requested;
  let fromCurrent = forkTitleFor(getCurrentSessionDisplayTitle(getSessionId()) ?? "");
  if (fromCurrent) return fromCurrent;
  for (let message of messages) {
    let raw = deriveTitleFromHumanTurn(message);
    let fromTurn =
      raw === undefined ? "" : truncateToLength(normalizeTitle(raw), FORK_TITLE_MAX_LENGTH).trim();
    if (fromTurn) return fromTurn;
  }
  return "Forked session";
}
//@ chunk-czq1j3j2.js:1616256-1616392 placement
async function checkForkHistorySuppressed(sessionId, transcriptPath) {
  let historySuppressionFromDisk = await readHistorySuppressionFromDisk(transcriptPath);
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return "history_suppressed";
  return historySuppressionFromDisk !== "clean" ? "history_suppressed_on_disk" : null;
}
//@ chunk-czq1j3j2.js:1616392-1616976 placement
/**
 * 为分叉创建远端 code session：取 OAuth 令牌和 git 证据（无仓库地址时退回另一来源），按分组 id 创建；分组被拒时不带分组重试一次。成功返回 {sessionId, sessionGroupingId}，否则 null。
 */
async function createForkCodeSession({ title, tags, sessionGroupingId, credentials }) {
  let { accessToken } = await prepareApiRequest(credentials);
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let fallbackRepoUrl = gitRepoUrl ? undefined : await noopAsync();
  let repoSource = fallbackRepoUrl
    ? {
        repositoryUrl: fallbackRepoUrl,
      }
    : undefined;
  let createSession = (groupingIdArg) =>
    createCodeSession(
      getBridgeBaseUrl(),
      accessToken,
      title,
      1e4,
      tags,
      gitRepoUrl
        ? {
            gitRepoUrl,
            branch,
            defaultBranch: defaultBranch ?? undefined,
          }
        : repoSource,
      getOriginalCwd(),
      getMainLoopModel(),
      groupingIdArg,
    );
  let groupingId = sessionGroupingId;
  let result = await createSession(groupingId);
  if (groupingId !== undefined && isCreateSessionFailure(result) && result.reason === "grouping_rejected") {
    groupingId = undefined;
    result = await createSession(undefined);
  }
  if (repoSource && typeof result === "string") noop_7("fork");
  if (repoSource && typeof result !== "string" && !isCredentialsRejection(result))
    noopTwoArgs("fork", result);
  return typeof result === "string"
    ? {
        sessionId: result,
        sessionGroupingId: groupingId,
      }
    : null;
}
//@ chunk-czq1j3j2.js:1616976-1617071 placement
var READ_ONLY_CONTROL_COMMAND_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1616976", () => {
  READ_ONLY_CONTROL_COMMAND_NAMES = new Set([
    "get_usage",
    "mcp_status",
    "get_context_usage",
    "stop_task",
    "background_tasks",
  ]);
});
//@ chunk-czq1j3j2.js:1617071-1617962 placement
function makeBridgeControlContext({
  session,
  engineStore,
  transcript,
  storageV5,
  credentials,
  thinkingBudget,
  mainLoopModel,
  getContextUsageInputs,
}) {
  return {
    session,
    redactsPersistedLane: () => true,
    engineState: engineStore.getState,
    setEngineState: engineStore.setState,
    storageV5,
    credentials,
    thinkingBudget,
    sessionTitles: null,
    mcpControlLanes: null,
    replyNow: null,
    resumeUntrackedAgent: null,
    mcpConnections: () => {
      let { clients, tools } = engineStore.getState().mcp;
      return {
        connections: clients,
        tools,
      };
    },
    isKnownMcpServer: (serverName) =>
      engineStore.getState().mcp.clients.some((client) => client.name === serverName) ||
      getMcpConfigByName(serverName) !== null,
    contextUsageInputs: () => {
      let {
        tools,
        mcpClients,
        customSystemPrompt,
        appendSystemPrompt,
        systemPromptSnapshot,
        runningTurnModelOverride,
      } = getContextUsageInputs();
      return {
        messages: transcript.getSnapshot(),
        tools,
        mcpClients,
        agentDefinitions: engineStore.getState().agentDefinitions,
        customSystemPrompt,
        appendSystemPrompt,
        systemPromptSnapshot,
        mainLoopModel: runningTurnModelOverride ?? mainLoopModel(),
      };
    },
  };
}
export {
  READ_ONLY_CONTROL_COMMAND_NAMES,
  makeBridgeControlContext,
  withdrawBridgeInboundMessage,
  dedupeByRequestId,
  handleRcForkConversation,
  noopHandler,
  noBridgeControlContext,
};
