/**
 * state/onChangeAppState.ts
 *
 * AppState 变化回调与外部元数据到 AppState 的转换（拒绝恢复不安全权限模式）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/onChangeAppState.ts
 * pieces: chunk-2bycp31m.js (1), chunk-ct61sn5h.js (22)
 * attribution: callgraph-fingerprint 1, placement 21, fingerprint 1
 */
import { isCompactPairWithheldFromRemote, isBridgeBindingForeign } from "../utils/sessionStorage.js";
import { useShimmerAnimation } from "../components/Spinner/useShimmerAnimation.js";
import { enqueueTaskNotification, getRunId } from "../utils/task/taskNotifications.js";
import { logError } from "../utils/log.js";
import {
  isReplBridgeActive,
  isDiskless,
  getIsRemoteMode,
  setMainLoopModelOverride,
  setMainLoopEffortState,
  getLearnedEffortCaps,
  isCcsTenant,
  noteSystemPromptSectionInvalidation,
} from "../bootstrap/state.js";
import { isBridgePartialMessagesEnabled } from "../bridge/bridgeGates.js";
import { isPingStreamEvent } from "../utils/messages.js";
import { checkHasTrustDialogAccepted, saveGlobalConfig } from "../utils/config.js";
import { applyConfigEnvironmentVariables } from "../utils/managedEnvApply.js";
import { captureAdmin3PSteeringSnapshot } from "../utils/model/thirdPartyDefaultFallbacks.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import {
  permissionModeFromString,
  toExternalPermissionMode,
  getPermissionModeAnalyticsFields,
} from "../utils/permissions/PermissionMode.js";
import { setAccountSetPermissionMode } from "../utils/permissions/autoModeState.js";
import {
  isBypassPermissionsModeDisabled,
  transitionPermissionMode,
  stripDangerousPermissionsForAutoMode,
} from "../utils/permissions/permissionSetup.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { reportBridgePermissionMode, reportBridgeModel } from "../bridge/replBridgeHandle.js";
import {
  syncSessionPermissionMode,
  getSessionFlags,
  mergeSessionFlags,
} from "../services/api/sessionFlags.js";
import { syncRespawnFlag } from "../services/daemon/jobState.js";
import { cycleAllTeammateModes } from "../components/teams/TeamsDialog.js";
import { hasLeftProactivityBaseline } from "../utils/permissions/permissions.js";
import { notifyRoomConsentChanged } from "../services/liveReplica/liveReplica.js";
import { publishAnnouncedDirs } from "../utils/announcedDirectories.js";
import { isIterativeHavenGateOn } from "../cli/print/agentResume.js";
import {
  takePendingSwitchSource,
  effectiveModelForContext,
  runPostModelSwitchHooks,
} from "../utils/model/modelSwitchHooks.js";
import { forgetHeldWindows } from "../services/claudeAiLimits.js";
import { onKeepaliveModelSwitch } from "../services/api/cacheKeepalive.js";
import {
  releaseCarriedEffortIfModelChanged,
  isSameEffortSetting,
  releaseCarriedEffortForEffortChange,
  isUltracodeActive,
  effortSettingToString,
  effortLevelValue,
  isEffortLevel,
} from "../utils/effort.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { withClientDataReseedOnModelChange, refreshBootstrapDataTracked_2 } from "../bridge/bridgeEnabled.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { reportEffortForModel, reportBridgeEffortMetadata } from "../bridge/applyFlagSettings.js";
import { confirmAndFire } from "../services/quotaAutoResume/quotaAutoResume.js";
import { abortPrecomputeOnModelSwitch } from "../services/compact/precomputedCompact.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import {
  hasSessionIngressAuthForFastMode,
  supportsFastMode,
  getFastModeUnavailableReasonCode,
  wasCreditsExhaustedNotifiedThisTurn,
  syncFastModeFlag,
} from "../utils/fastMode.js";
import {
  isPublishToolEnabled,
  isArtifactAccountAllowed,
  isArtifactAdminAllowed,
} from "../services/artifacts/artifactToolGates.js";
import {
  frameUrlRowsToPersist,
  nonOpenedFrameUrls,
  frameUrlToRecord,
} from "../tools/ArtifactTool/artifactResumeCarry.js";
import { saveUserIntentSetting } from "../utils/settings/userIntentSettings.js";
import {
  clearApiKeyHelperCache,
  clearAwsCredentialsCache,
  resetAwsAuthRefreshCooldown,
  clearGcpCredentialsCache,
} from "../utils/auth.js";
import { isObserverAgentTask } from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import {
  isLocalScriptTask,
  isHoldCappedMcpTask,
  getSelectableBackgroundTasks,
  taskParentAgentId,
  skipsTranscript,
  isAwaitedAgentTask,
} from "../tasks/taskKinds.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ct61sn5h.js:1569-1602 placement
/**
 * 是否应向 SDK 发出 compact_error 字段。
 */
