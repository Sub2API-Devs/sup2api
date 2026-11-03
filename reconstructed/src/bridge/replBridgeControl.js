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
import { jye } from "../utils/proactivityLevel.js";
import { buildBridgeReattachEnv } from "../services/daemon/jobState.js";
import { logForDebugging } from "../utils/debug.js";
import { sanitizeSessionTitle, truncateToLength } from "../utils/stringUtils.js";
import { deriveTitleFromHumanTurn } from "./bridgeMessaging.js";
import { prepareApiRequest } from "../utils/teleport/api.js";
import { snapshotGitEvidenceForBridge } from "../utils/git.js";
import { hKs, y6n, _6n } from "./remoteBridgeSettle.js";
import { createCodeSession, isCreateSessionFailure, isCredentialsRejection } from "./codeSessionApi.js";
import { getBridgeBaseUrl } from "./bridgeConfig.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { getMcpConfigByName } from "../services/mcp/config.js";

//@ chunk-18hwfzwa.js:1566504-1566521 placement
function ovt(h) {}
//@ chunk-18hwfzwa.js:1566521-1566548 placement
function aAs() {
  return null;
}
//@ chunk-18hwfzwa.js:1566548-1566581 placement
async function lAs() {
  return null;
}
//@ chunk-18hwfzwa.js:1566581-1566655 placement
function dAs(h) {
  return { token: Symbol("remote-control dialog"), handle: null };
}
//@ chunk-18hwfzwa.js:1566655-1566674 placement
function cAs(h, x) {}
//@ chunk-18hwfzwa.js:1566674-1566763 placement
async function uAs(h, x) {
  let D = { is: "refused", why: "threw" };
  return { outcome: D, line: describeShareOutcome(h, D) };
}
/**
 * 按分享结果（is/why）返回说明文字；当前构建中该分支被常量 false 关掉，总是返回空串。
 */
