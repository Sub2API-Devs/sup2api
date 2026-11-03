/**
 * tools/AgentTool/runAgent.ts
 *
 * runAgent：子代理主循环——模型/权限/工具/系统提示词/MCP/skills/钩子准备，调用 query 循环并记录 sidechain 转录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/runAgent.ts
 * pieces: chunk-0h4e7gnq.js (41)
 * attribution: placement 22, fingerprint 3, layout 7, facade-exports 5, file-local 1, sole-consumer 3
 */
import { sep, join, resolve, basename } from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import {
  hasParkedAgentBaseline,
  Mlr,
  restoreAgentBaseline,
  forgetClassifierCompaction,
} from "../../services/api/promptCacheBreakDetection.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { toStorageKey } from "../../utils/storage/storageKeys.js";
import {
  yH,
  getAgentTranscriptPath,
  locateAgentTranscript,
  readAgentMetadata,
  writeAgentMetadata,
  setAgentTranscriptSubdir,
  isLoggableMessage,
  clearAgentTranscriptSubdir,
  recordForkContextRef,
  recordSidechainTranscript,
  registerTranscriptExitDrain,
  transcriptCursorEnd,
  isTranscriptPersistenceDisabled,
} from "../../utils/sessionStorage.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logError } from "../../utils/log.js";
import { subagentSidecarKey } from "../../utils/subagentTranscriptPath.js";
import { killShellTasksForAgent } from "../../tasks/LocalShellTask/killShellTasks.js";
import { SVe } from "../../utils/messageQueueManager.js";
import { isOfficialMarketplaceSkill } from "../SkillTool/SkillTool.js";
import { sanitizeSkillNameForTelemetry, logSkillsLoaded } from "../../utils/telemetry/skillLoadedEvent.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { buildServerAttributionFields } from "../../utils/telemetry/pluginTelemetry.js";
import {
  ZJr,
  getPendingHandbackReport,
  PZo,
  recordHandbackContract,
  isSendMessageHandbackEnabled,
  Fgi,
  resolveHandbackRecipient,
  findLatestHandbackReminder,
  buildHandbackInstruction,
  handbackCountermandText,
} from "./handbackReport.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { excludeCoordinatorCommsMcpTools } from "../../coordinator/coordinatorMcpServers.js";
import { bridgeToolsOf } from "../../bridge/bridgePermissionResponse.js";
import { isMcpTool } from "../../services/mcp/utils.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  StreamClosedAbortError,
  isAbortError,
  AbortError,
} from "../../utils/errors.js";
import { SENDMESSAGE, hasSendMessageTool } from "../SendMessageTool/constants.js";
import {
  getStrictMcpConfig,
  getIsRemoteMode,
  isDiskless,
  getSessionId,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getProjectRootOrNull,
  getStickyBetas,
  mainAgentId,
  getThinkingDisplayExplicit,
  getOriginalCwd,
  getProjectRoot,
} from "../../bootstrap/state.js";
import {
  getMcpConfigByName,
  unaddableTransportReason,
  doesEnterpriseMcpConfigExist,
  zXn,
  M3s,
  filterMcpServersByPolicy,
  mcpDialBlockCause,
} from "../../services/mcp/config.js";
import { isBuiltinMcpServerName } from "../../services/mcp/builtinServerNames.js";
import { kA } from "../../services/policyLimits/coldStartWaiter.js";
import { isSourceAdminTrusted, isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isSafeMode, isEnvTruthy } from "../../utils/envUtils.js";
import { reportOnce } from "../../utils/reportOnce.js";
import {
  Zin,
  withAgentDisallowedTools,
  resolveAgentTools,
  withWebFetchToolForAgent,
  resolveAgentToolNames,
} from "./agentToolUtils.js";
import { w1r, checkAgentOriginTrust, agentFolderTrustHint, isAgentDefinitionTrusted } from "./agentTrust.js";
import {
  isRestrictedPersonalAgent,
  settingsGrantsConfined,
} from "../../utils/permissions/permissionsLoader.js";
import { agentMcpSource, isBuiltInAgent } from "./loadAgentsDir.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { CLAUDE_ARTIFACTS } from "../../services/mcp/firstPartyServerIds.js";
import { ht } from "../../services/mcp/cliOwnedClients.js";
import { transportStateByHost } from "../../cli/transportState.js";
import {
  normalizeMessage,
  isToolUseOrResultMessage,
  Ebe,
  appendRowsWithHooks,
  Mwt,
} from "../../utils/queryHelpers.js";
import { makeSidecarReadFallback } from "../../utils/agentMetadata.js";
import { isEffortLevel } from "../../utils/effort.js";
import { isBypassPermissionsModeDisabled } from "../../utils/permissions/permissionSetup.js";
import { isolationWorktreeFor, XVe, isSameRepoWorktree } from "../../utils/worktreeIsolation.js";
import {
  checkSyncedSkillAccess,
  logSyncedPartRefused,
  findRefusedSyncedCommands,
  gse,
} from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { Lkt } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
} from "../../utils/permissions/toolPermissionContext.js";
import { getAgentModelWithTelemetry, getExploreAgentModel } from "../../utils/model/agent.js";
import { makeSaltedName } from "../../utils/agentId.js";
import {
  isDelegatedObservationContext,
  getAgentDepth,
  isHookOrPluginSteered,
} from "../../utils/agentContext.js";
import { isUnknownPluginSpawnedAgent } from "./pluginSpawnNote.js";
import { raiseTurnLifecycleForAgent } from "../../query/turnHooks.js";
import { Rqe, Anr, xqe } from "../../utils/telemetry/perfettoTracing.js";
import {
  isNullRenderingAttachment_4,
  createUserMessage,
  wrapInSystemReminder,
  OB,
  normalizeMessagesForResume,
  normalizeMessagesForAPI,
  handleMessageFromStream,
  normalizeMessages,
  createProgressMessage,
  extractAgentIdsFromMessages_2,
} from "../../utils/messages.js";
import { forkPointUuidOf, createSubagentContext } from "../../utils/forkedAgent.js";
import { cloneFileStateCache } from "../../utils/fileStateCache.js";
import { nv, ZC } from "../../utils/remoteFileState.js";
import { getOrBuildUserContext, getCachedSystemContext, getManagedInstructionText } from "../../context.js";
import { narrowerMode, I_r } from "../../utils/permissions/browserToolNames.js";
import {
  hasHookForEvent_2,
  executeSubagentStartHooks,
  getNonBlockableHookErrorMessage,
  executeStopHooks,
} from "../../utils/hooks.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";
import { fallbackFromUnavailableAutoMode } from "./agentLaunch.js";
import { withClassifiedWebCalls, buildDisallowedToolsFilter } from "../../utils/permissions/permissions.js";
import { zue } from "../../utils/permissions/permissionPromptHost.js";
import {
  bN,
  getStaleMemoryContextAttachment,
  coworkMemoryContextMode,
  buildAnchorAttachment,
} from "../../services/accountMemory/memoryContext.js";
import { tZs, nZs, Y2t } from "../../services/accountMemory/accountMemoryServer.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { env, antEnv } from "../../utils/env.js";
import { uniq, count } from "../../utils/collections.js";
import { insertCoworkMemoryContexts } from "../../services/AgentSummary/agentSummary.js";
import { Us } from "../../services/projects/threadRows.js";
import {
  hasFrontmatterHooks,
  registerFrontmatterHooks,
  yyt,
} from "../../utils/hooks/registerFrontmatterHooks.js";
import { warnMcpToolNameTooLong } from "../../services/mcp/toolNameLimits.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { getMaxSubagentSpawnDepth } from "./spawnDepth.js";
import { toolMatchesName } from "../../Tool.js";
import { SUBAGENTHANDBACK, FORK } from "./constants.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import {
  getHeldBackSyncedPlugins,
  withNamedFolderYieldsRestored,
  getSkillToolCommands,
  getHiddenSyncedSkills,
  findCommand,
  isCommandEnabled,
  builtInCommandNames,
  isProjectScopedCommand,
} from "../../commands.js";
import { Z5, isKilledHostCatalogSkill, isSyncedSkill } from "../../utils/commandPredicates.js";
import { getSyncedSkillCommands, Gun } from "../../utils/claudeAiSync/skillsSync.js";
import { foldName } from "../../utils/plugins/syncedItems.js";
import { PromptScopedAbortController, unwrapAbortReason } from "../../utils/abortController.js";
import { applySkillPromptHooks } from "../../plugins/functionHooks/skillPromptHooks.js";
import {
  cloneStickyBetaLatches,
  eLi,
  forkStickyBetaLatches,
  createStickyBetaLatches,
} from "../../bootstrap/stateSlices.js";
import { Qun } from "../../services/api/cacheKeepalive.js";
import { seedWireShapeFromRecord, forgetAgentThread } from "../../services/api/tether.js";
import { j_e, recordedDeferredTools } from "../../utils/contextAttachments/promptSnapshot.js";
import {
  mergeNameOnlyAnnouncements,
  getDeferredToolsDeltaAttachments,
  getDeclaredToolSource,
  buildDeferredToolsLatchContextFrom,
  getSkillListingAttachmentsLazy,
} from "../../utils/attachments.js";
import { getSandboxInstructionsAttachments } from "../../utils/attachments/sandboxInstructions.js";
import { escapeXmlText } from "../../utils/sanitization.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { lXn, aXn } from "../../tasks/LocalAgentTask/childWork.js";
import { applySubagentThinkingDisplay } from "../../utils/thinking.js";
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { buildVerifiedHumanTurns } from "../../utils/messages/apiNormalization.js";
import { A4s } from "../../services/mcp/mcpSkills.js";
import { getEnvironmentChangeAttachments } from "../../utils/attachments/environmentChange.js";
import { isRemoteToolForwardingSwitchOn } from "../../services/remoteTools/servingGates.js";
import { Ogr, sTi } from "../../utils/concurrentSessions.js";
import { recordSpawnProvenance, B1o } from "../../plugins/functionHooks/agentHooks.js";
import { recordForwardedTurnsDelivered } from "../../utils/messageProvenance.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { jjr, buildAutoModeStoppedMessage } from "../../utils/permissions/autoModeUnavailable.js";
import { registerSandboxWriteDirectory, unregisterSandboxWriteDirectory } from "../../utils/Shell.js";
import { executeInSpan, endSubagentSpan } from "../../utils/telemetry/sessionTracing.js";
import { isStreamEvent } from "../../utils/messageKinds.js";
import { applyPreservedMessages } from "../../services/compact/compact.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { buildAgentStoppedUnavailableMessage } from "../../utils/permissions/serverClassifier/results.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { hasRunningBackgroundWorkForAgent } from "../../tasks/backgroundTaskKinds.js";
import { ensureAgentDirectoryExists } from "../../components/agents/agentFileUtils.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { NKe } from "../../utils/instructionFileAccess.js";
import { classifyToolError } from "../../services/tools/toolExecution.js";
import { e1s } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { readAgentMemoryScope } from "./agentMemory.js";
import { buildSubagentNotesSection, DEFAULT_SUBAGENT_PROMPT } from "../../constants/prompts.js";
import { applyPromptAblation } from "../../utils/api.js";
import { firstLineOf } from "../../utils/stringUtils.js";

/**
 * 恢复被续接子代理的基线状态（存储 V5 时换算存储键）。
 */
