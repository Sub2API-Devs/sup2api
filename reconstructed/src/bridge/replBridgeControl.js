/**
 * bridge/replBridgeControl.ts
 *
 * 2.1.316 新增。REPL 侧 Remote Control 控制请求处理（设置模型、权限模式、中断等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 16
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
import { deriveTitleFromHumanTurn } from "./bridgeMessaging.js";
import { prepareApiRequest } from "../utils/teleport/api.js";
import { snapshotGitEvidenceForBridge } from "../utils/git.js";
import { noopAsync, noop as noop_8, noopTwoArgs } from "./remoteBridgeSettle.js";
import { createCodeSession, isCreateSessionFailure, isCredentialsRejection } from "./codeSessionApi.js";
import { getBridgeBaseUrl } from "./bridgeConfig.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { getMcpConfigByName } from "../services/mcp/config.js";

//@ chunk-18hwfzwa.js:1566504-1566521 placement
function noopHandler(h) {}
//@ chunk-18hwfzwa.js:1566521-1566548 placement
/**
 * REPL 侧桥接控制上下文的占位：恒返回 null（本构建不提供对话框）。
 */
function noBridgeControlContext() {
  return null;
}
//@ chunk-18hwfzwa.js:1566548-1566581 placement
/**
 * 同上但为 async 版本，恒返回 null。
 */
async function noBridgeControlContextAsync() {
  return null;
}
//@ chunk-18hwfzwa.js:1566581-1566655 placement
/**
 * REPL 侧拒绝弹对话框：返回 {token: Symbol, handle: null}，表示不在本地开对话框。
 */
function refusedBridgeDialogToken(h) {
  return {
    token: Symbol("remote-control dialog"),
    handle: null,
  };
}
//@ chunk-18hwfzwa.js:1566655-1566674 placement
/**
 * 空的桥接对话框回调占位（两参数，无操作）。
 */
function noopBridgeDialogCallback(h, x) {}
//@ chunk-18hwfzwa.js:1566674-1566763 placement
/**
 * 返回固定的拒绝分享结果：{outcome: {is:'refused', why:'threw'}, line: 说明文字}。
 */
async function refusedShareOutcome(h, x) {
  let D = {
    is: "refused",
    why: "threw",
  };
  return {
    outcome: D,
    line: describeShareOutcome(h, D),
  };
}
//@ chunk-18hwfzwa.js:1566763-1567204 placement
/**
 * 按分享结果（is/why）返回说明文字；当前构建中该分支被常量 false 关掉，总是返回空串。
 */