//@ chunk-18hwfzwa.js:1566763-1567204 placement
function describeShareOutcome(h, x) {
  if (!1)
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
/**
 * 撤回由桥接（Remote Control）送进队列的某条消息：正在折叠中则失败；否则按 uuid 移除桥接来源的条目，或撤回尚未入列的入站消息，成功返回 true。
 */
//@ chunk-18hwfzwa.js:1567204-1567384 placement
function withdrawBridgeInboundMessage(queue, uuid) {
  if (queue.isFoldInFlight(uuid)) return !1;
  return (
    queue.removeByFilter((L) => L.uuid === uuid && L.bridgeOrigin === !0, { reason: "cancelled_by_sender" })
      .length > 0 || queue.withdrawInboundIngest(uuid)
  );
}
/**
 * 远程控制分叉会话的常量：答复截止时间、上限、拒绝原因映射与失败结果。
 */
//@ chunk-18hwfzwa.js:1567384-1567811 placement
var FORK_ANSWER_DEADLINE_MS = 8000,
  FORK_TITLE_MAX_LENGTH = 50,
  FORK_RESULT_CACHE_MAX = 16,
  FORK_REFUSAL_REASONS = {
    unsupported: "unsupported",
    "turn running": "turn_running",
    "commands queued": "commands_queued",
    "prompt pending": "prompt_pending",
    "target not found": "target_not_found",
    "target splits a tool call": "target_splits_tool_call",
    "history suppressed": "history_suppressed",
  },
  FORK_UNSUPPORTED_RESULT = { forked: !1, error: "unsupported", reason: "background_sessions_unavailable" },
  FORK_FAILED_RESULT = { forked: !1, error: "fork failed", reason: "fork_failed" };
/**
 * 包装请求处理函数：同一 requestId 的并发请求共享同一个 Promise，已完成的结果按 requestId 缓存（最多 FORK_RESULT_CACHE_MAX 条，先进先出淘汰）。
 */
//@ chunk-18hwfzwa.js:1567811-1568175 placement
function dedupeByRequestId(handler) {
  let x = new Map(),
    D = new Map();
  return (L, ee) => {
    let ke = D.get(ee.requestId);
    if (ke) return Promise.resolve(ke);
    let Re = x.get(ee.requestId);
    if (Re) return Re;
    let Be = handler(L, ee)
      .then((He) => {
        if ((D.set(ee.requestId, He), D.size > FORK_RESULT_CACHE_MAX)) {
          let We = D.keys().next().value;
          if (We !== void 0) D.delete(We);
        }
        return He;
      })
      .finally(() => {
        x.delete(ee.requestId);
      });
    return (x.set(ee.requestId, Be), Be);
  };
}
/**
 * 处理 Remote Control 发来的会话分叉请求（rc fork conversation）。
 */
//@ chunk-18hwfzwa.js:1568175-1571993 placement
async function handleRcForkConversation(h, x, D) {
  let L = !1,
    ee = (Ro, Ho = "") => {
      if (L) return;
      if (((L = !0), Ro === "ok")) logFeatureOk("rc_repl_fork_conversation");
      else if (Ro === "sad") logFeatureSad("rc_repl_fork_conversation", Ho);
      else logFeatureBad("rc_repl_fork_conversation", Ho);
    },
    ke = (Ro, Ho = FORK_REFUSAL_REASONS[Ro]) => {
      if (Ro !== "unsupported") ee("sad", Ho);
      return { forked: !1, error: Ro, reason: FORK_REFUSAL_REASONS[Ro] };
    },
    Re = (Ro) => (ee("bad", Ro), FORK_FAILED_RESULT),
    target_message_uuid = h.target_message_uuid;
  if (target_message_uuid !== void 0 && typeof target_message_uuid !== "string")
    throw new WireSafeControlError("fork_conversation: target_message_uuid must be a string");
  let title = h.title;
  if (title !== void 0 && typeof title !== "string")
    throw new WireSafeControlError("fork_conversation: title must be a string");
  let ownBridgeSessionId = D.ownBridgeSessionId();
  if (!isFirstPartyProvider() || isEssentialTrafficOnly() || ownBridgeSessionId === void 0)
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
  let sliced = D.getMessages().slice(),
    Xe,
    rt,
    kt;
  if (target_message_uuid !== void 0) {
    let Ro = findRewindTarget(sliced, target_message_uuid);
    if (!Ro) return ke("target not found");
    if (hasCronToolUse(sliced, Ro.index)) return ke("target splits a tool call");
    ((Xe = sliced.slice(0, Ro.index)), (rt = Ro.uuid), (kt = Ro.prefillText ?? void 0));
  } else Xe = sliced;
  let At = lastResumableMessage(Xe)?.uuid ?? null,
    It = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(It))) return ke("history suppressed");
  let Ot = deriveForkTitle(title, Xe),
    Et = D.createSession ?? createForkCodeSession,
    Dt =
      D.uploadHistory ??
      ((Ro, Ho, Io) =>
        uploadForkDisplayHistory(Ro, Ho, Io, "rc_repl_fork_conversation", D.host, D.getTools?.())),
    Lt = D.archiveSession ?? archiveAbandonedForkSession,
    oo = D.notifyFailure ?? postForkFailureNotice,
    Xt = D.loadBackground ?? (() => import("./chunk-7c7hjd56.js")),
    io = null,
    so = !1,
    po = "none",
    ao = () => po,
    co = (Ro) => ({
      forked: !0,
      sessionId: inSessionIdCostumeOf(ownBridgeSessionId, Ro),
      ...(rt !== void 0 && { targetMessageUuid: rt }),
      ...(kt !== void 0 && { prefillText: kt }),
    }),
    bo = (Ro, Ho) => {
      so = !0;
      let Io = io;
      if (Io !== null && po === "forked")
        return (oo(Io, D.credentials).then(() => Lt(Io, D.credentials)), Re(Ho));
      if (Io !== null) Lt(Io, D.credentials);
      return Ro();
    },
    Bo = await withDeadline(
      (async () => {
        try {
          let Ro = await checkForkHistorySuppressed(It, D.storageV5);
          if (ao() === "failed") return FORK_FAILED_RESULT;
          if (Ro !== null) return ke("history suppressed", Ro);
          let Ho = await Et({
            title: Ot,
            tags: [
              REMOTE_CONTROL_FORK,
              `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(ownBridgeSessionId)}`,
            ],
            sessionGroupingId: D.ownSessionGroupingId(),
            credentials: D.credentials,
          });
          if (Ho === null) return Re("session_create_failed");
          let sessionId = Ho.sessionId;
          if (ao() === "failed") return (Lt(sessionId, D.credentials), FORK_FAILED_RESULT);
          io = sessionId;
          let Wo = await checkForkHistorySuppressed(It, D.storageV5);
          if (Wo !== null) return bo(() => ke("history suppressed", Wo), "history_suppressed_after_answer");
          let mn = await Dt(sessionId, Xe, D.credentials);
          if (mn !== null) return bo(() => Re(mn), `${mn}_after_answer`);
          let { spawnBackgroundFork: spawnBackgroundFork, deriveBackgroundSeed: deriveBackgroundSeed } =
              await Xt(),
            messages = D.getMessages();
          if (
            target_message_uuid !== void 0 &&
            findRewindTarget(messages.slice(0, sliced.length), target_message_uuid) === null
          )
            return bo(() => ke("target not found"), "target_not_found_after_answer");
          if (Xe.some((bn, Go) => messages[Go]?.uuid !== bn.uuid))
            return bo(() => Re("conversation_changed"), "conversation_changed_after_answer");
          let launchState = D.getLaunchState(),
            kn = deriveBackgroundSeed(Xe, "", "(forked)") ?? {
              intent: "(forked)",
              name: getCurrentSessionDisplayTitle(It),
            },
            Fn = await spawnBackgroundFork(
              kn,
              null,
              launchState.sessionEffort,
              getPermissionModeCycle(launchState),
              launchState.toolPermissionContext.additionalWorkingDirectories,
              launchState.toolPermissionContext.alwaysAllowRules,
              launchState.toolPermissionContext.alwaysDenyRules,
              "remote_fork",
              messages,
              {
                keepParent: !0,
                resumeAtLeaf: At,
                taskFreeInFlight: { tasks: 0, queued: 0, kinds: [] },
                proactivityLevel: jye(launchState),
                storageV5: D.storageV5,
                credentials: D.credentials,
                extraEnv: buildBridgeReattachEnv(sessionId, void 0, !1, Ho.sessionGroupingId),
              },
            );
          if (!Fn.ok)
            return bo(
              () =>
                Fn.reason === "fork_point_missing" ? ke("target not found") : Re(Fn.reason ?? "spawn_failed"),
              "spawn_failed_after_answer",
            );
          return (
            await D.recordChildBridgeSession(Fn.short, sessionId, Ho.sessionGroupingId).catch((bn) =>
              logForDebugging(
                `[rc-fork] Could not record the fork's session in job ${Fn.short}: ${errorMessage(bn)}`,
                { level: "warn" },
              ),
            ),
            ee("ok"),
            co(sessionId)
          );
        } catch (error) {
          return (
            logForDebugging(`[rc-fork] fork_conversation failed: ${errorMessage(error)}`, { level: "error" }),
            bo(() => Re("exception"), "exception_after_answer")
          );
        }
      })(),
      FORK_ANSWER_DEADLINE_MS,
      D.armAnswerDeadline,
    );
  if (Bo !== void 0) return Bo;
  if (io !== null && !so) return ((po = "forked"), co(io));
  return ((po = "failed"), Re("deadline"));
}
/**
 * 生成分叉会话标题：优先用请求给的标题；其次当前会话标题加 " (fork)"；再次从人类消息推导（截到 FORK_TITLE_MAX_LENGTH）；都没有则 "Forked session"。
 */