//@ chunk-0h4e7gnq.js:81304-81708 placement
async function restoreResumedAgentBaseline(e, { resumed: resumed, storageV5: storageV5 }) {
  if (!resumed) return;
  try {
    let y = null,
      r = hasParkedAgentBaseline(e) ? void 0 : Fd(e);
    if (r !== void 0) {
      let S = isStorageV5Enabled() && storageV5 !== void 0 ? toStorageKey(r) : void 0;
      if (storageV5 === void 0 || S === void 0) {
        let h = yH(r);
        y = h === void 0 ? null : await readSmallFileOrNull(h, Mlr);
      } else {
        let read = await storageV5.read([{ key: S, offset: 0, length: Mlr + 1 }]),
          k = read.ok ? read.value.items[0] : void 0;
        if (k?.found && k.totalBytes <= Mlr) y = Buffer.from(k.value).toString("utf-8");
      }
    }
    restoreAgentBaseline(e, y);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:81708-81771 placement
function Nd(e) {
  return getAgentTranscriptPath(e).replace(/\.jsonl$/, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81771-81846 placement
function Fd(e) {
  let n = locateAgentTranscript(e);
  return n === void 0 ? void 0 : subagentSidecarKey(n, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81846-81912 placement
function kLr(e, n) {
  let s = e;
  return n === void 0 ? s : { ceiling: n, inner: s };
}
//@ chunk-0h4e7gnq.js:81912-81962 placement
function pi(e, n) {
  (killShellTasksForAgent(e, n), SVe((s) => s.agentId === e));
}
//@ chunk-0h4e7gnq.js:81962-82010 placement
function ci(e, n, s) {
  try {
    logAgentSkillPreload(e, n, s);
  } catch (error) {
    logError(error);
  }
}
/**
 * 上报子代理预加载技能的遥测（tengu_skill_tool_invocation，execution_context=preload、invocation_trigger=agent-preload）；技能名按官方市场/MCP/内建/打包区分脱敏。
 */
//@ chunk-0h4e7gnq.js:82010-82485 placement
function logAgentSkillPreload(e, n, s) {
  let y = isOfficialMarketplaceSkill(e),
    { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
      rawName: e.name,
      canonicalName: e.name,
      isMcp: e.loadedFrom === "mcp",
      isBuiltIn: s,
      isBundled: e.source === "bundled",
      isOfficial: y,
    }),
    h = "agent-preload";
  logEvent("tengu_skill_tool_invocation", {
    command_name: sanitizedName,
    _PROTO_skill_name: e.name,
    ...skillNameHash,
    execution_context: lit("preload"),
    invocation_trigger: fromEnum("agent-preload"),
    parent_agent_id: ye(n),
    ...logSkillsLoaded(e.source, e.loadedFrom, e.kind, e.createdBy),
    skill_content_chars: e.contentLength,
    ...buildServerAttributionFields(e),
  });
}
/**
 * 取子代理最近一次自我报告的文本，有 warning 时拼在前面；报告来源与当前一致时不取，返回 undefined。被 runAgent 使用。
 */
//@ chunk-0h4e7gnq.js:82485-82634 placement = getDestructiveCommandWarning (0.499)
function getLatestAgentReportText(e, n, s) {
  let r = ZJr(n) !== s ? getPendingHandbackReport(e, n)?.at(-1)?.report : void 0,
    S = r?.text;
  if (S === void 0) return;
  return r?.warning === void 0
    ? S
    : `${r.warning}

${S}`;
}
//@ chunk-0h4e7gnq.js:82634-82937 placement
function filterIncompleteToolCalls_2(e, n) {
  if (e.options.forwardSubagentText) return !0;
  if (e.session.surfaceCapabilities.sdkForwardNestedSubagentToolCalls() !== !0) return !1;
  let content = n.data.message.message.content,
    y = Array.isArray(content) ? content[0] : void 0;
  if (y?.type !== "tool_use" && y?.type !== "tool_result") return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_starry_squid", !0);
}
//@ chunk-0h4e7gnq.js:82937-84075 placement
class SidechainRecorder {
  sessionStorage;
  agentId;
  lastRecordedUuid;
  recordedUuids;
  storageV5;
  abortSignal;
  queued = [];
  unregisterExitDrain;
  flushHeld = () => this.flush(!0);
  constructor(e, n, s, y, r, S) {
    this.sessionStorage = e;
    this.agentId = n;
    this.lastRecordedUuid = s;
    this.recordedUuids = y;
    this.storageV5 = r;
    this.abortSignal = S;
    ((this.unregisterExitDrain = e.registerTranscriptExitDrain(this.flushHeld)),
      S.addEventListener("abort", this.flushHeld, { once: !0 }));
  }
  record(e) {
    return (
      this.queued.push(...e.filter(this.sessionStorage.isLoggableMessage)),
      this.flush(
        this.abortSignal.aborted || e.some((n) => n.type === "assistant" && n.isApiErrorMessage === !0),
      )
    );
  }
  async flush(e = !1) {
    let splice = this.queued.splice(0, this.sessionStorage.transcriptCursorEnd(this.queued, 0, !e));
    if (splice.length === 0) return;
    let lastRecordedUuid = this.lastRecordedUuid;
    for (let y of splice) ((this.lastRecordedUuid = y.uuid), this.recordedUuids?.add(y.uuid));
    await this.sessionStorage
      .recordSidechainTranscript(splice, this.agentId, lastRecordedUuid, this.storageV5)
      .catch(is);
  }
  forget(e) {
    let lastIndex = this.queued.findLastIndex((s) => s.uuid === e);
    if (lastIndex !== -1) this.queued.splice(lastIndex, 1);
  }
  async close() {
    (await this.flush(!0),
      this.unregisterExitDrain(),
      this.abortSignal.removeEventListener("abort", this.flushHeld));
  }
}
//@ chunk-0h4e7gnq.js:84075-84139 placement
function is(e) {
  logForDebugging(`Failed to record sidechain transcript: ${e}`);
}
//@ chunk-0h4e7gnq.js:84139-84258 placement
function assembleAgentToolPool(e, n, s) {
  return e.options.toolCatalog.assembleToolPool(n, excludeCoordinatorCommsMcpTools(s), {
    skipReplFilter: !0,
    machineMcpTools: bridgeToolsOf(e),
  });
}
//@ chunk-0h4e7gnq.js:84258-84347 placement
function rue(e) {
  let n = () => [];
  return {
    onToolPool: (s) => {
      n = s;
    },
    reviewTools: () => [...e, ...n()],
  };
}
/**
 * 创建随调用增长的工具列表获取函数。
 */
//@ chunk-0h4e7gnq.js:84347-84657 placement
function createGrowingToolList(e, n, s, y) {
  let r = e,
    S,
    h;
  return () => {
    try {
      let k = n(),
        w = s();
      if (k !== S || w !== h) {
        let combined = k.concat(w.filter(isMcpTool)),
          L = new Set(r.map((G) => G.name)),
          I = new Set(combined.map((G) => G.name).filter((G) => !L.has(G)));
        if (I.size > 0) {
          let filtered = y(combined).filter((ee) => I.has(ee.name));
          if (filtered.length > 0) r = [...r, ...filtered];
        }
        ((S = k), (h = w));
      }
    } catch (error) {
      logError(toError(error));
    }
    return r;
  };
}
//@ chunk-0h4e7gnq.js:84657-84772 placement
function isOnlyPendingToolUse(e, n) {
  let flattened = e.slice(e.findLastIndex((y) => y.type === "user") + 1).flatMap(getToolUseIds);
  return flattened.length === 1 && flattened[0] === n;
}
/**
 * 在消息中找出正在等待结果的工具调用及其所属的助手消息。
 */
//@ chunk-0h4e7gnq.js:84772-85087 placement
function findWaitingToolCall(e, n, s, { normalizeMessagesForAPI: normalizeMessagesForAPI }) {
  let lastIndex = e.findLastIndex((k) => getToolUseIds(k).includes(n)),
    S = e[lastIndex];
  if (S?.type !== "assistant") return;
  let h = e.slice(0, lastIndex).findLastIndex((k) => k.type === "user") + 1;
  if (e.slice(0, h).some((k) => gi(k, S)) || normalizeMessagesForAPI(e.slice(lastIndex + 1), s).length > 0)
    return;
  return { call: S, rows: e.slice(h, lastIndex + 1).filter((k) => gi(k, S)) };
}
//@ chunk-0h4e7gnq.js:85087-85666 placement
async function* abortedToolResults(e, n, s, y) {
  if (e === void 0) return yield* s(y);
  let r = findWaitingToolCall(y.messages, e.id, y.toolUseContext.options.tools, n);
  if (r === void 0)
    return (
      e.settled(),
      yield* s({ ...y, messages: n.filterUnresolvedToolUses(y.messages, void 0, { dropSiblingBlocks: !0 }) })
    );
  let S = new Set(r.rows),
    h = s({ ...y, messages: y.messages.filter((message) => !S.has(message)), keptFirstResponse: r.rows });
  try {
    let k = await h.next();
    while (!k.done) {
      if (k.value.type === "user" && k.value.sourceToolAssistantUUID === r.call.uuid) e.settled();
      (yield k.value, (k = await h.next()));
    }
    return k.value;
  } finally {
    (e.settled(), await h.return({ reason: "aborted_tools" }));
  }
}
//@ chunk-0h4e7gnq.js:85666-85808 placement = countToolCallsSince (1)
function getToolUseIds(e) {
  return e.type === "assistant" && Array.isArray(e.message.content)
    ? e.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
    : [];
}
//@ chunk-0h4e7gnq.js:85808-85882 placement
function gi(e, n) {
  return e.type === "assistant" && e.message.id === n.message.id;
}
//@ chunk-0h4e7gnq.js:85882-85958 placement
var jd = null,
  Si = `Other agents active in this session, addressable via ${SENDMESSAGE}`;
//@ chunk-0h4e7gnq.js:85958-86788 placement
function resolveAgentMcpServers(e, n, s) {
  if (typeof s === "string") {
    if (getStrictMcpConfig())
      return (
        logForDebugging(
          `[Agent: ${e}] MCP server '${s}' skipped: string specs resolve from disk config, which --strict-mcp-config ignores`,
          { level: "warn" },
        ),
        { skipped: "strict", name: s }
      );
    let k = getMcpConfigByName(s);
    if (!k) return (logForDebugging(`[Agent: ${e}] MCP server not found: ${s}`, { level: "warn" }), null);
    return { name: s, config: k, isNewlyCreated: !1 };
  }
  let entries = Object.entries(s);
  if (entries.length !== 1)
    return (
      logForDebugging(`[Agent: ${e}] Invalid MCP server spec: expected exactly one key`, { level: "warn" }),
      null
    );
  let [r, S] = entries[0];
  if (isBuiltinMcpServerName(r))
    return (
      logForDebugging(`[Agent: ${e}] Skipping reserved MCP server name '${r}' in frontmatter`, {
        level: "warn",
      }),
      null
    );
  let h = unaddableTransportReason(S.type);
  if (h !== null)
    return (
      logForDebugging(`[Agent: ${e}] Skipping ${h} MCP transport '${S.type}' for '${r}' in frontmatter`, {
        level: "warn",
      }),
      null
    );
  return { name: r, config: { ...S, scope: "agent", agentSource: n }, isNewlyCreated: !0 };
}
/**
 * 连接代理 frontmatter 中声明的 MCP 服务器：受 strictPluginOnlyCustomization、--strict-mcp-config、--bare/--safe-mode、远程模式、企业 MCP 配置、云会话、CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG、项目审批与托管策略限制；返回合并后的 clients、该代理专属工具和 cleanup。
 */
//@ chunk-0h4e7gnq.js:86788-89986 fingerprint = initializeAgentMcpServers (0.321)
async function initializeAgentMcpServers(
  agentDefinition,
  parentClients,
  onServersBlocked,
  abortSignal,
  options,
) {
  if (!agentDefinition.mcpServers?.length)
    return { clients: parentClients, agentClients: [], tools: [], cleanup: async () => {} };
  await kA();
  let agentIsAdminTrusted = isSourceAdminTrusted(agentDefinition.source),
    h = null;
  if (isRestrictedToPluginOnly("mcp") && !agentIsAdminTrusted) h = "strictPluginOnlyCustomization";
  else if (getStrictMcpConfig() && agentDefinition.source !== "flagSettings") h = "--strict-mcp-config";
  else if (isCustomizationDisabled("mcpAgentFrontmatter")) h = isSafeMode() ? "--safe-mode" : "--bare";
  else if (getIsRemoteMode()) h = "remote mode";
  else if (doesEnterpriseMcpConfigExist()) h = "enterprise MCP config";
  else if (isDiskless()) (reportOnce("subagent_mcp_servers"), (h = "this cloud session"));
  if (h)
    return (
      logForDebugging(
        `[Agent: ${agentDefinition.agentType}] Skipping frontmatter MCP servers: blocked by ${h} (agent source: ${agentDefinition.source})`,
        { level: "warn" },
      ),
      onServersBlocked?.(Zin(agentDefinition.mcpServers), h),
      { clients: parentClients, agentClients: [], tools: [], cleanup: async () => {} }
    );
  let k = !w1r(agentDefinition),
    w = isRestrictedPersonalAgent(agentDefinition);
  if (k && w && agentDefinition.mcpServers.some((mcpServer) => typeof mcpServer !== "string"))
    onServersBlocked?.(
      Zin(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
      "your own agents can't define their own MCP servers in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)",
    );
  if (!k)
    (checkAgentOriginTrust(agentDefinition, "subagent", "mcpServers"),
      onServersBlocked?.(
        Zin(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
        `untrusted agent origin \u2014 ${agentFolderTrustHint(agentDefinition)}`,
      ));
  let x = [],
    L = [],
    I = [],
    G = [],
    results = await Promise.all(
      agentDefinition.mcpServers.map(async (mcpServer) => {
        if (typeof mcpServer !== "string" && (!k || w)) return null;
        let le = resolveAgentMcpServers(
          agentDefinition.agentType,
          agentMcpSource(agentDefinition),
          mcpServer,
        );
        if (le === null) return null;
        if ("skipped" in le) return (I.push(le.name), null);
        let { name: j, config: config, isNewlyCreated: isNewlyCreated } = le;
        if (zXn(j) && (M3s(parentClients) || (jd?.laptopMemoryToolsEntryBuilt() ?? !1)))
          return (
            logForDebugging(
              `[Agent: ${agentDefinition.agentType}] MCP server '${j}' skipped: the session holds this server name for its own entry`,
              { level: "warn" },
            ),
            G.push(j),
            null
          );
        let { blocked: blocked } = filterMcpServersByPolicy({ [j]: config }),
          ce = blocked.length > 0 ? "managed-policy" : mcpDialBlockCause(j, config);
        if (ce === "project-approval")
          return (
            logForDebugging(
              `[Agent: ${agentDefinition.agentType}] MCP server '${j}' skipped: not approved for this project`,
              { level: "warn" },
            ),
            L.push(j),
            null
          );
        if (ce)
          return (
            logForDebugging(
              `[Agent: ${agentDefinition.agentType}] MCP server '${j}' blocked by managed settings MCP policy`,
              { level: "warn" },
            ),
            x.push(j),
            null
          );
        let { connectToServer: connectToServer, fetchToolsForClient: fetchToolsForClient } =
            require("./chunk-asne9cp8.js").mcpClientModule(),
          { boundDial: boundDial } = require("./chunk-td5f96dd.js"),
          q = connectToServer(j, config, void 0, abortSignal, options),
          name;
        try {
          name = await boundDial(q, { serverName: j, context: "subagent MCP server connect" });
        } catch (error) {
          if (
            (logForDebugging(
              `[Agent: ${agentDefinition.agentType}] MCP server '${j}' connect timed out or aborted: ${errorMessage(error)}`,
              { level: "warn" },
            ),
            isNewlyCreated)
          )
            q.then(
              (Q) => {
                if (Q.type === "connected") Q.cleanup().catch(() => {});
              },
              () => {},
            );
          return null;
        }
        let ue = [];
        if (name.type === "connected")
          ((ue = await fetchToolsForClient(name, abortSignal)),
            logForDebugging(
              `[Agent: ${agentDefinition.agentType}] Connected to MCP server '${j}' with ${ue.length} tools`,
            ));
        else
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Failed to connect to MCP server '${j}': ${name.type}`,
            { level: "warn" },
          );
        return applyMcpServerConfig(config, { client: name, tools: ue, isNewlyCreated: isNewlyCreated });
      }),
    );
  if (I.length > 0) onServersBlocked?.(I, "--strict-mcp-config");
  if (x.length > 0) onServersBlocked?.(x, "managed settings MCP policy");
  if (L.length > 0) onServersBlocked?.(L, "missing project approval (approve via /mcp)");
  let te = [],
    R = [],
    z = [];
  for (let V of results) {
    if (!V) continue;
    if ((te.push(V.client), V.isNewlyCreated)) R.push(V.client);
    z.push(...V.tools);
  }
  if (te.some((V) => V.name === CLAUDE_ARTIFACTS)) ht().subagentBroughtOwnArtifactsServer = !0;
  let cleanup = async () => {
    for (let client of R)
      if (client.type === "connected")
        try {
          await client.cleanup();
        } catch (error) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Error cleaning up MCP server '${client.name}': ${error}`,
            { level: "warn" },
          );
        }
  };
  return { clients: [...parentClients, ...te], agentClients: te, tools: z, cleanup: cleanup };
}
/**
 * 可记录到子代理转录的消息类型：assistant/user/progress 与 compact_boundary 系统消息。
 */
//@ chunk-0h4e7gnq.js:89986-90133 fingerprint = isRecordableMessage (1)
function isRecordableMessage(msg) {
  return (
    msg.type === "assistant" ||
    msg.type === "user" ||
    msg.type === "progress" ||
    (msg.type === "system" && "subtype" in msg && msg.subtype === "compact_boundary")
  );
}
//@ chunk-0h4e7gnq.js:90133-90193 layout
function logForkContextRefFailure(e) {
  logForDebugging(`Failed to record fork-context-ref: ${e}`);
}
//@ chunk-0h4e7gnq.js:90193-90250 layout
function logAgentMetadataWriteFailure(e) {
  logForDebugging(`Failed to write agent metadata: ${e}`);
}
//@ chunk-0h4e7gnq.js:90250-90436 facade-exports
function writeSubagentProgressToOutputSink(e, n, s) {
  let active = transportStateByHost.of(e.session).active;
  if (!active) return;
  let r = e.options.forwardSubagentText ?? !1;
  for (let S of normalizeMessage(n, e.options.tools)) {
    if (s && !r && !isToolUseOrResultMessage(S)) continue;
    active.writeAfterInit(S);
  }
}
/**
 * 写入子代理元数据；恢复时先读取旧元数据并继承父代理、worktree、插件引导、workflow 阶段、请求形态、非交互与 effort 等字段。
 */
//@ chunk-0h4e7gnq.js:90436-91216 layout
async function persistAgentMetadata(e, n, context, y) {
  if (n) {
    let metadata = await readAgentMetadata(e, y).catch(makeSidecarReadFallback("persistAgentMetadata"));
    if (metadata) {
      if (((context.parentAgentId = metadata.parentAgentId), metadata.worktreePath === void 0))
        (delete context.worktreePath, delete context.worktreeBranch);
      if (metadata.inheritedWorktreePath !== void 0)
        context.inheritedWorktreePath = metadata.inheritedWorktreePath;
      if (metadata.spawnedWithWorktree === !0) context.spawnedWithWorktree = !0;
      if (metadata.worktreeCleanlyRemoved === !0) context.worktreeCleanlyRemoved = !0;
      if (metadata.pluginSteered === !0) context.pluginSteered = !0;
      if (metadata.workflowPhase !== void 0) context.workflowPhase = metadata.workflowPhase;
      if (metadata.requestShape === "foreground" || metadata.requestShape === "background")
        context.requestShape = metadata.requestShape;
      if (typeof metadata.requestNonInteractive === "boolean")
        context.requestNonInteractive = metadata.requestNonInteractive;
      if (context.effort === void 0 && metadata.effort !== void 0 && isEffortLevel(metadata.effort))
        context.effort = metadata.effort;
    }
  }
  await writeAgentMetadata(e, context, y);
}
/**
 * 把 .claude/worktrees/<名>/<相对路径> 映射回主仓库中的对应路径（防 .. 逃逸）；不在 worktree 下且位于允许根内返回 null，否则原样返回。旧版名 isDangerousFilePathToAutoEdit 误配，应归 worktree 相关模块。
 */
//@ chunk-0h4e7gnq.js:91216-91503 placement = isDangerousFilePathToAutoEdit (1)
function mapWorktreePathToRepo(path, allowedRoot) {
  let s = `${sep}.claude${sep}worktrees${sep}`,
    index = path.indexOf(s);
  if (index < 0) {
    if (allowedRoot && path.startsWith(allowedRoot + sep)) return null;
    return path;
  }
  let sliced = path.slice(0, index),
    sliced_2 = path.slice(index + s.length),
    index_2 = sliced_2.indexOf(sep);
  if (index_2 < 0) return null;
  let sliced_3 = sliced_2.slice(index_2 + 1),
    w = join(sliced, sliced_3),
    absolutePath = resolve(sliced);
  if (!resolve(w).startsWith(absolutePath + sep)) return null;
  return w;
}
/**
 * 子代理声明或请求 bypassPermissions 时是否授权：会话未受限且父会话处于 bypassPermissions。
 */
//@ chunk-0h4e7gnq.js:91503-91610 layout
function isBypassPermissionsAuthorized(permissionContext) {
  if (isBypassPermissionsModeDisabled()) return !1;
  if (permissionContext.restricted) return !1;
  if (permissionContext.mode === "bypassPermissions") return !0;
  return !1;
}
/**
 * runAgent 常量：流式 token 估算节流 500ms，frontmatter skills 最多预加载 32 个。
 */
//@ chunk-0h4e7gnq.js:91610-91627 layout
var STREAM_TOKEN_ESTIMATE_THROTTLE_MS = 500,
  MAX_PRELOADED_SKILLS = 32;
/**
 * runAgent：子代理主循环（async generator）。解析模型（uYs）、权限模式（spawn 模式/定义 permissionMode/bubble/bypass 授权）、工具集（resolveAgentTools，fork 时 useExactTools 原样继承）、系统提示词与 CLAUDE.md/附件、frontmatter MCP 服务器与 skills 预加载、SubagentStart/SubagentStop 钩子，创建子代理 ToolUseContext 后调用 query 循环，逐条 yield 消息并记录 sidechain 转录；结束时清理 MCP、钩子、监视任务与 worktree 根。
 */
//@ chunk-0h4e7gnq.js:91627-118485 facade-exports = runAgent (0.281)
async function* runAgent({
  agentDefinition: agentDefinition,
  promptMessages: promptMessages,
  waitingToolUse: waitingToolUse,
  turnPrompt: turnPrompt,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  isAsync: isAsync,
  requestShape: requestShape = isAsync ? "background" : "foreground",
  requestNonInteractive: requestNonInteractive,
  canShowPermissionPrompts: canShowPermissionPrompts,
  forkContextMessages: forkContextMessages,
  querySource: querySource,
  forkOrigin: forkOrigin,
  spawnedBySkill: spawnedBySkill,
  spawnedByForkedSkill: spawnedByForkedSkill,
  override: override,
  model: model,
  effort: effort,
  maxTurns: maxTurns,
  preserveToolUseResults: preserveToolUseResults,
  persistedToolResultFiles: persistedToolResultFiles,
  availableTools: availableTools,
  assembleAvailableTools: assembleAvailableTools,
  onToolPool: onToolPool,
  webFetchReadmissionAllowed: webFetchReadmissionAllowed = !0,
  allowedTools: allowedTools,
  onCacheSafeParams: onCacheSafeParams,
  contentReplacementState: contentReplacementState,
  stickyBetas: stickyBetas,
  useExactTools: useExactTools,
  totalTokensReminderBudget: totalTokensReminderBudget,
  isTotalTokensReminderBudgetOnTopOfStart: isTotalTokensReminderBudgetOnTopOfStart,
  worktreePath: worktreePath,
  worktreeBranch: worktreeBranch,
  cwd: cwd,
  launchedWithDefaults: launchedWithDefaults,
  session: session,
  spawnMode: spawnMode,
  description: description,
  name: Ke,
  toolUseId: toolUseId,
  enclosingToolUseId: enclosingToolUseId,
  transcriptSubdir: transcriptSubdir,
  spawnedByWorkflowRunId: spawnedByWorkflowRunId,
  workflowPhase: workflowPhase,
  onQueryProgress: onQueryProgress,
  onStreamTokenEstimate: onStreamTokenEstimate,
  onMcpServersBlocked: onMcpServersBlocked,
  onModelRestricted: onModelRestricted,
  isTeammate: isTeammate = !1,
  teammateContext: teammateContext,
  recordedUuids: recordedUuids,
  compactTranscriptUnavailable: compactTranscriptUnavailable,
  extraMetadata: extraMetadata,
  requiresStructuredOutput: requiresStructuredOutput,
  structuredOutputIsHandback: structuredOutputIsHandback,
  handbackOptIn: handbackOptIn,
  handbackTool: handbackTool,
  callerDeliveredReport: callerDeliveredReport,
}) {
  let ut = session ?? toolUseContext.session,
    Me =
      override?.agentContext?.agentType === "subagent" && override.agentContext.invocationKind === "resume",
    Xe = worktreePath || isolationWorktreeFor(toolUseContext);
  if (agentDefinition.source === "plugin") {
    let P = await checkSyncedSkillAccess(
      agentDefinition.plugin,
      agentDefinition.pluginSource?.pluginPath ?? agentDefinition.registeringPluginRoot,
      agentDefinition.registeredAtRunTime ? "refused" : "not judged",
    );
    if (P !== void 0)
      throw (
        logSyncedPartRefused("agent", agentDefinition.agentType, P),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `The agent was not started: ${Lkt(P)}.`,
          "synced plugin agent refused",
        )
      );
  }
  if (session) session.setIsolationRoot(Me ? void 0 : Xe);
  let He = getToolPermissionContext(toolUseContext),
    permissionMode = He.mode,
    parentModel = isTeammate
      ? toolUseContext.rootToolSurface.mainLoopModel
      : getMainLoopModel_2(toolUseContext),
    resolvedAgentModel = getAgentModelWithTelemetry(
      getExploreAgentModel(agentDefinition, parentModel),
      parentModel,
      model,
      permissionMode,
      onModelRestricted,
      isTeammate ? void 0 : Me ? "resume" : "spawn",
      {
        inWorkflowRun:
          spawnedByWorkflowRunId !== void 0 ||
          (!Me && !isTeammate && toolUseContext.spawnedByWorkflowRunId !== void 0),
      },
    ),
    jt = resolvedAgentModel,
    agentId = override?.agentId ? override.agentId : makeSaltedName(),
    agentAbortController = override?.abortController
      ? override.abortController
      : isAsync
        ? new AbortController()
        : toolUseContext.abortController,
    it = !(
      isDelegatedObservationContext(override?.agentContext ?? toolUseContext.agentContext) ||
      toolUseContext.options.settingsHooksOff === !0
    ),
    Xo = isUnknownPluginSpawnedAgent({
      hookCaller: toolUseContext.hookCaller,
      pluginUnnamed: toolUseContext.pluginUnnamed,
    });
  using Jo = raiseTurnLifecycleForAgent(
    it ? (turnPrompt ?? "") : "",
    agentId,
    agentAbortController.signal,
    toolUseContext.hookCaller ?? (Xo ? "" : void 0),
    toolUseContext.hookOrigin,
  );
  let So = ZJr(agentId);
  if (transcriptSubdir) setAgentTranscriptSubdir(agentId, transcriptSubdir);
  if (Rqe()) {
    let P = toolUseContext.agentId ?? getSessionId();
    Anr(agentId, agentDefinition.agentType, P);
  }
  let Oo,
    Kt = forkContextMessages ? filterIncompleteToolCalls(forkContextMessages) : [],
    initialMessages = [
      ...Kt,
      ...promptMessages.map((P) => (recordedUuids?.has(P.uuid) === !0 ? P : isNullRenderingAttachment_4(P))),
    ],
    fe = forkContextMessages !== void 0 ? forkPointUuidOf(Kt) : void 0,
    gt =
      override?.readFileState ??
      (forkContextMessages !== void 0
        ? cloneFileStateCache(toolUseContext.readFileState, { stripSeededFromContext: !0 })
        : nv(ZC)),
    [xt, Be] = await Promise.all([
      override?.userContext ??
        getOrBuildUserContext(toolUseContext.session, toolUseContext.storageV5, toolUseContext.credentials),
      override?.systemContext ??
        getCachedSystemContext(toolUseContext.session, toolUseContext.options.cacheBreakerPhrase),
    ]),
    {
      userContext: userContext,
      managedInstructionsOnly: managedInstructionsOnly,
      architectureInstructionsOnly: architectureInstructionsOnly,
    } = agentDefinition.omitClaudeMd && !override?.userContext
      ? await resolveAgentUserContext(agentDefinition, xt, toolUseContext)
      : { userContext: xt, managedInstructionsOnly: !1 },
    Bt = narrowerMode(spawnMode, permissionMode),
    Lt = Bt ?? hasHookForEvent_2(agentDefinition, permissionMode),
    ys,
    gn;
  function hs(P) {
    if (P === ys && gn) return gn;
    ys = P;
    let se = P,
      agentPermissionMode = agentDefinition.permissionMode,
      lt = Bt !== void 0 && !isWebFetchAgent(agentDefinition) && narrowerMode(Bt, P.mode) === void 0,
      re = Bt ?? (spawnMode === "bubble" ? void 0 : spawnMode) ?? agentPermissionMode,
      Rt =
        P.mode === "plan" &&
        !isTeammate &&
        (lt || (!Bt && re !== void 0 && re !== "plan" && re !== "bubble"));
    if (Lt && !lt && (Bt || !I_r(P.mode) || (isTeammate && (P.mode === "plan" || Lt === "plan")))) {
      let rt = Lt,
        Ut = isRestrictedPersonalAgent(agentDefinition) && narrowerMode(Lt, P.mode) === void 0;
      if (
        !Bt &&
        (Ut ||
          (settingsGrantsConfined() && (Lt === "bypassPermissions" || Lt === "acceptEdits" || Lt === "auto")))
      )
        (logForDebugging(
          Ut
            ? `Agent '${agentDefinition.agentType}' asks for permission mode ${Lt} in your own agent file. This session doesn't let your own agents widen their permission mode (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so it runs in '${P.mode}'.`
            : `Subagent declared permissionMode: ${Lt} inside a confined evaluation run; keeping parent mode '${P.mode}'.`,
          { level: "warn" },
        ),
          (rt = P.mode));
      else if (Lt === "bubble" && (P.mode === "plan" || P.mode === "dontAsk")) rt = P.mode;
      else if (Lt === "bypassPermissions" && !isBypassPermissionsAuthorized(P)) {
        if (((rt = P.mode), rt !== "bypassPermissions"))
          logForDebugging(
            `Subagent ${Bt ? "spawn-time permission mode" : "declared permissionMode"} bypassPermissions is not authorized by this session (parent not in bypass mode, bypass policy-disabled, session --restricted, or not a contained no-internet environment); keeping parent mode '${P.mode}'.`,
            { level: "warn" },
          );
      } else if (!Bt) rt = fallbackFromUnavailableAutoMode(Lt, P.mode, resolvedAgentModel);
      se = withClassifiedWebCalls(se, rt);
    }
    if (se.mode === "plan" && (isTeammate || (re !== void 0 && re !== "bubble")))
      se = { ...se, isBypassPermissionsModeAvailable: !1 };
    let Jt = toolUseContext.requestDialog !== void 0,
      qt = getIsNonInteractiveSession() && zue(getPermissionPromptToolName()),
      $e =
        (Rt && (re === "dontAsk" || agentPermissionMode === "dontAsk")) ||
        (canShowPermissionPrompts !== void 0
          ? !canShowPermissionPrompts
          : Lt === "bubble" || Jt || qt
            ? !1
            : isAsync);
    if ($e) se = { ...se, shouldAvoidPermissionPrompts: !0 };
    if (isAsync && !$e) se = { ...se, awaitAutomatedChecksBeforeDialog: !0 };
    if (allowedTools !== void 0)
      se = {
        ...se,
        alwaysAllowRules: {
          cliArg: P.alwaysAllowRules.cliArg,
          ...(P.alwaysAllowRules.mcpServerPolicy && { mcpServerPolicy: P.alwaysAllowRules.mcpServerPolicy }),
          session: [...allowedTools],
        },
      };
    if (
      ((se = withAgentDisallowedTools(se, agentDefinition)),
      worktreePath &&
        !se.blockWritesOutsideWorkingDirectories &&
        !se.additionalWorkingDirectories.has(worktreePath))
    )
      se = {
        ...se,
        additionalWorkingDirectories: new Map([
          ...se.additionalWorkingDirectories,
          [worktreePath, { path: worktreePath, source: "session" }],
        ]),
      };
    return ((gn = se), se);
  }
  let agentGetAppState = () => {
      let state = toolUseContext.getAppState(),
        se = hs(state.toolPermissionContext);
      if (se === state.toolPermissionContext) return state;
      return { ...state, toolPermissionContext: se };
    },
    Ts = [
      { kind: "model", mainLoopModel: resolvedAgentModel },
      ...(agentDefinition.effort !== void 0 ? [{ kind: "effort", effort: agentDefinition.effort }] : []),
    ],
    agentDepth = getAgentDepth(override?.agentContext ?? toolUseContext.agentContext),
    ro = bN(toolUseContext),
    Ss =
      toolUseContext.memoryCaller ??
      tZs({ isTeammate: isTeammate, isBackground: requestShape === "background" }),
    resolvedAgentTools = useExactTools
      ? void 0
      : resolveAgentTools(
          agentDefinition,
          webFetchReadmissionAllowed
            ? withWebFetchToolForAgent(agentDefinition, availableTools, He, {
                depth: agentDepth,
                activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
              })
            : availableTools,
          requestShape === "background",
          !1,
          isTeammate,
          agentDepth,
          ro.mode,
        ),
    ep = !1,
    agentTools = resolvedAgentTools?.resolvedTools ?? availableTools,
    ks = resolvedAgentTools ? agentDefinition : override?.agentToolScope,
    agentSystemPromptBlocks = override?.systemPrompt
      ? override.systemPrompt
      : asSystemPrompt(
          await getAgentSystemPrompt(
            agentDefinition,
            toolUseContext,
            resolvedAgentModel,
            totalTokensReminderBudget,
          ),
        ),
    Wi =
      !useExactTools &&
      !override?.isolatedContext &&
      isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT) &&
      toolUseContext.options.appendSubagentSystemPrompt
        ? toolUseContext.options.appendSubagentSystemPrompt
        : void 0,
    yn =
      !useExactTools &&
      !override?.isolatedContext &&
      !isWebFetchAgent(agentDefinition) &&
      !env.CLAUDE_CODE_MEMORY_SUBAGENT_APPEND,
    Ms = yn ? nZs(ro) : void 0,
    vs = yn && !ro.serverPending,
    filtered = [Wi, Ms].filter((P) => P !== void 0),
    systemPromptWithAppend =
      filtered.length === 0
        ? agentSystemPromptBlocks
        : asSystemPrompt([...agentSystemPromptBlocks, ...filtered]),
    en = {
      customSystemPrompt: toolUseContext.options.customSystemPrompt,
      appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
      systemPromptSnapshot:
        env.CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT && !useExactTools
          ? !0
          : toolUseContext.options.systemPromptSnapshot,
    },
    Ao = recordedUuids !== void 0 && recordedUuids.size > 0,
    io = [],
    hn = uniq(agentDefinition.skills ?? []),
    sliced = hn.slice(0, MAX_PRELOADED_SKILLS);
  if (hn.length > MAX_PRELOADED_SKILLS)
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Warning: the skills list has ${hn.length} different names; only the first ${MAX_PRELOADED_SKILLS} are preloaded`,
      { level: "warn" },
    );
  let { hookContextCarried: hookContextCarried, carriedPreloads: carriedPreloads } = Ao
      ? await scanCarriedSubagentContext(initialMessages, sliced)
      : { hookContextCarried: !1, carriedPreloads: new Set() },
    _n = [];
  try {
    let P = override?.agentContext ?? toolUseContext.agentContext,
      se = isDelegatedObservationContext(P)
        ? []
        : executeSubagentStartHooks(
            toolUseContext,
            agentId,
            agentDefinition.agentType,
            agentAbortController.signal,
            void 0,
            toolUseContext.sessionHooksRegistry,
            P,
            { managedHooksOnly: isWebFetchAgent(agentDefinition) },
          );
    for await (let xe of se) {
      let message = xe.message;
      if (
        message?.type === "attachment" &&
        isLoggableMessage(message) &&
        message.attachment.type !== "hook_blocking_error" &&
        !override?.isolatedContext
      )
        (initialMessages.push(message), io.push(message));
      if (xe.blockingError && !override?.isolatedContext) {
        let re = getNonBlockableHookErrorMessage(
          "SubagentStart",
          xe.blockingError,
          `SubagentStart:${agentDefinition.agentType}`,
        );
        (initialMessages.push(re), io.push(re));
      }
      if (xe.additionalContexts && xe.additionalContexts.length > 0) _n.push(...xe.additionalContexts);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("SubagentStart hooks cancelled (control stream closed)");
  }
  if (_n.length > 0 && !override?.isolatedContext && !hookContextCarried) {
    let P = createAttachmentMessage({
      type: "hook_additional_context",
      content: _n,
      hookName: "SubagentStart",
      toolUseID: randomUUID_3(),
      hookEvent: "SubagentStart",
    });
    (initialMessages.push(P), io.push(P));
  }
  if (vs && ro.mode !== "none" && Ao)
    insertCoworkMemoryContexts(toolUseContext.session.host, initialMessages);
  let xs = yn ? getStaleMemoryContextAttachment(toolUseContext.session.host, Us(initialMessages)) : void 0;
  if (xs !== void 0) {
    let P = createAttachmentMessage(xs);
    (initialMessages.push(P), io.push(P));
  }
  let on = vs
    ? coworkMemoryContextMode(
        toolUseContext.session.host,
        getLatestCoworkMemoryVersion(Us(initialMessages)),
        ro.mode === "none",
      )
    : void 0;
  if (on !== void 0) {
    let P = createAttachmentMessage(on);
    (initialMessages.push(P), io.push(P));
    let se = buildAnchorAttachment(on);
    if (se !== void 0) {
      let contextMessage = createAttachmentMessage(se);
      (initialMessages.push(contextMessage), io.push(contextMessage));
    }
  }
  let Gi = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(agentDefinition.source);
  if ((toolUseContext.sessionHooksRegistry.clear(agentId), hasFrontmatterHooks(agentDefinition.hooks) && Gi))
    if (isAgentDefinitionTrusted(agentDefinition))
      registerFrontmatterHooks(
        toolUseContext.sessionHooksRegistry,
        agentId,
        agentDefinition.hooks,
        `agent '${agentDefinition.agentType}'`,
        !0,
        isRestrictedPersonalAgent(agentDefinition),
        yyt(agentDefinition.source),
        agentDefinition.source === "plugin" ? agentDefinition.plugin : void 0,
      );
    else checkAgentOriginTrust(agentDefinition, "subagent");
  let {
      clients: clients,
      agentClients: agentClients,
      tools: tools,
      cleanup: cleanup,
    } = await initializeAgentMcpServers(
      agentDefinition,
      toolUseContext.options.mcpClients,
      onMcpServersBlocked,
      toolUseContext.storageV5,
      toolUseContext.credentials,
    ),
    { isToolDisallowed: isToolDisallowed } = buildDisallowedToolsFilter(agentDefinition.disallowedTools),
    filtered_2 = warnMcpToolNameTooLong(tools).filter((P) => !isToolDisallowed(P) && !Y2t(P, ro.mode)),
    kt = filtered_2.length > 0 ? Ji([...agentTools, ...filtered_2], "name") : agentTools,
    Ps = count(availableTools, (P) => P.mcpInfo?.accountMemoryServer === !0);
  if (Ps > 0)
    logEvent("tengu_subagent_memory_tools", {
      mode: fromEnum(ro.mode),
      mode_source: fromEnum(ro.source),
      marked_as: fromEnum(Ss),
      parent_tools: Ps,
      kept_tools: count(kt, (P) => P.mcpInfo?.accountMemoryServer === !0),
      exact_tools: useExactTools ?? !1,
      note_appended: Ms !== void 0,
      block_attached: on?.content != null,
    });
  if (kt.length === 0) {
    let P = resolvedAgentTools?.invalidTools ?? [],
      se = resolvedAgentTools?.unavailableTools ?? [],
      filtered = (resolvedAgentTools?.validTools ?? []).filter((Rt) => !isToolDisallowed({ name: Rt })),
      joined = [
        P.length ? `unrecognized [${P.join(", ")}]` : "",
        se.length ? `not available to subagents [${se.join(", ")}]` : "",
        filtered.length ? `recognized but matched no tools in this session [${filtered.join(", ")}]` : "",
      ]
        .filter(Boolean)
        .join("; "),
      re =
        joined !== "" &&
        resolvedAgentTools !== void 0 &&
        !resolvedAgentTools.hasWildcard &&
        availableTools.length > 0 &&
        !Ao;
    if (
      (logEvent("tengu_subagent_zero_tools", {
        isBuiltIn: agentDefinition.source === "built-in",
        invalidCount: P.length,
        unavailableCount: se.length,
        validButEmptyCount: filtered.length,
        availablePoolSize: availableTools.length,
        hadWildcard: resolvedAgentTools?.hasWildcard ?? !1,
        isContinuation: Ao,
        refused: re,
        isAsync: isAsync,
      }),
      re)
    )
      throw (
        logFeatureBad("subagent_tool_resolution", "zero_tools_refused", {
          invalid_count: P.length,
          unavailable_count: se.length,
          is_async: isAsync,
        }),
        await cleanup(),
        toolUseContext.sessionHooksRegistry.clear(agentId),
        clearAgentTranscriptSubdir(agentId),
        xqe(agentId),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Agent '${agentDefinition.agentType}' would be spawned with zero tools \u2014 refusing. ` +
            `Its tools list resolved to nothing: ${joined}. Fix the agent's tools frontmatter or pass a different subagent_type.`,
          "subagent zero-tool spawn refused",
        )
      );
  }
  if (resolvedAgentTools !== void 0) {
    let P = count(
        resolvedAgentTools.unavailableTools,
        (xe) => !isToolDisallowed({ name: permissionRuleValueFromString(xe).toolName }),
      ),
      se = {
        agent_depth: agentDepth,
        spawn_depth_cap: getMaxSubagentSpawnDepth(),
        is_async: isAsync,
        is_continuation: Ao,
        invalid_count: resolvedAgentTools.invalidTools.length,
        self_disallowed_overlap_count: resolvedAgentTools.unavailableTools.length - P,
      };
    if (resolvedAgentTools.declaredAgentToolWithheld || P > 0)
      logFeatureSad(
        "subagent_tool_resolution",
        resolvedAgentTools.declaredAgentToolWithheld
          ? "declared_agent_withheld"
          : "declared_tools_unavailable",
        { ...se, unavailable_count: P },
      );
    else
      logFeatureOk("subagent_tool_resolution", {
        ...se,
        agent_tool_removed_by_depth: resolvedAgentTools.agentToolRemovedByDepth === !0,
        has_wildcard: resolvedAgentTools.hasWildcard,
      });
  }
  let any = kt.some((P) => toolMatchesName(P, SUBAGENTHANDBACK) && P !== handbackTool),
    Xi = !1,
    uo =
      handbackOptIn === !0 &&
      !useExactTools &&
      !requiresStructuredOutput &&
      handbackTool !== void 0 &&
      !any &&
      PZo(He) &&
      !Xi &&
      hs(He).mode === "auto",
    Qi = uo
      ? void 0
      : handbackOptIn !== !0
        ? "no_opt_in"
        : useExactTools
          ? "exact_tools"
          : requiresStructuredOutput
            ? "schema"
            : handbackTool === void 0
              ? "no_tool"
              : any
                ? "name_taken"
                : He.mode !== "auto"
                  ? "spawner_mode"
                  : !PZo(He)
                    ? "switched_off"
                    : "child_mode";
  if ((recordHandbackContract(agentId, uo, Qi), uo && !kt.includes(handbackTool))) kt = [...kt, handbackTool];
  let Mn =
    !useExactTools && (agentDefinition.tools ?? ["*"]).some((P) => P === "*" || mcpInfoFromString(P) !== null)
      ? assembleAvailableTools
      : void 0;
  try {
    let filtered = sliced.filter((se) => !carriedPreloads.has(se));
    if (filtered.length > 0) {
      let se = getHeldBackSyncedPlugins(),
        xe = Z5(
          withNamedFolderYieldsRestored(
            await getSkillToolCommands(getProjectRootOrNull(), toolUseContext.storageV5, se),
          ),
          toolUseContext.getAppState().mcp.commands,
        ),
        lt = await getHiddenSyncedSkills(getProjectRootOrNull(), toolUseContext.storageV5, se),
        re = se.size === 0 ? [] : getSyncedSkillCommands(),
        Rt = (dt) =>
          re.some((_t) => [_t.name, ...(_t.aliases ?? [])].some((Zt) => foldName(Zt) === foldName(dt))) &&
          findCommand(dt, xe) === void 0,
        Jt = [],
        allSkills = await findRefusedSyncedCommands(xe),
        $e;
      for (let skillName of filtered) {
        let _t =
          findCommand(skillName, lt) === void 0 && !Rt(skillName)
            ? findSkillForAgent(skillName, xe, agentDefinition)
            : void 0;
        if (!_t) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' specified in frontmatter was not found`,
            { level: "warn" },
          );
          continue;
        }
        if (_t.type !== "prompt") {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is not a prompt-based skill`,
            { level: "warn" },
          );
          continue;
        }
        if (!isCommandEnabled(_t)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is disabled by policy`,
            { level: "warn" },
          );
          continue;
        }
        if (isKilledHostCatalogSkill(_t)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is turned off by the organization's Skills setting`,
            { level: "warn" },
          );
          continue;
        }
        if (isSyncedSkill(_t) && ($e ??= Gun())) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is an account-synced skill and skills sync is currently disabled (turned off or denied by policy)`,
            { level: "warn" },
          );
          continue;
        }
        let Zt = allSkills.get(_t);
        if (Zt !== void 0) {
          gse(_t, Zt);
          continue;
        }
        Jt.push({ skillName: skillName, skill: _t });
      }
      let { formatSkillLoadingMetadata: formatSkillLoadingMetadata } = await import("./chunk-jghdfw5c.js"),
        Ut = new PromptScopedAbortController(toolUseContext.abortController),
        Bo = await Promise.all(
          Jt.map(async ({ skillName: skillName, skill: skill }) => {
            let Zt = [],
              rn = await applySkillPromptHooks(
                skillName,
                await skill.getPromptForCommand("", {
                  ...toolUseContext,
                  abortController: Ut,
                  promptShellHandOff: Zt,
                  session: ut,
                  options: { ...toolUseContext.options, isSkillPreload: !0, tools: kt },
                }),
                skill,
              );
            return { skillName: skillName, skill: skill, content: rn, promptShellHandOff: Zt };
          }),
        ).catch((dt) => {
          throw (Ut.abort(), dt);
        });
      for (let {
        skillName: skillName,
        skill: skill,
        content: content,
        promptShellHandOff: promptShellHandOff,
      } of Bo) {
        (logForDebugging(`[Agent: ${agentDefinition.agentType}] Preloaded skill '${skillName}'`),
          ci(skill, agentId, builtInCommandNames().has(skill.name)));
        let metadata = formatSkillLoadingMetadata(skillName, skill.progressMessage),
          zs = createUserMessage({
            content: [{ type: "text", text: metadata }, ...content],
            isMeta: !0,
            ...(promptShellHandOff.length > 0 && {
              promptShellHandOff: { agentId: agentId, commands: promptShellHandOff },
            }),
          });
        (initialMessages.push(zs), io.push(zs));
      }
    }
  } catch (error) {
    throw (await cleanup(), error);
  }
  let ao =
      stickyBetas ??
      (useExactTools
        ? forkContextMessages !== void 0
          ? cloneStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())
          : Qun(eLi(forkStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())))
        : createStickyBetaLatches()),
    Yt = [];
  if (!useExactTools || forkContextMessages === void 0) {
    let P = Us(initialMessages);
    if (!ao.declaredToolsDecided)
      try {
        (seedWireShapeFromRecord(ao, j_e(initialMessages, en)?.wireShape, resolvedAgentModel),
          mergeNameOnlyAnnouncements(ao, recordedDeferredTools(P)));
      } catch (error) {
        logError(error);
      }
    let se = getToolPermissionContext({
      getAppState: agentGetAppState,
      permissionLayers: [...(toolUseContext.permissionLayers ?? []), ...Ts],
    });
    for (let xe of await getDeferredToolsDeltaAttachments(
      kt,
      resolvedAgentModel,
      initialMessages,
      { callSite: "attachments_subagent", querySource: querySource },
      void 0,
      void 0,
      void 0,
      void 0,
      getDeclaredToolSource(ao, P, en, kt, se),
      buildDeferredToolsLatchContextFrom(
        ao,
        Mn !== void 0,
        se,
        toolUseContext.options.agentDefinitions,
        querySource,
      ),
      void 0,
      en,
    )) {
      let lt = createAttachmentMessage(xe);
      (initialMessages.push(lt), Yt.push(lt));
    }
  }
  for (let P of getSandboxInstructionsAttachments(kt, initialMessages)) {
    let se = createAttachmentMessage(P);
    (initialMessages.push(se), Yt.push(se));
  }
  if (
    !useExactTools &&
    !Ao &&
    hasSendMessageTool(kt) &&
    !initialMessages.some(
      (P) =>
        P.type === "user" &&
        P.isMeta === !0 &&
        typeof P.message.content === "string" &&
        P.message.content.includes(Si),
    )
  ) {
    let sorted = [...toolUseContext.getAppState().agentNameRegistry]
      .filter(([, se]) => se !== agentId)
      .map(([se]) => se)
      .sort();
    if (sorted.length > 0) {
      let se = escapeXmlText([MAIN, ...sorted].join(", ")),
        xe = createUserMessage({
          content: wrapInSystemReminder(`${Si}({to: name, message}): ${se}.`),
          isMeta: !0,
        });
      (initialMessages.push(xe), Yt.push(xe));
    }
  }
  let Zi = toolUseContext.taskRegistry.get(agentId);
  if (handbackOptIn === !0 && (isSendMessageHandbackEnabled() || Fgi(Zi) !== void 0))
    toolUseContext.taskRegistry.update(agentId, (P) => ({
      ...P,
      ...resolveHandbackRecipient({
        contract: uo,
        registered: { recipient: P.handbackRecipient },
        callerInbox: P.parentAgentId ?? mainAgentId(),
        resumerInbox: toolUseContext.agentId ?? mainAgentId(),
        inboxReadable: (se) => lXn(se, toolUseContext.taskRegistry),
      }),
    }));
  let Ds = findLatestHandbackReminder(initialMessages);
  if (uo && Ds !== "reminder") {
    let P = createUserMessage({
      content: wrapInSystemReminder(buildHandbackInstruction(hasSendMessageTool(kt))),
      isMeta: !0,
    });
    (initialMessages.push(P), Yt.push(P));
  } else if (!uo && handbackOptIn === !0 && Ds === "reminder") {
    let P = createUserMessage({ content: wrapInSystemReminder(handbackCountermandText()), isMeta: !0 });
    (initialMessages.push(P), Yt.push(P));
  }
  let vn = {
    runQuery: toolUseContext.options.runQuery,
    isNonInteractiveSession: useExactTools
      ? toolUseContext.options.isNonInteractiveSession
      : (requestNonInteractive ??
        spawnRequestShape(requestShape === "background", toolUseContext.options.isNonInteractiveSession)
          .requestNonInteractive),
    ...en,
    ...(override?.isolatedContext && { isolatedContext: !0 }),
    ...((agentDefinition.agentType === "Explore" || agentDefinition.agentType === "Plan") && {
      omitGitStatus: !0,
    }),
    ...(managedInstructionsOnly && { managedInstructionsOnly: !0 }),
    ...{},
    appendSubagentSystemPrompt: toolUseContext.options.appendSubagentSystemPrompt,
    spawnedBySkill: spawnedBySkill,
    spawnedByForkedSkill: spawnedByForkedSkill,
    tools: kt,
    toolCatalog: toolUseContext.options.toolCatalog,
    commands: [],
    debug: toolUseContext.options.debug,
    verbose: toolUseContext.options.verbose,
    mainLoopModel: resolvedAgentModel,
    fallbackModel: toolUseContext.options.fallbackModel,
    thinkingConfig: applySubagentThinkingDisplay(toolUseContext.options.thinkingConfig, {
      useExactTools: useExactTools ?? !1,
      forwardSubagentText: toolUseContext.options.forwardSubagentText ?? !1,
      isAsync: requestShape === "background",
      isNonInteractiveSession: getIsNonInteractiveSession(),
      sessionDisplayExplicit: getThinkingDisplayExplicit(),
      isRemoteWorker:
        env.CLAUDE_CODE_REMOTE === !0 ||
        Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
        Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE),
      isChatOriginCoworkSession: isClaudeAiChatCowork(),
    }),
    forwardSubagentText: toolUseContext.options.forwardSubagentText,
    refreshTools:
      Mn !== void 0
        ? createGrowingToolList(
            kt,
            () => toolUseContext.getAppState().mcp.tools,
            () => toolUseContext.options.refreshTools?.() ?? toolUseContext.options.tools,
            (P) => {
              let se = bN(toolUseContext);
              return resolveAgentTools(
                agentDefinition,
                Mn(P),
                requestShape === "background",
                !1,
                isTeammate,
                agentDepth,
                se.serverPending ? "none" : se.mode,
              ).resolvedTools;
            },
          )
        : void 0,
    mcpClients: clients,
    refreshMcpClients: toolUseContext.options.refreshMcpClients
      ? () => {
          let refreshMcpClients = toolUseContext.options.refreshMcpClients();
          return agentClients.length > 0 ? [...refreshMcpClients, ...agentClients] : refreshMcpClients;
        }
      : void 0,
    mcpResources: toolUseContext.options.mcpResources,
    agentDefinitions: toolUseContext.options.agentDefinitions,
    messageClientPlatform: toolUseContext.options.messageClientPlatform,
    messageInboundOrigin: toolUseContext.options.messageInboundOrigin,
    toolAliases: toolUseContext.options.toolAliases,
    autoCompactWindow:
      agentDefinition.agentType === FORK && isBuiltInAgent(agentDefinition)
        ? toolUseContext.options.autoCompactWindow
        : kLr(toolUseContext.options.autoCompactWindow, agentDefinition.autoCompactWindow),
    maxBudgetUsd: toolUseContext.options.maxBudgetUsd,
    ...(totalTokensReminderBudget === void 0 && override?.parentSystemPrompt
      ? {
          totalTokensReminderBudget: toolUseContext.options.totalTokensReminderBudget,
          isTotalTokensReminderBudgetOnTopOfStart:
            toolUseContext.options.isTotalTokensReminderBudgetOnTopOfStart,
        }
      : {
          totalTokensReminderBudget: totalTokensReminderBudget,
          isTotalTokensReminderBudgetOnTopOfStart: isTotalTokensReminderBudgetOnTopOfStart,
        }),
    fastMode: toolUseContext.options.fastMode,
    cacheBreakerPhrase: toolUseContext.options.cacheBreakerPhrase,
    activeGoal: toolUseContext.options.activeGoal,
    ultraplanSessionUrl: toolUseContext.options.ultraplanSessionUrl,
    ...(useExactTools && { querySource: querySource }),
    requiresStructuredOutput: requiresStructuredOutput,
    ...(structuredOutputIsHandback === !0 && { structuredOutputIsHandback: !0 }),
    ...(uo && { requiresHandback: !0 }),
  };
  onToolPool?.(() => vn.refreshTools?.() ?? kt);
  let subagentContext = createSubagentContext(toolUseContext, {
    options: vn,
    session: ut,
    agentId: agentId,
    isBackgroundAgent:
      isAsync &&
      !(override?.agentContext?.agentType === "subagent" && override.agentContext.isBackgroundAgent === !1),
    memoryCaller: Ss,
    agentType: agentDefinition.agentType,
    agentContext: override?.agentContext,
    requireCanUseTool: override?.requireCanUseTool,
    spawnedByWorkflowRunId: spawnedByWorkflowRunId,
    teammateContext: teammateContext,
    messages: initialMessages,
    inheritedVerifiedHumanTurns:
      forkContextMessages === toolUseContext.messages ? void 0 : buildVerifiedHumanTurns(toolUseContext),
    inheritedMcpSkillMessages:
      forkContextMessages === toolUseContext.messages
        ? void 0
        : [...(toolUseContext.inheritedMcpSkillMessages ?? []), ...A4s(toolUseContext.messages)],
    readFileState: gt,
    abortController: agentAbortController,
    getAppState: agentGetAppState,
    permissionLayers: Ts,
    primitiveToolGrant: ks === void 0 ? void 0 : resolveAgentToolNames(ks),
    shareSetAppState: !isAsync,
    shareFileHistory: override?.shareFileHistory,
    criticalSystemReminder_EXPERIMENTAL: agentDefinition.criticalSystemReminder_EXPERIMENTAL,
    contentReplacementState: contentReplacementState,
  });
  if (override?.onRetryStatus) subagentContext.onRetryStatus = override.onRetryStatus;
  if (override?.subscribeRetryWake) subagentContext.subscribeRetryWake = override.subscribeRetryWake;
  if (worktreePath) subagentContext.agentWorktree = worktreePath;
  for (let P of await getEnvironmentChangeAttachments(subagentContext, initialMessages)) {
    let se = createAttachmentMessage(P);
    (initialMessages.push(se), Yt.push(se));
  }
  for (let P of await getSkillListingAttachmentsLazy(subagentContext, Us(initialMessages)).catch(
    (se) => (
      logForDebugging(
        `[Agent: ${agentDefinition.agentType}] Failed to compute skill listing attachment: ${se}`,
        { level: "error" },
      ),
      []
    ),
  )) {
    let se = createAttachmentMessage(P);
    (initialMessages.push(se), Yt.push(se));
  }
  let Ns =
    isRemoteToolForwardingSwitchOn() &&
    !override?.isolatedContext &&
    !isDelegatedObservationContext(subagentContext.agentContext)
      ? XVe().remote?.noticeAttachment
      : void 0;
  if (Ns !== void 0)
    try {
      for (let P of await Ns(subagentContext, initialMessages, "attachment_scan")) {
        let se = createAttachmentMessage(P);
        (initialMessages.push(se), Yt.push(se));
      }
    } catch (error) {
      if (isAbortError(error)) logForDebugging("Attached-machines notice skipped (spawn aborted)");
      else logError(error);
    }
  if (preserveToolUseResults) subagentContext.preserveToolUseResults = !0;
  if (persistedToolResultFiles) subagentContext.persistedToolResultFiles = persistedToolResultFiles;
  let yt = null,
    co = null;
  subagentContext.stickyBetas = ao;
  let ea = Jd({
    stickyBetas: stickyBetas,
    useExactTools: useExactTools,
    name: Ke,
    recordedUuids: recordedUuids,
  });
  if (onCacheSafeParams) {
    let P = [...initialMessages];
    ((yt = P),
      onCacheSafeParams(
        {
          systemPrompt: systemPromptWithAppend,
          userContext: userContext,
          systemContext: Be,
          toolUseContext: subagentContext,
          forkContextMessages: initialMessages,
          advisorModel: subagentContext.getAdvisorSetting(),
          stickyBetas: ao,
          agentCacheTtlOverride: agentDefinition.cacheTtl,
        },
        () => P,
      ));
  }
  if (compactTranscriptUnavailable) subagentContext.compactTranscriptUnavailable = !0;
  let fo = initialMessages,
    Cn = null;
  if (recordedUuids !== void 0) {
    let lastIndex = initialMessages.findLastIndex((xe) => recordedUuids.has(xe.uuid));
    fo = initialMessages.slice(lastIndex + 1);
    let lastIndex_2 = initialMessages.findLastIndex(
      (xe, lt) => lt <= lastIndex && recordedUuids.has(xe.uuid) && !OB(xe.uuid),
    );
    Cn = lastIndex_2 >= 0 ? initialMessages[lastIndex_2].uuid : null;
  } else if (
    forkContextMessages !== void 0 &&
    forkContextMessages === toolUseContext.messages &&
    toolUseContext.agentId === void 0
  ) {
    let P = Kt.findLast((se) => isLoggableMessage(se) && !OB(se.uuid))?.uuid;
    if (P !== void 0)
      ((fo = initialMessages.slice(Kt.length)),
        (subagentContext.compactTranscriptUnavailable = !0),
        recordForkContextRef(
          { agentId: agentId, parentSessionId: getSessionId(), parentLastUuid: P, contextLength: Kt.length },
          toolUseContext.storageV5,
        ).catch(logForkContextRefFailure));
  }
  let Bs = initialMessages.length - fo.length,
    max = Math.max(Bs, Kt.length),
    splice = initialMessages.splice(max);
  yt?.splice(max);
  let js = Ebe({
    agentId: agentId,
    keep: (P) => {
      (initialMessages.push(...P), yt?.push(...P));
    },
    rows: () => initialMessages,
    isHookable: it,
  });
  for (let P of splice) {
    let se = P.type === "user" && P.isMeta !== !0 && promptMessages.some((xe) => xe.uuid === P.uuid);
    await appendRowsWithHooks(js, [P], se ? { door: "prompt" } : {});
  }
  ((fo = initialMessages.slice(Bs)),
    recordSidechainTranscript(fo, agentId, Cn, toolUseContext.storageV5).catch(is));
  let Po = recordedUuids !== void 0 || extraMetadata !== void 0;
  if (!Po && !worktreePath && toolUseContext.agentWorktree) Ogr(agentId);
  if (!Po) {
    if (
      (recordSpawnProvenance(agentId, toolUseContext),
      isUnknownPluginSpawnedAgent({
        hookCaller: toolUseContext.hookCaller,
        pluginUnnamed: toolUseContext.pluginUnnamed,
      }))
    )
      B1o(agentId);
    if (agentDefinition.agentType === FORK && isBuiltInAgent(agentDefinition))
      recordForwardedTurnsDelivered(
        { agentId: agentId, deliveringLoop: toolUseContext.agentId },
        forkContextMessages ?? [],
      );
  }
  persistAgentMetadata(
    agentId,
    Po,
    {
      agentType: agentDefinition.agentType,
      ...(agentDefinition.agentType === FORK && { isFork: isBuiltInAgent(agentDefinition) }),
      isBuiltIn: isBuiltInAgent(agentDefinition),
      ...(worktreePath && { worktreePath: worktreePath }),
      ...(!Po &&
        !worktreePath &&
        toolUseContext.agentWorktree && {
          inheritedWorktreePath: toolUseContext.agentWorktree,
          spawnedWithWorktree: !0,
        }),
      ...(worktreePath && { spawnedWithWorktree: !0 }),
      ...(worktreePath && worktreeBranch && { worktreeBranch: worktreeBranch }),
      ...(isHookOrPluginSteered(toolUseContext) && { pluginSteered: !0 }),
      ...(cwd && { cwd: cwd }),
      ...(launchedWithDefaults && { launchedWithDefaults: !0 }),
      ...(Bt && { spawnMode: Bt }),
      ...(description && { description: description }),
      ...(Ke && { name: Ke }),
      ...(workflowPhase && { workflowPhase: workflowPhase }),
      ...(toolUseId && { toolUseId: toolUseId }),
      ...!1,
      ...(toolUseContext.agentId && { parentAgentId: toolUseContext.agentId }),
      ...(override?.agentContext !== void 0 && { spawnDepth: getAgentDepth(override.agentContext) }),
      requestShape: requestShape,
      requestNonInteractive: vn.isNonInteractiveSession,
      ...(model && { model: model }),
      ...(!model &&
        !Po &&
        toolUseContext.agentId &&
        resolvedAgentModel === parentModel &&
        parentModel !== getMainLoopModel() && { model: parentModel }),
      ...(effort && { effort: effort }),
      ...extraMetadata,
    },
    toolUseContext.storageV5,
  ).catch(logAgentMetadataWriteFailure);
  let ko = new SidechainRecorder(
    {
      isLoggableMessage: isLoggableMessage,
      recordSidechainTranscript: recordSidechainTranscript,
      registerTranscriptExitDrain: registerTranscriptExitDrain,
      transcriptCursorEnd: transcriptCursorEnd,
    },
    agentId,
    fo.findLast(isLoggableMessage)?.uuid ?? Cn,
    recordedUuids,
    toolUseContext.storageV5,
    agentAbortController.signal,
  );
  if (recordedUuids) {
    for (let P of fo) if (isLoggableMessage(P)) recordedUuids.add(P.uuid);
  }
  let Io = !1,
    Ws = !1,
    No,
    Fo = [],
    Lo = 0,
    Uo = 0,
    En = 0,
    Rn = !1,
    bo = 0,
    nn = (P) => {
      let now = Date.now();
      if (!P && now - En < STREAM_TOKEN_ESTIMATE_THROTTLE_MS) return;
      let xe = Math.floor(Lo) - Uo;
      if (xe <= 0) return;
      ((En = now), (Uo += xe), onStreamTokenEstimate?.({ type: "tokens", estimatedTokensDelta: xe }));
    },
    oa = () => {
      if (Rn) {
        if (Uo > 0) onStreamTokenEstimate?.({ type: "tokens", estimatedTokensDelta: -Uo });
      } else onStreamTokenEstimate?.({ type: "response_start" });
      ((Lo = 0), (Uo = 0), (En = 0), (bo = 0), (Rn = !0));
    },
    na = () => {
      (nn(!0), (Rn = !1));
    },
    sa = {
      onSetStreamMode: (P) => Fo.push({ type: "spinner_mode", mode: P }),
      ...(onStreamTokenEstimate && {
        onUpdateLength: (P) => {
          ((Lo += P / 4), nn(!1));
        },
      }),
      onApiMetrics: (P) => {
        if (onStreamTokenEstimate) {
          if (P.type === "content_block_start") bo = 0;
          else if (P.type === "thinking_progress")
            ((bo += P.estimatedTokensDelta), (Lo += P.estimatedTokensDelta), nn(!1));
          else if (P.type === "thinking_signature") {
            let ceil = Math.ceil(P.chars / 4);
            if (ceil > bo) ((Lo += ceil - bo), (bo = ceil), nn(!1));
          }
        }
        if (P.type !== "start" && P.type !== "end") return;
        if (P.type === "start")
          ((No = randomUUID_3()),
            Fo.push({ type: "api_metrics", event: { type: "start", ttftMs: P.ttftMs, id: No } }));
        else if (No != null)
          (Fo.push({ type: "api_metrics", event: { type: "end", outputTokens: P.outputTokens, id: No } }),
            (No = void 0));
      },
    },
    ra = { isSubagent: !0 },
    Qt,
    Ks = [],
    qs = `isolation:${agentId}`,
    of = jjr.of(ut.host);
  of.set(agentId, void 0);
  try {
    if (worktreePath && isSameRepoWorktree(worktreePath, [getOriginalCwd(), getProjectRoot()]))
      registerSandboxWriteDirectory(worktreePath, qs);
    ((Oo = executeInSpan({
      agentId: agentId,
      agentType: agentDefinition.agentType,
      isBuiltIn: isBuiltInAgent(agentDefinition),
      parentAgentId: toolUseContext.agentId,
    })),
      await restoreResumedAgentBaseline(agentId, {
        resumed:
          override?.agentContext?.agentType === "subagent" &&
          override.agentContext.invocationKind === "resume",
        storageV5: toolUseContext.storageV5,
      }),
      yield* io,
      yield* Yt);
    using running = Mwt.running(
      agentId,
      Ebe({
        agentId: agentId,
        keep: (re) => {
          yt?.push(...re);
        },
        keepArrived: (re) => {
          (yt?.push(...re), ko.record(re));
        },
        rows: () => yt ?? initialMessages,
        isHookable: js.isHookable,
      }),
    );
    let se = {
        filterUnresolvedToolUses: normalizeMessagesForResume,
        normalizeMessagesForAPI: normalizeMessagesForAPI,
      },
      xe =
        waitingToolUse &&
        findWaitingToolCall(initialMessages, waitingToolUse.id, subagentContext.options.tools, se);
    if (xe !== void 0) yield xe.call;
    let lt = abortedToolResults.bind(null, waitingToolUse, se, subagentContext.options.runQuery);
    for await (let re of lt({
      messages: initialMessages,
      systemPrompt: systemPromptWithAppend,
      userContext: userContext,
      systemContext: Be,
      canUseTool: canUseTool,
      toolUseContext: subagentContext,
      querySource: querySource,
      forkOrigin: forkOrigin,
      spawnedBySkill: spawnedBySkill,
      maxTurns: maxTurns ?? agentDefinition.maxTurns,
      forkPointUuid: fe,
      fallbackModel: subagentContext.options.fallbackModel,
      stickyBetas: ao,
      evictCacheOnComplete: ea,
      agentCacheTtlOverride: agentDefinition.cacheTtl,
    })) {
      if ((onQueryProgress?.(), isStreamEvent(re))) {
        if (
          re.type === "stream_event" &&
          (re.event.type === "message_start" ||
            (re.event.type === "message_stop" && re.abandonedBlocks === void 0))
        )
          await ko.flush(!0);
        if (onStreamTokenEstimate && re.type === "stream_event") {
          if (re.event.type === "message_start") oa();
          else if (re.event.type === "message_stop") na();
        }
        (handleMessageFromStream(re, sa, ra), yield* Fo, (Fo.length = 0));
        continue;
      }
      if (
        (re.type === "attachment" &&
          "hookEvent" in re.attachment &&
          re.attachment.hookEvent === "SubagentStop") ||
        (re.type === "progress" && re.data?.type === "hook_progress" && re.data.hookEvent === "SubagentStop")
      )
        Io = !0;
      if (re.type === "system" && re.subtype === "api_error") {
        yield re;
        continue;
      }
      if (
        re.type === "system" &&
        (re.subtype === "model_refusal_fallback" || re.subtype === "model_fallback")
      ) {
        yield re;
        continue;
      }
      if (re.type === "set_in_progress_tool_use_ids") {
        if (re.op.action === "remove") yield re;
        continue;
      }
      if (re.type === "query_model_change") {
        ((jt = re.toModel), yield re);
        continue;
      }
      if (re.type === "attachment") {
        if (re.attachment.type === "nested_memory") Ks.push(re.attachment.path);
        if (yt) (yt.push(re), (co = applyPreservedMessages(yt, re, co)));
        if (re.attachment.type === "max_turns_reached") {
          if (
            ((Ws = !0),
            logForDebugging(
              `[Agent: ${agentDefinition.agentType}] Reached max turns limit (${re.attachment.maxTurns})`,
            ),
            !agentAbortController.signal.aborted)
          )
            (logEvent("tengu_agent_max_turns_reached", {
              query_source: agentTypeForTelemetry(querySource),
              is_built_in_agent: isBuiltInAgent(agentDefinition),
              max_turns: re.attachment.maxTurns,
              turn_count: re.attachment.turnCount,
              is_async: isAsync,
            }),
              yield re);
          break;
        }
        (await ko.record([re]), yield re);
        continue;
      }
      if (re.type === "tombstone") {
        if ((ko.forget(re.message.uuid), yt)) {
          let lastIndex = yt.findLastIndex((Jt) => Jt.uuid === re.message.uuid);
          if (lastIndex !== -1) yt.splice(lastIndex, 1);
        }
        continue;
      }
      if (isRecordableMessage(re)) {
        if (re.type !== "progress") {
          if ((Jo.saw(re), yt)) (yt.push(re), (co = applyPreservedMessages(yt, re, co)));
        }
        await ko.record([re]);
        let Rt = toolUseContext.taskRegistry.get(agentId),
          Jt = isLocalAgent(Rt) && Rt.isBackgrounded;
        if ((isAsync || Jt) && toolUseId) {
          let active = transportStateByHost.of(toolUseContext.session).active;
          if (active && (re.type === "assistant" || re.type === "user"))
            for (let message of normalizeMessages([re])) {
              let rt = createProgressMessage({
                toolUseID: `agent_${agentId}`,
                parentToolUseID: toolUseId,
                data: {
                  message: message,
                  type: "agent_progress",
                  prompt: "",
                  agentId: agentId,
                  agentType: agentDefinition.agentType,
                  isBuiltIn: isBuiltInAgent(agentDefinition),
                  resolvedModel: jt,
                  ...(description && { description: description }),
                },
              });
              for (let Ut of normalizeMessage(rt, subagentContext.options.refreshTools?.() ?? kt))
                active
                  .write(Ut)
                  .catch((err) =>
                    logForDebugging(`bg-subagent progress write failed: ${err}`, { level: "warn" }),
                  );
            }
          else if (
            active &&
            extractAgentIdsFromMessages_2(re) &&
            filterIncompleteToolCalls_2(toolUseContext, re)
          )
            for (let $e of normalizeMessage(re, subagentContext.options.refreshTools?.() ?? kt))
              active
                .write($e)
                .catch((prev) =>
                  logForDebugging(`bg-subagent nested progress write failed: ${prev}`, { level: "warn" }),
                );
        }
        yield re;
      }
    }
    if (((Io = !0), agentAbortController.signal.aborted)) {
      let re = of.get(agentId);
      throw unwrapAbortReason(agentAbortController.signal.reason) === "permission-stop"
        ? new AbortError(
            re !== void 0 ? buildAutoModeStoppedMessage(re) : buildAgentStoppedUnavailableMessage(),
          )
        : new AbortError();
    }
    if (isBuiltInAgent(agentDefinition) && agentDefinition.callback) agentDefinition.callback();
  } catch (error) {
    throw ((Qt = error), error);
  } finally {
    if (
      (of.delete(agentId),
      await ko.close(),
      Jo.ended({
        isAborted: agentAbortController.signal.aborted || (!Io && Qt === void 0),
        hasFailed: Qt !== void 0,
        report:
          getLatestAgentReportText(toolUseContext.taskRegistry.get(agentId), agentId, So) ??
          callerDeliveredReport?.(),
      }),
      yt && co)
    )
      (yt.push(...co.preserved), (co = null));
    getTaskRunState().killAgentMonitors ??= Ai;
    let P = toolUseContext.taskRegistry.get(agentId),
      se = toolUseContext.taskRegistry.get(agentId),
      xe =
        isAsync &&
        !(isLocalAgent(se) && se.isBackgrounded === !1) &&
        Io &&
        !agentAbortController.signal.aborted &&
        (aXn(agentId, toolUseContext.taskRegistry) ||
          hasRunningBackgroundWorkForAgent(agentId, toolUseContext.taskRegistry)),
      re = !1,
      Rt = [],
      Jt = () => {
        for (let $e of Rt)
          Promise.resolve()
            .then($e.run)
            .catch((rt) =>
              logForDebugging(`[runAgent cleanup] deferred stage '${$e.name}' failed: ${errorMessage(rt)}`),
            );
      },
      qt = [
        {
          name: "SubagentStop",
          run: async () => {
            if (Io) return;
            try {
              for await (let $e of executeStopHooks(
                void 0,
                void 0,
                5000,
                !1,
                agentId,
                subagentContext,
                void 0,
                agentDefinition.agentType,
              ));
            } catch (error) {
              logForDebugging(`[runAgent] SubagentStop on interrupted query failed: ${error}`);
            }
          },
        },
        { name: "mcp", deferredWhileParked: !0, run: () => cleanup() },
        {
          name: "sessionHooks",
          deferredWhileParked: !0,
          run: () => {
            if (agentDefinition.hooks) toolUseContext.sessionHooksRegistry.clear(agentId);
          },
        },
        {
          name: "promptCacheTracking",
          run: () => {
            if (isTeammate) {
              forgetClassifierCompaction(agentId);
              return;
            }
            ensureAgentDirectoryExists(agentId, !isTranscriptPersistenceDisabled(), toolUseContext.storageV5);
          },
        },
        {
          name: "tetherThreadState",
          run: () => {
            forgetAgentThread(agentId);
          },
        },
        {
          name: "propagateNestedMemory",
          run: () => {
            if (isCoordinatorMode_2() && antEnv.CLAUDE_CODE_COORDINATOR_PROPAGATE_NESTED_MEMORY) {
              let pendingNestedMemoryTriggers = toolUseContext.pendingNestedMemoryTriggers;
              if (!pendingNestedMemoryTriggers) {
                logForDebugging(
                  "propagateNestedMemory: parent context has no pendingNestedMemoryTriggers; skipping",
                );
                return;
              }
              for (let rt of Ks) {
                if (!["CLAUDE.md", "CLAUDE.local.md", ...NKe].includes(basename(rt))) continue;
                let Ut = mapWorktreePathToRepo(rt, worktreePath);
                if (Ut === null) continue;
                if (toolUseContext.readFileState.has(Ut)) continue;
                if (!pendingNestedMemoryTriggers.includes(Ut)) pendingNestedMemoryTriggers.push(Ut);
              }
            }
          },
        },
        { name: "readFileState", deferredWhileParked: !0, run: () => subagentContext.readFileState.clear() },
        {
          name: "initialMessages",
          run: () => {
            initialMessages.length = 0;
          },
        },
        {
          name: "liveMessages",
          run: () => {
            if (yt) yt.length = 0;
          },
        },
        { name: "perfetto", run: () => xqe(agentId) },
        {
          name: "otelSubagentSpan",
          run: () => {
            let aborted = agentAbortController.signal.aborted;
            endSubagentSpan(Oo, {
              success: Qt === void 0 && !aborted,
              ...(Qt !== void 0 &&
                !aborted && {
                  error: Qt instanceof Error ? Qt.message : String(Qt),
                  errorClass: classifyToolError(Qt),
                }),
            });
          },
        },
        { name: "transcriptSubdir", run: () => clearAgentTranscriptSubdir(agentId) },
        { name: "todos", run: () => toolUseContext.agentLifecycle.clearTodos(agentId) },
        {
          name: "sandboxWriteGrant",
          deferredWhileParked: !0,
          run: () => unregisterSandboxWriteDirectory(qs),
        },
        { name: "nonShellMonitors", keepaliveGated: !0, run: () => Ai(agentId, toolUseContext.taskRegistry) },
        { name: "shellTasks", keepaliveGated: !0, run: () => pi(agentId, toolUseContext.taskRegistry) },
      ];
    for (let $e of qt) {
      if (xe && $e.keepaliveGated) continue;
      if (re && $e.deferredWhileParked) {
        Rt.push($e);
        continue;
      }
      try {
        await $e.run();
      } catch (error) {
        logForDebugging(
          `[runAgent cleanup] stage '${$e.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
/**
 * 子代理退出时停止其非 shell 监视任务。
 */
//@ chunk-0h4e7gnq.js:118485-118511 layout
function Ai(e, n) {
  e1s(e, n);
}
/**
 * 本次派生是否为普通形态（无 stickyBetas/useExactTools/name/recordedUuids），决定完成后是否驱逐缓存。
 */
//@ chunk-0h4e7gnq.js:118511-118625 layout
function Jd({
  stickyBetas: stickyBetas,
  useExactTools: useExactTools,
  name: s,
  recordedUuids: recordedUuids,
}) {
  return stickyBetas === void 0 && !useExactTools && s === void 0 && recordedUuids === void 0;
}
//@ chunk-0h4e7gnq.js:118625-118977 facade-exports = countToolCallsSince (1)
function filterIncompleteToolCalls(e) {
  let n = new Set();
  for (let s of e)
    if (s?.type === "user") {
      let content = s.message.content;
      if (Array.isArray(content)) {
        for (let message of content)
          if (message.type === "tool_result" && message.tool_use_id) n.add(message.tool_use_id);
      }
    }
  return e.filter((s) => {
    if (s?.type === "assistant") {
      let content = s.message.content;
      if (Array.isArray(content))
        return !content.some((block) => block.type === "tool_use" && block.id && !n.has(block.id));
    }
    return !0;
  });
}
/**
 * 渲染代理系统提示词（含已加载的代理记忆）；失败时回退默认子代理提示词。
 */
//@ chunk-0h4e7gnq.js:118977-119175 fingerprint = getAgentSystemPrompt (0.746)
async function getAgentSystemPrompt(e, n, s, y) {
  try {
    let r = await readAgentMemoryScope(e, n.storageV5),
      agentPrompt = e.getSystemPrompt({ toolUseContext: n, primedAgentMemory: r });
    return await buildSubagentNotesSection(
      [isBuiltInAgent(e) ? applyPromptAblation(agentPrompt) : agentPrompt],
      s,
      y,
    );
  } catch (error) {
    return buildSubagentNotesSection([applyPromptAblation(DEFAULT_SUBAGENT_PROMPT)], s, y);
  }
}
//@ chunk-0h4e7gnq.js:119175-119361 file-local
function findSkillForAgent(skillName, allSkills, agentDefinition) {
  let y = findCommand(skillName, allSkills);
  if (y) return y;
  let filtered = allSkills.filter(isProjectScopedCommand),
    S = firstLineOf(agentDefinition.agentType, ":");
  if (S) {
    let k = findCommand(`${S}:${skillName}`, filtered);
    if (k) return k;
  }
  let qualifiedName = `:${skillName}`;
  return filtered.find((cmd) => cmd.name.endsWith(qualifiedName));
}
//@ chunk-0h4e7gnq.js:119361-119493 facade-exports
function spawnRequestShape(e, n) {
  return e
    ? { requestShape: "background", requestNonInteractive: !0 }
    : { requestShape: "foreground", requestNonInteractive: n };
}
//@ chunk-0h4e7gnq.js:119493-120116 facade-exports
async function clearWorktreeFromAgentMetadata({
  agentId: agentId,
  removedWorktreePath: removedWorktreePath,
  spawnMetadata: spawnMetadata,
  storageV5: storageV5,
}) {
  sTi(agentId);
  let r = await readAgentMetadata(agentId, storageV5).catch(
      makeSidecarReadFallback("clearWorktreeFromAgentMetadata"),
    ),
    S = r?.cwd && r.cwd !== removedWorktreePath ? r.cwd : void 0;
  await writeAgentMetadata(
    agentId,
    {
      ...spawnMetadata,
      ...(S && { cwd: S }),
      ...(r?.stoppedByUser && { stoppedByUser: !0 }),
      ...(r?.parentAgentId && { parentAgentId: r.parentAgentId }),
      ...(r?.pluginSteered === !0 && { pluginSteered: !0 }),
      ...(r?.finished === !0 && { finished: !0 }),
      ...((r?.requestShape === "foreground" || r?.requestShape === "background") && {
        requestShape: r.requestShape,
      }),
      ...(typeof r?.requestNonInteractive === "boolean" && {
        requestNonInteractive: r.requestNonInteractive,
      }),
      ...!1,
      worktreeCleanlyRemoved: !0,
    },
    storageV5,
  );
}
/**
 * 扫描子代理的初始消息：是否已带 SubagentStart hook 的附加上下文、哪些预载技能已在消息中（避免恢复/续接时重复注入）。
 */
//@ chunk-0h4e7gnq.js:120116-120602 sole-consumer
async function scanCarriedSubagentContext(e, n) {
  let { isSkillLoadingMetadata: isSkillLoadingMetadata } = await import("./chunk-jghdfw5c.js"),
    y = !1,
    r = new Set();
  for (let S of Us(e)) {
    if (S.type === "attachment") {
      let { attachment: attachment } = S;
      if (attachment.type === "hook_additional_context" && attachment.hookEvent === "SubagentStart") y = !0;
    } else if (S.type === "user" && S.isMeta === !0 && typeof S.message.content !== "string") {
      let h = S.message.content[0];
      if (h?.type === "text") {
        for (let k of n) if (isSkillLoadingMetadata(h.text, k)) r.add(k);
      }
    }
    if (y && r.size === n.length) break;
  }
  return { hookContextCarried: y, carriedPreloads: r };
}
/**
 * 计算子代理的 userContext：内建或策略来源的代理去掉 CLAUDE.md；其它代理按会话取托管的 CLAUDE.md 覆盖，返回 {userContext, managedInstructionsOnly}。
 */
//@ chunk-0h4e7gnq.js:120602-120958 sole-consumer
async function resolveAgentUserContext(e, n, s) {
  let { claudeMd: claudeMd, ...r } = n,
    S = { userContext: r, managedInstructionsOnly: !1 };
  if (e.source === "built-in" || e.source === "policySettings") return S;
  let h = await getManagedInstructionText(s.session, s.storageV5, s.credentials);
  if (h === void 0) return { userContext: n, managedInstructionsOnly: !1 };
  if (h === "") return S;
  return { userContext: { ...n, claudeMd: h }, managedInstructionsOnly: !0 };
}
//@ chunk-0h4e7gnq.js:120958-121177 sole-consumer
function getLatestCoworkMemoryVersion(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let s = e[n];
    if (s.type === "attachment" && s.attachment.type === "cowork_memory_context" && !s.attachment.anchor)
      return s.attachment.content !== null ? s.attachment.version : void 0;
  }
  return;
}

export {
  rue,
  runAgent,
  Nd,
  filterIncompleteToolCalls,
  isOnlyPendingToolUse,
  assembleAgentToolPool,
  clearWorktreeFromAgentMetadata,
  spawnRequestShape,
  filterIncompleteToolCalls_2,
  writeSubagentProgressToOutputSink,
  kLr,
};