function shouldEmitCompactError() {
  return !isCompactPairWithheldFromRemote() && !isBridgeBindingForeign();
}
//@ chunk-ct61sn5h.js:1602-1772 placement
/**
 * 向 SDK 发出 status 事件前去掉 compact_error 字段（未开启时）。
 */
function stripCompactErrorForSdk(event) {
  if (
    event.type === "system" &&
    "subtype" in event &&
    event.subtype === "status" &&
    "compact_error" in event &&
    event.compact_error !== undefined &&
    !shouldEmitCompactError()
  )
    return {
      ...event,
      compact_error: undefined,
    };
  return event;
}
//@ chunk-ct61sn5h.js:1772-2034 placement
/**
 * 发出 system/status 事件（权限模式、压缩结果）。
 */
function emitStatusChange({ status, permissionMode, compactResult, compactError }) {
  try {
    if (!useShimmerAnimation(status)) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "status",
      status,
      ...(permissionMode !== undefined && {
        permissionMode,
      }),
      ...(compactResult !== undefined && {
        compact_result: compactResult,
      }),
      ...(compactError !== undefined &&
        shouldEmitCompactError() && {
          compact_error: compactError,
        }),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ct61sn5h.js:2034-2221 placement
/**
 * REPL 桥接开启部分消息时，把流事件作为 stream_event 通知转发给桥接端（附首 token 时间）。
 */
function forwardStreamEventToBridge(notification) {
  try {
    if (!isReplBridgeActive() || !isBridgePartialMessagesEnabled()) return;
    if (isPingStreamEvent(notification.event)) return;
    enqueueTaskNotification({
      type: "stream_event",
      event: notification.event,
      parent_tool_use_id: null,
      ...(notification.ttftMs !== undefined && {
        ttft_ms: notification.ttftMs,
      }),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ct61sn5h.js:2221-2628 placement (2.1.88 match: countUnseenAssistantTurns, 1)
/**
 * 按键顺序浅比较两个对象。
 */
function shallowEqualTaskMaps(messages, dividerIndex) {
  let keys = Object.keys(messages);
  let keys_2 = Object.keys(dividerIndex);
  if (keys.length !== keys_2.length) return false;
  for (let i = 0; i < keys_2.length; i++) {
    let key = keys_2[i];
    if (key === undefined || key !== keys[i]) return false;
    let left = messages[key];
    let right = dividerIndex[key];
    if (left === right) continue;
    if (left === undefined || right === undefined) return false;
    for (let key of Object.keys(right))
      if (key !== "progress" && (!Object.hasOwn(left, key) || left[key] !== right[key])) return false;
    for (let key of Object.keys(left)) if (key !== "progress" && !Object.hasOwn(right, key)) return false;
  }
  return true;
}
//@ chunk-ct61sn5h.js:2628-2727 placement
/**
 * 应用配置环境变量并抓取三方可信策略快照（无盘或未信任时跳过）。
 */
function applyStartupConfigSideEffects() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return;
  let providerCaches = null;
  let movedProviders = [];
  applyConfigEnvironmentVariables();
  captureAdmin3PSteeringSnapshot();
  providerCaches?.resetProviderBoundCachesIfMoved(movedProviders);
}
//@ chunk-ct61sn5h.js:2727-2894 placement
var externalStatusSchema; // deferred: uses objectSchema (../../vendor/zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ct61sn5h.js:2727", () => {
  externalStatusSchema = objectSchema({
    status_category: stringSchema(),
    status_detail: stringSchema(),
    needs_action: stringSchema(),
    recent_action: stringSchema().optional(),
    description: stringSchema().optional(),
    reply: stringSchema().optional(),
    standing: stringSchema().optional(),
  });
});
//@ chunk-ct61sn5h.js:2894-3686 fingerprint (2.1.88 match: externalMetadataToAppState, 0.435)
/**
 * 把外部（远程会话）元数据转换为 AppState 片段，拒绝恢复 bypassPermissions 等不安全模式。
 */
function externalMetadataToAppState(metadata) {
  return (prev) => {
    let toolPermissionContext = prev.toolPermissionContext;
    if (typeof metadata.permission_mode === "string") {
      let restoredMode = permissionModeFromString(metadata.permission_mode);
      setAccountSetPermissionMode(restoredMode);
      if (
        restoredMode === "bypassPermissions" &&
        (isBypassPermissionsModeDisabled() || !toolPermissionContext.isBypassPermissionsModeAvailable)
      ) {
        logForDebugging(
          "[externalMetadataToAppState] Refusing restored mode 'bypassPermissions' (disabled by settings/policy or session not launched with --dangerously-skip-permissions); falling back to 'default'",
          {
            level: "warn",
          },
        );
        restoredMode = "default";
      }
      try {
        toolPermissionContext = {
          ...transitionPermissionMode(toolPermissionContext.mode, restoredMode, toolPermissionContext),
          mode: restoredMode,
        };
        if (restoredMode === "auto")
          toolPermissionContext = stripDangerousPermissionsForAutoMode(toolPermissionContext);
      } catch (error) {
        logForDebugging(
          `[externalMetadataToAppState] transitionPermissionMode rejected restored mode '${restoredMode}': ${toError(error).message}`,
        );
      }
    }
    let summaryParse = externalStatusSchema.safeParse(metadata.post_turn_summary);
    return {
      ...prev,
      toolPermissionContext,
      ...(typeof metadata.is_ultraplan_mode === "boolean" && {
        isUltraplanMode: metadata.is_ultraplan_mode,
      }),
      ...(summaryParse.success && {
        postTurnSummary: summaryParse.data,
      }),
    };
  };
}
//@ chunk-ct61sn5h.js:4093-9953 placement
/**
 * AppState 变化时的副作用：权限模式切换、MCP roots、后台任务、模型等通知。
 */
function onAppStateChange({ newState, oldState }, session, workerConn, storageV5, credentials) {
  let mode = oldState.toolPermissionContext.mode;
  let mode_2 = newState.toolPermissionContext.mode;
  let isProactivityChanged = newState.proactivityLevel !== oldState.proactivityLevel;
  if (mode !== mode_2) {
    let externalPermissionMode = toExternalPermissionMode(mode);
    let externalPermissionMode_2 = toExternalPermissionMode(mode_2);
    if (externalPermissionMode !== externalPermissionMode_2) {
      let permissionModeAnalyticsFields = getPermissionModeAnalyticsFields({
        rule: "first-entry",
        prevMode: mode,
        newMode: mode_2,
        prevUltraplan: oldState.isUltraplanMode,
        newUltraplan: newState.isUltraplanMode,
      });
      let isUltraplanMode = permissionModeAnalyticsFields.is_ultraplan_mode;
      workerConn?.notifyMetadataChanged(permissionModeAnalyticsFields);
      if (workerConn?.isWorkerPermissionModeRecordEnabled)
        workerConn.notifyInternalMetadataChanged({
          worker_permission_mode: externalPermissionMode_2,
          plan_doc: null,
        });
      reportBridgePermissionMode(mode_2, isUltraplanMode);
      if (!workerConn)
        emitStatusChange({
          status: null,
          permissionMode: externalPermissionMode_2,
        });
    }
    workerConn?.notifyPermissionModeChanged(mode_2);
    syncSessionPermissionMode(mode_2);
  } else if (isProactivityChanged) workerConn?.notifyProactivityLevelChanged();
  let id = newState.toolPermissionContext.planDoc?.id;
  if (id !== oldState.toolPermissionContext.planDoc?.id && workerConn?.isWorkerPermissionModeRecordEnabled)
    workerConn.notifyInternalMetadataChanged(
      id === undefined
        ? {
            plan_doc: null,
          }
        : {
            plan_doc: {
              id,
            },
            worker_permission_mode: toExternalPermissionMode(mode_2),
          },
    );
  if (mode !== mode_2 || isProactivityChanged) {
    syncRespawnFlag(
      "--permission-mode",
      ["--inherit-permission-mode"],
      cycleAllTeammateModes(
        mode_2,
        newState.proactivityLevel,
        hasLeftProactivityBaseline(newState.toolPermissionContext),
      ),
      undefined,
      storageV5,
    );
    if (isProactivityChanged)
      syncRespawnFlag("--proactivity", [], newState.proactivityLevel, undefined, storageV5);
  }
  if (newState.toolPermissionContext !== oldState.toolPermissionContext) notifyRoomConsentChanged();
  if (
    newState.toolPermissionContext.isBypassPermissionsModeAvailable !==
      oldState.toolPermissionContext.isBypassPermissionsModeAvailable &&
    getSessionFlags()?.permissionMode
  )
    mergeSessionFlags({
      bypassPermissionsAvailable: newState.toolPermissionContext.isBypassPermissionsModeAvailable,
    });
  if (
    newState.toolPermissionContext.additionalWorkingDirectories !==
      oldState.toolPermissionContext.additionalWorkingDirectories &&
    publishAnnouncedDirs(newState.toolPermissionContext)
  )
    try {
      require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule().notifyMcpRootsListChanged();
    } catch (error) {
      logForDebugging(`Failed to notify MCP servers of roots change: ${toError(error).message}`);
    }
  if (newState.tasks !== oldState.tasks) {
    let tasksEqual = shallowEqualTaskMaps(oldState.tasks, newState.tasks);
    if (workerConn) {
      let patch = {};
      if (!tasksEqual) {
        let runningNow = runningBackgroundTasks(newState);
        if (!sameTaskIdSequence(runningBackgroundTasks(oldState), runningNow))
          patch.running_background_tasks = runningNow;
        if (isIterativeHavenGateOn()) {
          let agentsNow = runningDirectAgents(newState);
          if (!sameTaskIdSequence(runningDirectAgents(oldState), agentsNow))
            patch.running_foreground_agents = agentsNow;
        }
      }
      let resumableOrphanedAgents = workerConn.resumableOrphanedAgents;
      let filtered = resumableOrphanedAgents.filter(
        (resumableOrphanedAgent) => !Object.hasOwn(newState.tasks, resumableOrphanedAgent.task_id),
      );
      if (filtered.length !== resumableOrphanedAgents.length) {
        workerConn.resumableOrphanedAgents = filtered;
        patch.resumable_orphaned_agents = filtered;
      }
      if (Object.keys(patch).length > 0) workerConn.notifyInternalMetadataChanged(patch);
    }
    if (!tasksEqual) {
      let before = backgroundTasksForMetadata(oldState);
      let after = backgroundTasksForMetadata(newState);
      if (
        before.length !== after.length ||
        after.some(
          (task, index) =>
            task.task_id !== before[index]?.task_id ||
            task.description !== before[index]?.description ||
            task.parent_task_id !== before[index]?.parent_task_id ||
            task.ambient !== before[index]?.ambient ||
            task.awaited !== before[index]?.awaited,
        )
      )
        enqueueTaskNotification({
          type: "system",
          subtype: "background_tasks_changed",
          tasks: after,
        });
    }
  }
  let session_2 = oldState.toolPermissionContext.alwaysAllowRules.session;
  let session_3 = newState.toolPermissionContext.alwaysAllowRules.session;
  if (session_2 !== session_3) {
    let filtered = session_3?.filter((rule) => !rule.startsWith("mcp__"));
    workerConn?.notifyInternalMetadataChanged({
      session_allow_rules: filtered?.length ? filtered : null,
    });
  }
  if (
    newState.mainLoopModel !== oldState.mainLoopModel ||
    newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
    newState.toolPermissionContext.mode !== oldState.toolPermissionContext.mode
  ) {
    let switchSource = takePendingSwitchSource(session);
    try {
      let previousModel = effectiveModelForContext(oldState);
      let nextModel = effectiveModelForContext(newState);
      if (previousModel !== nextModel) {
        forgetHeldWindows(["seven_day_overage_included"]);
        if (
          newState.mainLoopModel !== oldState.mainLoopModel ||
          newState.mainLoopModelForSession !== oldState.mainLoopModelForSession
        )
          onKeepaliveModelSwitch(session.host, previousModel, nextModel);
        if (!getIsRemoteMode())
          runPostModelSwitchHooks(session, {
            fromModel: previousModel,
            toModel: nextModel,
            requestedModel: switchSource.requestedModel,
            source: switchSource.source,
          });
        releaseCarriedEffortIfModelChanged(nextModel);
        if (codeModeAccepted()) {
          let { noteMainModelSwitch } = require("../utils/codeMode/codeModeModelNotices.lazy.js");
          noteMainModelSwitch(session, nextModel, switchSource.source);
        }
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  if (newState.mainLoopModel !== oldState.mainLoopModel) {
    let mainLoopModel = newState.mainLoopModel;
    let reseed = withClientDataReseedOnModelChange(() => setMainLoopModelOverride(mainLoopModel));
    let mainLoopModel_2 = getMainLoopModel();
    try {
      reportBridgeModel(mainLoopModel_2);
    } catch (error) {
      logError(toError(error));
    }
    reportEffortForModel(mainLoopModel_2, newState);
    confirmAndFire();
    abortPrecomputeOnModelSwitch(session.precompute);
    refreshBootstrapDataTracked_2(storageV5, credentials, reseed);
    workerConn?.notifyMetadataChanged({
      model: mainLoopModel ?? getDefaultMainLoopModel(),
    });
    syncRespawnFlag("--model", ["-m"], mainLoopModel, undefined, storageV5);
  }
  if (newState.fotwClaim?.phase === "granted" && oldState.fotwClaim?.phase !== "granted") confirmAndFire();
  if (
    !isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort) ||
    newState.settingsEffortTable !== oldState.settingsEffortTable
  )
    setMainLoopEffortState({
      sessionEffort: newState.sessionEffort,
      settingsEffortTable: newState.settingsEffortTable,
    });
  if (
    newState.settingsEffortTable !== oldState.settingsEffortTable &&
    isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)
  )
    reportEffortForModel(getMainLoopModel(), newState);
  if (!isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)) {
    releaseCarriedEffortForEffortChange();
    getLearnedEffortCaps().clear();
    let ultracodePatch = workerConn?.ultracodeActivePatch(
      isUltracodeActive(newState.ultracode, getMainLoopModel()),
    );
    workerConn?.notifyMetadataChanged({
      effort_level: effortSettingToString(newState.sessionEffort),
      ...ultracodePatch,
    });
    reportEffortForModel(getMainLoopModel(), newState);
    syncEffortRespawnFlag(newState.sessionEffort, storageV5);
  }
  if (newState.fastMode !== oldState.fastMode) fastModeNoticeIfNeeded(newState.fastMode === true, storageV5);
  if (newState.mainLoopModelForSession !== oldState.mainLoopModelForSession) {
    let mainLoopModel = getMainLoopModel();
    try {
      reportBridgeModel(mainLoopModel);
    } catch (error) {
      logError(toError(error));
    }
    reportEffortForModel(mainLoopModel, newState);
    if (
      hasSessionIngressAuthForFastMode() &&
      (newState.mainLoopModelForSession === null || newState.mainLoopModelForSession === undefined) &&
      oldState.mainLoopModelForSession !== null &&
      oldState.mainLoopModelForSession !== undefined &&
      newState.mainLoopModel === oldState.mainLoopModel
    ) {
      setMainLoopModelOverride(newState.mainLoopModel);
      workerConn?.notifyMetadataChanged({
        model: newState.mainLoopModel ?? getDefaultMainLoopModel(),
      });
    }
  }
  if (newState.advisorModel !== oldState.advisorModel)
    syncRespawnFlag("--advisor", [], newState.advisorModel ?? null, undefined, storageV5);
  if (workerConn && newState.frameUrls !== oldState.frameUrls) {
    let isPublishEnabled = isPublishToolEnabled();
    let isArtifactAllowed = isCcsTenant() ? isArtifactAccountAllowed() : isArtifactAdminAllowed();
    let filtered = frameUrlRowsToPersist(newState.frameUrls)
      .map(([, revisionRow]) => revisionRow)
      .filter((frameRow) => (frameRow.mcpPublishedHere === true ? isArtifactAllowed : isPublishEnabled));
    if (filtered.length > 0 || (isPublishEnabled && nonOpenedFrameUrls(oldState.frameUrls).length > 0))
      workerConn.notifyMetadataChanged({
        artifacts: filtered.length === 0 ? null : filtered.map(frameUrlToRecord),
      });
  }
  if (workerConn && !shallowEqualByKeys(newState.activeGoal, oldState.activeGoal)) {
    let activeGoal = newState.activeGoal;
    workerConn.notifyActiveGoalChanged(activeGoal);
    if (activeGoal) {
      let { tokens_at_start: tokensAtStart, ...goalFields } = serializeGoalState(activeGoal);
      workerConn.notifyMetadataChanged({
        goal: {
          ...goalFields,
          last_reason: goalFields.last_reason ?? null,
          met: false,
        },
      });
    } else
      workerConn.notifyMetadataChanged({
        goal: null,
      });
  }
  if (
    workerConn &&
    (newState.autoCompactWindow !== oldState.autoCompactWindow ||
      newState.mainLoopModel !== oldState.mainLoopModel ||
      newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
      newState.settings !== oldState.settings)
  )
    workerConn.notifyAutocompactInputsChanged();
  if (newState.verbose !== oldState.verbose) saveUserIntentSetting("verbose", newState.verbose, storageV5);
  if (newState.settings !== oldState.settings) {
    try {
      clearApiKeyHelperCache();
      clearAwsCredentialsCache();
      resetAwsAuthRefreshCooldown();
      clearGcpCredentialsCache();
      if (newState.settings.env !== oldState.settings.env) applyStartupConfigSideEffects();
    } catch (error) {
      logForDebugging(
        `Failed to apply settings change (clear auth caches / re-apply env): ${toError(error).message}`,
        {
          level: "error",
        },
      );
    }
    if (newState.settings.outputStyle !== oldState.settings.outputStyle)
      noteSystemPromptSectionInvalidation("output_style");
  }
  if (
    newState.ultracode !== oldState.ultracode ||
    newState.mainLoopModel !== oldState.mainLoopModel ||
    newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
    newState.settings !== oldState.settings
  ) {
    let ultracodeActive = isUltracodeActive(newState.ultracode, getMainLoopModel());
    if (
      oldState.ultracode === true &&
      newState.ultracode !== true &&
      newState.sessionEffort.kind === "level" &&
      isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)
    ) {
      workerConn?.notifyMetadataChanged({
        effort_level: effortSettingToString(newState.sessionEffort),
        ...workerConn.ultracodeActivePatch(ultracodeActive),
      });
      syncEffortRespawnFlag(newState.sessionEffort, storageV5);
    } else workerConn?.notifyUltracodeActive(ultracodeActive);
    reportBridgeEffortMetadata({
      ultracodeActive,
    });
  }
}
//@ chunk-ct61sn5h.js:9953-10136 placement
function syncEffortRespawnFlag(sessionEffort, storageV5) {
  switch (sessionEffort.kind) {
    case "inherit":
    case "default":
      syncRespawnFlag("--effort", [], null, undefined, storageV5);
      return;
    case "level": {
      let level = effortLevelValue(sessionEffort);
      if (level !== undefined && isEffortLevel(level))
        syncRespawnFlag("--effort", [], level, undefined, storageV5);
      return;
    }
  }
}
//@ chunk-ct61sn5h.js:10136-10303 placement
function isObserverOwnedTask(task, tasks) {
  if (task.type !== "local_bash" && task.type !== "monitor_mcp" && task.type !== "monitor_ws") return false;
  let agentTask = task.agentId !== undefined ? tasks[task.agentId] : undefined;
  return agentTask !== undefined && isObserverAgentTask(agentTask);
}
//@ chunk-ct61sn5h.js:10303-10702 placement
/**
 * 子代理启动的遥测字段。
 */
function agentSpawnTelemetry(task) {
  return {
    agent_type: task.agentType,
    ...(task.selectedAgent && {
      is_built_in: task.selectedAgent.source === "built-in",
    }),
    forked_skill: task.forkedSkillName !== undefined,
    main_thread_spawned: task.spawnDepth === 1 && task.parentAgentId === undefined,
    default_launch: task.cwd === undefined && task.launchedWithDefaults === true,
    ...(task.cwd === undefined &&
      task.launchModel !== undefined && {
        launch_model: task.launchModel,
      }),
    ...(task.requestShape && {
      request_shape: task.requestShape,
    }),
  };
}
//@ chunk-ct61sn5h.js:10702-11293 placement
/**
 * 列出正在运行的后台任务。
 */
function runningBackgroundTasks(state) {
  return Object.values(state.tasks)
    .filter(
      (task) =>
        waitForTaskCompletion(task) &&
        !isObserverAgentTask(task) &&
        (task.type === "local_bash" ||
          task.type === "monitor_mcp" ||
          task.type === "monitor_ws" ||
          task.type === "local_agent" ||
          task.type === "local_workflow"),
    )
    .map((task) => ({
      task_id: task.id,
      task_type: task.type,
      description: task.description,
      ...((task.type === "local_bash" || task.type === "monitor_mcp" || task.type === "monitor_ws") &&
        task.agentId !== undefined && {
          owner_agent_id: task.agentId,
        }),
      ...(task.type === "local_bash" &&
        task.kind !== undefined && {
          shell_kind: task.kind,
        }),
      ...(task.type === "monitor_ws" &&
        task.ambient && {
          ambient: true,
        }),
      ...(task.type === "local_agent" && {
        ...agentSpawnTelemetry(task),
        run_id: getRunId(task.id),
      }),
      ...(isObserverOwnedTask(task, state.tasks) && {
        observer_owned: true,
      }),
    }));
}
//@ chunk-ct61sn5h.js:11293-11379 placement
/**
 * 两个任务列表的 task_id 顺序是否相同。
 */
function sameTaskIdSequence(left, right) {
  return left.length === right.length && right.every((task, index) => task.task_id === left[index]?.task_id);
}
//@ chunk-ct61sn5h.js:11379-11687 placement
/**
 * 列出主线程直接派生的运行中代理。
 */
function runningDirectAgents({ tasks }) {
  return Object.values(tasks).flatMap((task) =>
    task.type === "local_agent" &&
    task.status === "running" &&
    task.isBackgrounded === false &&
    task.directCall === true &&
    task.toolUseId !== undefined &&
    task.spawnDepth === 1 &&
    task.parentAgentId === undefined
      ? [
          {
            task_id: task.id,
            task_type: task.type,
            description: task.description,
            tool_use_id: task.toolUseId,
            ...agentSpawnTelemetry(task),
          },
        ]
      : [],
  );
}
//@ chunk-ct61sn5h.js:11687-11757 placement
/**
 * 目标状态序列化用的字段名（condition、iterations 等）。
 */
var GOAL_STATE_FIELDS = ["condition", "setAt", "iterations", "tokensAtStart", "lastReason"];
//@ chunk-ct61sn5h.js:11757-11927 placement
/**
 * 把目标状态序列化为线上格式（condition、iterations、set_at、tokens_at_start、last_reason）。
 */
function serializeGoalState(goal) {
  return {
    condition: goal.condition,
    iterations: goal.iterations,
    set_at: goal.setAt,
    tokens_at_start: goal.tokensAtStart,
    ...(goal.lastReason !== undefined && {
      last_reason: goal.lastReason,
    }),
  };
}
//@ chunk-ct61sn5h.js:11927-12029 placement
function shallowEqualByKeys(activeGoal, activeGoal_2) {
  if (activeGoal === activeGoal_2) return true;
  if (activeGoal === undefined || activeGoal_2 === undefined) return false;
  return GOAL_STATE_FIELDS.every((field) => activeGoal[field] === activeGoal_2[field]);
}
//@ chunk-ct61sn5h.js:12029-12338 placement
function backgroundTasksForMetadata(state) {
  return Object.values(state.tasks)
    .filter(
      (task) =>
        !(codeModeAccepted() && isLocalScriptTask(task)) &&
        waitForTaskCompletion(task) &&
        !isObserverAgentTask(task) &&
        !isHoldCappedMcpTask(task) &&
        task.type !== "post_turn_memory",
    )
    .map((task) => ({
      task_id: task.id,
      run_id: getRunId(task.id),
      task_type: task.type,
      subagent_type: getSelectableBackgroundTasks(task),
      description: task.description,
      parent_task_id: taskParentAgentId(task, state.tasks),
      ...(skipsTranscript(task) && {
        ambient: true,
      }),
      ...(isAwaitedAgentTask(task) && {
        awaited: true,
      }),
    }));
}
//@ chunk-ct61sn5h.js:12338-12413 placement
/**
 * 需要时发出 fast mode 不可用的提示。
 */
function fastModeNoticeIfNeeded(enabled, storageV5) {
  if (
    !enabled &&
    (!supportsFastMode(getMainLoopModel()) ||
      getFastModeUnavailableReasonCode(getMainLoopModel()) !== null ||
      wasCreditsExhaustedNotifiedThisTurn())
  )
    return;
  syncFastModeFlag(enabled, storageV5);
}
//@ chunk-ct61sn5h.js:12413-12495 placement
/**
 * 发出 background_tasks_changed 事件。
 */
function emitBackgroundTasksChanged(state) {
  enqueueTaskNotification({
    type: "system",
    subtype: "background_tasks_changed",
    tasks: backgroundTasksForMetadata(state),
  });
}
//@ chunk-ct61sn5h.js:12495-12553 placement
/**
 * 把 ultracode 活跃状态同步给会话。
 */
function syncUltracodeActive(sessionState, ultracode, restoredWorkerState) {
  sessionState.settleUltracodeActive(isUltracodeActive(ultracode, getMainLoopModel()), restoredWorkerState);
}
//@ chunk-2bycp31m.js:264-500 callgraph-fingerprint (2.1.88 match: onChangeAppState, 0.452)
/**
 * AppState 变化回调：把 tasks 等变化同步到外部（会话元数据、SDK 事件）。
 */
function onChangeAppState({ newState, oldState }, session, storageV5, credentials) {
  onAppStateChange(
    {
      newState,
      oldState,
    },
    session,
    undefined,
    storageV5,
    credentials,
  );
  if (newState.expandedView !== oldState.expandedView) {
    let isTasksView = newState.expandedView === "tasks";
    saveGlobalConfig((current) => {
      if (current.showExpandedTodos === isTasksView) return current;
      return {
        ...current,
        showExpandedTodos: isTasksView,
      };
    }, storageV5);
  }
}
export {
  syncUltracodeActive,
  stripCompactErrorForSdk,
  serializeGoalState,
  emitBackgroundTasksChanged,
  onChangeAppState,
  runningBackgroundTasks,
  onAppStateChange,
  shallowEqualTaskMaps,
  emitStatusChange,
  externalMetadataToAppState,
  forwardStreamEventToBridge,
};