//@ chunk-18hwfzwa.js:1571993-1572260 placement
function deriveForkTitle(requestedTitle, messages) {
  let D = (Re) => sanitizeSessionTitle(Re).replace(/\s+/g, " ").trim(),
    L = requestedTitle !== void 0 ? D(requestedTitle) : "";
  if (L) return L;
  let ee = getCurrentSessionDisplayTitle(getSessionId()),
    ke = ee ? D(`${ee} (fork)`) : "";
  if (ke) return ke;
  for (let Re of messages) {
    let Be = deriveTitleFromHumanTurn(Re),
      He = Be === void 0 ? "" : truncateToLength(D(Be), FORK_TITLE_MAX_LENGTH).trim();
    if (He) return He;
  }
  return "Forked session";
}
//@ chunk-18hwfzwa.js:1572260-1572396 placement
async function checkForkHistorySuppressed(sessionId, transcriptPath) {
  let D = await readHistorySuppressionFromDisk(transcriptPath);
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return "history_suppressed";
  return D !== "clean" ? "history_suppressed_on_disk" : null;
}
/**
 * 为分叉创建远端 code session：取 OAuth 令牌和 git 证据（无仓库地址时退回另一来源），按分组 id 创建；分组被拒时不带分组重试一次。成功返回 {sessionId, sessionGroupingId}，否则 null。
 */