function describeShareOutcome(h, x) {
  if (false)
    switch (x.is) {
      case "shared":
      case "already_shared":
      case "refused":
        switch (x.why) {
          case "no_connection":
          case "dialog_closed":
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
//@ chunk-18hwfzwa.js:1567204-1567384 placement
/**
 * 撤回由桥接（Remote Control）送进队列的某条消息：正在折叠中则失败；否则按 uuid 移除桥接来源的条目，或撤回尚未入列的入站消息，成功返回 true。
 */
function withdrawBridgeInboundMessage(queue, uuid) {
  if (queue.isFoldInFlight(uuid)) return false;
  return (
    queue.removeByFilter((L) => L.uuid === uuid && L.bridgeOrigin === true, {
      reason: "cancelled_by_sender",
    }).length > 0 || queue.withdrawInboundIngest(uuid)
  );
}
//@ chunk-18hwfzwa.js:1567384-1567811 placement
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
//@ chunk-18hwfzwa.js:1567811-1568175 placement
/**
 * 包装请求处理函数：同一 requestId 的并发请求共享同一个 Promise，已完成的结果按 requestId 缓存（最多 FORK_RESULT_CACHE_MAX 条，先进先出淘汰）。
 */
function dedupeByRequestId(handler) {
  let x = new Map();
  let D = new Map();
  return (L, ee) => {
    let ke = D.get(ee.requestId);
    if (ke) return Promise.resolve(ke);
    let Re = x.get(ee.requestId);
    if (Re) return Re;
    let Be = handler(L, ee)
      .then((He) => {
        D.set(ee.requestId, He);
        if (D.size > FORK_RESULT_CACHE_MAX) {
          let We = D.keys().next().value;
          if (We !== undefined) D.delete(We);
        }
        return He;
      })
      .finally(() => {
        x.delete(ee.requestId);
      });
    x.set(ee.requestId, Be);
    return Be;
  };
}
//@ chunk-18hwfzwa.js:1568175-1571993 placement
/**
 * 处理 Remote Control 发来的会话分叉请求（rc fork conversation）。
 */
async function handleRcForkConversation(h, x, D) {
  let L = false;
  let ee = (Ro, Ho = "") => {
    if (L) return;
    L = true;
    if (Ro === "ok") logFeatureOk("rc_repl_fork_conversation");
    else if (Ro === "sad") logFeatureSad("rc_repl_fork_conversation", Ho);
    else logFeatureBad("rc_repl_fork_conversation", Ho);
  };
  let ke = (Ro, Ho = FORK_REFUSAL_REASONS[Ro]) => {
    if (Ro !== "unsupported") ee("sad", Ho);
    return {
      forked: false,
      error: Ro,
      reason: FORK_REFUSAL_REASONS[Ro],
    };
  };
  let Re = (Ro) => {
    ee("bad", Ro);
    return FORK_FAILED_RESULT;
  };
  let targetMessageUuid = h.target_message_uuid;
  if (targetMessageUuid !== undefined && typeof targetMessageUuid !== "string")
    throw new WireSafeControlError("fork_conversation: target_message_uuid must be a string");
  let title = h.title;
  if (title !== undefined && typeof title !== "string")
    throw new WireSafeControlError("fork_conversation: title must be a string");
  let reference = D.ownBridgeSessionId();
  if (!isFirstPartyProvider() || isEssentialTrafficOnly() || reference === undefined)
    return ke("unsupported");
  if (
    !isAgentsFleetEnabled() ||
    isSafeMode() ||
    isBareMode() ||
    getForkRestrictedLaunchConfig() ||
    isCoordinatorMode_2()
  )
    return FORK_UNSUPPORTED_RESULT;
  if (D.queuedCommandCount() > 0) return ke("commands queued");
  if (D.isTurnActive()) return ke("turn running");
  if (x.promptPending) return ke("prompt pending");
  if (isTranscriptPersistenceDisabled()) return ke("history suppressed", "persistence_disabled");
  let sliced = D.getMessages().slice();
  let messages;
  let rt;
  let kt;
  if (targetMessageUuid !== undefined) {
    let rewindTarget = findRewindTarget(sliced, targetMessageUuid);
    if (!rewindTarget) return ke("target not found");
    if (hasCronToolUse(sliced, rewindTarget.index)) return ke("target splits a tool call");
    messages = sliced.slice(0, rewindTarget.index);
    rt = rewindTarget.uuid;
    kt = rewindTarget.prefillText ?? undefined;
  } else messages = sliced;
  let resumeAtLeaf = lastResumableMessage(messages)?.uuid ?? null;
  let sessionId = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return ke("history suppressed");
  let title_2 = deriveForkTitle(title, messages);
  let createSession = D.createSession ?? createForkCodeSession;
  let Dt =
    D.uploadHistory ??
    ((Ro, Ho, Io) =>
      uploadForkDisplayHistory(Ro, Ho, Io, "rc_repl_fork_conversation", D.host, D.getTools?.()));
  let archiveSession = D.archiveSession ?? archiveAbandonedForkSession;
  let notifyFailure = D.notifyFailure ?? postForkFailureNotice;
  let Xt = D.loadBackground ?? (() => import("./chunk-7c7hjd56.js"));
  let io = null;
  let so = false;
  let po = "none";
  let ao = () => po;
  let co = (id) => ({
    forked: true,
    sessionId: inSessionIdCostumeOf(reference, id),
    ...(rt !== undefined && {
      targetMessageUuid: rt,
    }),
    ...(kt !== undefined && {
      prefillText: kt,
    }),
  });
  let bo = (Ro, Ho) => {
    so = true;
    let Io = io;
    if (Io !== null && po === "forked") {
      notifyFailure(Io, D.credentials).then(() => archiveSession(Io, D.credentials));
      return Re(Ho);
    }
    if (Io !== null) archiveSession(Io, D.credentials);
    return Ro();
  };
  let Bo = await withDeadline(
    (async () => {
      try {
        let Ro = await checkForkHistorySuppressed(sessionId, D.storageV5);
        if (ao() === "failed") return FORK_FAILED_RESULT;
        if (Ro !== null) return ke("history suppressed", Ro);
        let session = await createSession({
          title: title_2,
          tags: [REMOTE_CONTROL_FORK, `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(reference)}`],
          sessionGroupingId: D.ownSessionGroupingId(),
          credentials: D.credentials,
        });
        if (session === null) return Re("session_create_failed");
        let sessionId_2 = session.sessionId;
        if (ao() === "failed") {
          archiveSession(sessionId_2, D.credentials);
          return FORK_FAILED_RESULT;
        }
        io = sessionId_2;
        let Wo = await checkForkHistorySuppressed(sessionId, D.storageV5);
        if (Wo !== null) return bo(() => ke("history suppressed", Wo), "history_suppressed_after_answer");
        let mn = await Dt(sessionId_2, messages, D.credentials);
        if (mn !== null) return bo(() => Re(mn), `${mn}_after_answer`);
        let { spawnBackgroundFork, deriveBackgroundSeed } = await Xt();
        let messages_2 = D.getMessages();
        if (
          targetMessageUuid !== undefined &&
          findRewindTarget(messages_2.slice(0, sliced.length), targetMessageUuid) === null
        )
          return bo(() => ke("target not found"), "target_not_found_after_answer");
        if (messages.some((bn, Go) => messages_2[Go]?.uuid !== bn.uuid))
          return bo(() => Re("conversation_changed"), "conversation_changed_after_answer");
        let launchState = D.getLaunchState();
        let kn = deriveBackgroundSeed(messages, "", "(forked)") ?? {
          intent: "(forked)",
          name: getCurrentSessionDisplayTitle(sessionId),
        };
        let backgroundFork = await spawnBackgroundFork(
          kn,
          null,
          launchState.sessionEffort,
          getPermissionModeCycle(launchState),
          launchState.toolPermissionContext.additionalWorkingDirectories,
          launchState.toolPermissionContext.alwaysAllowRules,
          launchState.toolPermissionContext.alwaysDenyRules,
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
            proactivityLevel: promptProactivityLevel(launchState),
            storageV5: D.storageV5,
            credentials: D.credentials,
            extraEnv: buildBridgeReattachEnv(sessionId_2, undefined, false, session.sessionGroupingId),
          },
        );
        if (!backgroundFork.ok)
          return bo(
            () =>
              backgroundFork.reason === "fork_point_missing"
                ? ke("target not found")
                : Re(backgroundFork.reason ?? "spawn_failed"),
            "spawn_failed_after_answer",
          );
        await D.recordChildBridgeSession(backgroundFork.short, sessionId_2, session.sessionGroupingId).catch(
          (error) =>
            logForDebugging(
              `[rc-fork] Could not record the fork's session in job ${backgroundFork.short}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            ),
        );
        ee("ok");
        return co(sessionId_2);
      } catch (error) {
        logForDebugging(`[rc-fork] fork_conversation failed: ${errorMessage(error)}`, {
          level: "error",
        });
        return bo(() => Re("exception"), "exception_after_answer");
      }
    })(),
    FORK_ANSWER_DEADLINE_MS,
    D.armAnswerDeadline,
  );
  if (Bo !== undefined) return Bo;
  if (io !== null && !so) {
    po = "forked";
    return co(io);
  }
  po = "failed";
  return Re("deadline");
}
//@ chunk-18hwfzwa.js:1571993-1572260 placement
/**
 * 生成分叉会话标题：优先用请求给的标题；其次当前会话标题加 " (fork)"；再次从人类消息推导（截到 FORK_TITLE_MAX_LENGTH）；都没有则 "Forked session"。
 */
function deriveForkTitle(requestedTitle, messages) {
  let D = (Re) => sanitizeSessionTitle(Re).replace(/\s+/g, " ").trim();
  let L = requestedTitle !== undefined ? D(requestedTitle) : "";
  if (L) return L;
  let currentSessionDisplayTitle = getCurrentSessionDisplayTitle(getSessionId());
  let ke = currentSessionDisplayTitle ? D(`${currentSessionDisplayTitle} (fork)`) : "";
  if (ke) return ke;
  for (let message of messages) {
    let titleFromHumanTurn = deriveTitleFromHumanTurn(message);
    let He =
      titleFromHumanTurn === undefined
        ? ""
        : truncateToLength(D(titleFromHumanTurn), FORK_TITLE_MAX_LENGTH).trim();
    if (He) return He;
  }
  return "Forked session";
}
//@ chunk-18hwfzwa.js:1572260-1572396 placement
async function checkForkHistorySuppressed(sessionId, transcriptPath) {
  let historySuppressionFromDisk = await readHistorySuppressionFromDisk(transcriptPath);
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return "history_suppressed";
  return historySuppressionFromDisk !== "clean" ? "history_suppressed_on_disk" : null;
}
//@ chunk-18hwfzwa.js:1572396-1572980 placement
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
  if (repoSource && typeof result === "string") noop_8("fork");
  if (repoSource && typeof result !== "string" && !isCredentialsRejection(result))
    noopTwoArgs("fork", result);
  return typeof result === "string"
    ? {
        sessionId: result,
        sessionGroupingId: groupingId,
      }
    : null;
}
//@ chunk-18hwfzwa.js:1572980-1573075 placement
var READ_ONLY_CONTROL_COMMAND_NAMES = new Set([
  "get_usage",
  "mcp_status",
  "get_context_usage",
  "stop_task",
  "background_tasks",
]);
//@ chunk-18hwfzwa.js:1573075-1573966 placement
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
    isKnownMcpServer: (He) =>
      engineStore.getState().mcp.clients.some((client) => client.name === He) ||
      getMcpConfigByName(He) !== null,
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
};