//@ chunk-18hwfzwa.js:1572396-1572980 placement
async function createForkCodeSession({
  title: title,
  tags: tags,
  sessionGroupingId: sessionGroupingId,
  credentials: credentials,
}) {
  let { accessToken: accessToken } = await prepareApiRequest(credentials),
    {
      branch: branch,
      gitRepoUrl: gitRepoUrl,
      defaultBranch: defaultBranch,
    } = await snapshotGitEvidenceForBridge(),
    fallbackRepoUrl = gitRepoUrl ? void 0 : await hKs(),
    repoSource = fallbackRepoUrl ? { repositoryUrl: fallbackRepoUrl } : void 0,
    createSession = (groupingIdArg) =>
      createCodeSession(
        getBridgeBaseUrl(),
        accessToken,
        title,
        1e4,
        tags,
        gitRepoUrl
          ? { gitRepoUrl: gitRepoUrl, branch: branch, defaultBranch: defaultBranch ?? void 0 }
          : repoSource,
        getOriginalCwd(),
        getMainLoopModel(),
        groupingIdArg,
      ),
    groupingId = sessionGroupingId,
    result = await createSession(groupingId);
  if (groupingId !== void 0 && isCreateSessionFailure(result) && result.reason === "grouping_rejected")
    ((groupingId = void 0), (result = await createSession(void 0)));
  if (repoSource && typeof result === "string") y6n("fork");
  if (repoSource && typeof result !== "string" && !isCredentialsRejection(result)) _6n("fork", result);
  return typeof result === "string" ? { sessionId: result, sessionGroupingId: groupingId } : null;
}
//@ chunk-18hwfzwa.js:1572980-1573075 placement
var d$o = new Set(["get_usage", "mcp_status", "get_context_usage", "stop_task", "background_tasks"]);
//@ chunk-18hwfzwa.js:1573075-1573966 placement
function makeBridgeControlContext({
  session: session,
  engineStore: engineStore,
  transcript: transcript,
  storageV5: storageV5,
  credentials: credentials,
  thinkingBudget: thinkingBudget,
  mainLoopModel: mainLoopModel,
  getContextUsageInputs: getContextUsageInputs,
}) {
  return {
    session: session,
    redactsPersistedLane: () => !0,
    engineState: engineStore.getState,
    setEngineState: engineStore.setState,
    storageV5: storageV5,
    credentials: credentials,
    thinkingBudget: thinkingBudget,
    sessionTitles: null,
    mcpControlLanes: null,
    replyNow: null,
    resumeUntrackedAgent: null,
    mcpConnections: () => {
      let { clients: clients, tools: tools } = engineStore.getState().mcp;
      return { connections: clients, tools: tools };
    },
    isKnownMcpServer: (He) =>
      engineStore.getState().mcp.clients.some((client) => client.name === He) ||
      getMcpConfigByName(He) !== null,
    contextUsageInputs: () => {
      let {
        tools: tools,
        mcpClients: mcpClients,
        customSystemPrompt: customSystemPrompt,
        appendSystemPrompt: appendSystemPrompt,
        systemPromptSnapshot: systemPromptSnapshot,
        runningTurnModelOverride: runningTurnModelOverride,
      } = getContextUsageInputs();
      return {
        messages: transcript.getSnapshot(),
        tools: tools,
        mcpClients: mcpClients,
        agentDefinitions: engineStore.getState().agentDefinitions,
        customSystemPrompt: customSystemPrompt,
        appendSystemPrompt: appendSystemPrompt,
        systemPromptSnapshot: systemPromptSnapshot,
        mainLoopModel: runningTurnModelOverride ?? mainLoopModel(),
      };
    },
  };
}

export {
  d$o,
  makeBridgeControlContext,
  withdrawBridgeInboundMessage,
  dedupeByRequestId,
  handleRcForkConversation,
  ovt,
};
