/**
 * state/onChangeAppState.ts
 *
 * AppState 变化回调与外部元数据到 AppState 的转换（拒绝恢复不安全权限模式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/onChangeAppState.ts
 * pieces: chunk-5hmnvmag.js (1), chunk-tbfde207.js (22)
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
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
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
  releaseCarriedEffortIfModelChanged,
  releaseCarriedEffortForEffortChange,
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
import { withClientDataReseedOnModelChange, refreshBootstrapDataTracked_2 } from "../bridge/bridgeEnabled.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { reportEffortForModel, reportBridgeEffortMetadata } from "../bridge/applyFlagSettings.js";
import { confirmAndFire } from "../services/quotaAutoResume/quotaAutoResume.js";
import { abortPrecomputeOnModelSwitch } from "../services/compact/precomputedCompact.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import {
  isSameEffortSetting,
  isUltracodeActive,
  effortSettingToString,
  effortLevelValue,
  isEffortLevel,
} from "../utils/effort.js";
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
  isHoldCappedMcpTask,
  getSelectableBackgroundTasks,
  taskParentAgentId,
  skipsTranscript,
  isAwaitedAgentTask,
} from "../tasks/taskKinds.js";

//@ chunk-tbfde207.js:1529-1562 placement
/**
 * 是否应向 SDK 发出 compact_error 字段。
 */
function shouldEmitCompactError() {
  return !isCompactPairWithheldFromRemote() && !isBridgeBindingForeign();
}
//@ chunk-tbfde207.js:1562-1732 placement
/**
 * 向 SDK 发出 status 事件前去掉 compact_error 字段（未开启时）。
 */
function stripCompactErrorForSdk(e) {
  if (
    e.type === "system" &&
    "subtype" in e &&
    e.subtype === "status" &&
    "compact_error" in e &&
    e.compact_error !== undefined &&
    !shouldEmitCompactError()
  )
    return {
      ...e,
      compact_error: undefined,
    };
  return e;
}
//@ chunk-tbfde207.js:1732-1994 placement
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
//@ chunk-tbfde207.js:1994-2181 placement
/**
 * REPL 桥接开启部分消息时，把流事件作为 stream_event 通知转发给桥接端（附首 token 时间）。
 */
function forwardStreamEventToBridge(e) {
  try {
    if (!isReplBridgeActive() || !isBridgePartialMessagesEnabled()) return;
    if (isPingStreamEvent(e.event)) return;
    enqueueTaskNotification({
      type: "stream_event",
      event: e.event,
      parent_tool_use_id: null,
      ...(e.ttftMs !== undefined && {
        ttft_ms: e.ttftMs,
      }),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tbfde207.js:2181-2588 placement = countUnseenAssistantTurns (1)
/**
 * 按键顺序浅比较两个对象。
 */
function shallowEqualTaskMaps(messages, dividerIndex) {
  let keys = Object.keys(messages);
  let keys_2 = Object.keys(dividerIndex);
  if (keys.length !== keys_2.length) return false;
  for (let i = 0; i < keys_2.length; i++) {
    let M = keys_2[i];
    if (M === undefined || M !== keys[i]) return false;
    let g = messages[M];
    let c = dividerIndex[M];
    if (g === c) continue;
    if (g === undefined || c === undefined) return false;
    for (let key of Object.keys(c))
      if (key !== "progress" && (!Object.hasOwn(g, key) || g[key] !== c[key])) return false;
    for (let key of Object.keys(g)) if (key !== "progress" && !Object.hasOwn(c, key)) return false;
  }
  return true;
}
//@ chunk-tbfde207.js:2588-2687 placement
/**
 * 应用配置环境变量并抓取三方可信策略快照（无盘或未信任时跳过）。
 */
function applyStartupConfigSideEffects() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return;
  let e = null;
  let r = [];
  applyConfigEnvironmentVariables();
  captureAdmin3PSteeringSnapshot();
  e?.resetProviderBoundCachesIfMoved(r);
}
//@ chunk-tbfde207.js:2687-2854 placement
var externalStatusSchema = u({
  status_category: string(),
  status_detail: string(),
  needs_action: string(),
  recent_action: string().optional(),
  description: string().optional(),
  reply: string().optional(),
  standing: string().optional(),
});
//@ chunk-tbfde207.js:2854-3646 fingerprint = externalMetadataToAppState (0.435)
/**
 * 把外部（远程会话）元数据转换为 AppState 片段，拒绝恢复 bypassPermissions 等不安全模式。
 */
function externalMetadataToAppState(metadata) {
  return (prev) => {
    let toolPermissionContext = prev.toolPermissionContext;
    if (typeof metadata.permission_mode === "string") {
      let d = permissionModeFromString(metadata.permission_mode);
      setAccountSetPermissionMode(d);
      if (
        d === "bypassPermissions" &&
        (isBypassPermissionsModeDisabled() || !toolPermissionContext.isBypassPermissionsModeAvailable)
      ) {
        logForDebugging(
          "[externalMetadataToAppState] Refusing restored mode 'bypassPermissions' (disabled by settings/policy or session not launched with --dangerously-skip-permissions); falling back to 'default'",
          {
            level: "warn",
          },
        );
        d = "default";
      }
      try {
        toolPermissionContext = {
          ...transitionPermissionMode(toolPermissionContext.mode, d, toolPermissionContext),
          mode: d,
        };
        if (d === "auto") toolPermissionContext = stripDangerousPermissionsForAutoMode(toolPermissionContext);
      } catch (error) {
        logForDebugging(
          `[externalMetadataToAppState] transitionPermissionMode rejected restored mode '${d}': ${toError(error).message}`,
        );
      }
    }
    let i = externalStatusSchema.safeParse(metadata.post_turn_summary);
    return {
      ...prev,
      toolPermissionContext,
      ...(typeof metadata.is_ultraplan_mode === "boolean" && {
        isUltraplanMode: metadata.is_ultraplan_mode,
      }),
      ...(i.success && {
        postTurnSummary: i.data,
      }),
    };
  };
}
//@ chunk-tbfde207.js:4053-9479 placement
/**
 * AppState 变化时的副作用：权限模式切换、MCP roots、后台任务、模型等通知。
 */
function onAppStateChange({ newState, oldState }, n, i, d, M) {
  let mode = oldState.toolPermissionContext.mode;
  let mode_2 = newState.toolPermissionContext.mode;
  let m = newState.proactivityLevel !== oldState.proactivityLevel;
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
      i?.notifyMetadataChanged(permissionModeAnalyticsFields);
      if (i?.isWorkerPermissionModeRecordEnabled)
        i.notifyInternalMetadataChanged({
          worker_permission_mode: externalPermissionMode_2,
        });
      reportBridgePermissionMode(mode_2, isUltraplanMode);
      if (!i)
        emitStatusChange({
          status: null,
          permissionMode: externalPermissionMode_2,
        });
    }
    i?.notifyPermissionModeChanged(mode_2);
    syncSessionPermissionMode(mode_2);
  } else if (m) i?.notifyProactivityLevelChanged();
  if (mode !== mode_2 || m) {
    syncRespawnFlag(
      "--permission-mode",
      ["--inherit-permission-mode"],
      cycleAllTeammateModes(
        mode_2,
        newState.proactivityLevel,
        hasLeftProactivityBaseline(newState.toolPermissionContext),
      ),
      undefined,
      d,
    );
    if (m) syncRespawnFlag("--proactivity", [], newState.proactivityLevel, undefined, d);
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
      require("./chunk-asne9cp8.js").mcpClientModule().notifyMcpRootsListChanged();
    } catch (error) {
      logForDebugging(`Failed to notify MCP servers of roots change: ${toError(error).message}`);
    }
  if (newState.tasks !== oldState.tasks) {
    let s = shallowEqualTaskMaps(oldState.tasks, newState.tasks);
    if (i) {
      let a = {};
      if (!s) {
        let y = runningBackgroundTasks(newState);
        if (!sameTaskIdSequence(runningBackgroundTasks(oldState), y)) a.running_background_tasks = y;
        if (isIterativeHavenGateOn()) {
          let k = runningDirectAgents(newState);
          if (!sameTaskIdSequence(runningDirectAgents(oldState), k)) a.running_foreground_agents = k;
        }
      }
      let resumableOrphanedAgents = i.resumableOrphanedAgents;
      let filtered = resumableOrphanedAgents.filter(
        (resumableOrphanedAgent) => !Object.hasOwn(newState.tasks, resumableOrphanedAgent.task_id),
      );
      if (filtered.length !== resumableOrphanedAgents.length) {
        i.resumableOrphanedAgents = filtered;
        a.resumable_orphaned_agents = filtered;
      }
      if (Object.keys(a).length > 0) i.notifyInternalMetadataChanged(a);
    }
    if (!s) {
      let a = backgroundTasksForMetadata(oldState);
      let f = backgroundTasksForMetadata(newState);
      if (
        a.length !== f.length ||
        f.some(
          (p, y) =>
            p.task_id !== a[y]?.task_id ||
            p.description !== a[y]?.description ||
            p.parent_task_id !== a[y]?.parent_task_id ||
            p.ambient !== a[y]?.ambient ||
            p.awaited !== a[y]?.awaited,
        )
      )
        enqueueTaskNotification({
          type: "system",
          subtype: "background_tasks_changed",
          tasks: f,
        });
    }
  }
  let session = oldState.toolPermissionContext.alwaysAllowRules.session;
  let session_2 = newState.toolPermissionContext.alwaysAllowRules.session;
  if (session !== session_2) {
    let filtered = session_2?.filter((a) => !a.startsWith("mcp__"));
    i?.notifyInternalMetadataChanged({
      session_allow_rules: filtered?.length ? filtered : null,
    });
  }
  if (
    newState.mainLoopModel !== oldState.mainLoopModel ||
    newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
    newState.toolPermissionContext.mode !== oldState.toolPermissionContext.mode
  ) {
    let s = takePendingSwitchSource(n);
    try {
      let a = effectiveModelForContext(oldState);
      let f = effectiveModelForContext(newState);
      if (a !== f) {
        forgetHeldWindows(["seven_day_overage_included"]);
        if (
          newState.mainLoopModel !== oldState.mainLoopModel ||
          newState.mainLoopModelForSession !== oldState.mainLoopModelForSession
        )
          onKeepaliveModelSwitch(n.host, a, f);
        if (!getIsRemoteMode())
          runPostModelSwitchHooks(n, {
            fromModel: a,
            toModel: f,
            requestedModel: s.requestedModel,
            source: s.source,
          });
        releaseCarriedEffortIfModelChanged(f);
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  if (newState.mainLoopModel !== oldState.mainLoopModel) {
    let mainLoopModel = newState.mainLoopModel;
    let a = withClientDataReseedOnModelChange(() => setMainLoopModelOverride(mainLoopModel));
    let mainLoopModel_2 = getMainLoopModel();
    try {
      reportBridgeModel(mainLoopModel_2);
    } catch (error) {
      logError(toError(error));
    }
    reportEffortForModel(mainLoopModel_2, newState);
    confirmAndFire();
    abortPrecomputeOnModelSwitch(n.precompute);
    refreshBootstrapDataTracked_2(d, M, a);
    i?.notifyMetadataChanged({
      model: mainLoopModel ?? getDefaultMainLoopModel(),
    });
    syncRespawnFlag("--model", ["-m"], mainLoopModel, undefined, d);
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
  if (!isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)) {
    releaseCarriedEffortForEffortChange();
    getLearnedEffortCaps().clear();
    let s = i?.ultracodeActivePatch(isUltracodeActive(newState.ultracode, getMainLoopModel()));
    i?.notifyMetadataChanged({
      effort_level: effortSettingToString(newState.sessionEffort),
      ...s,
    });
    reportEffortForModel(getMainLoopModel(), newState);
    syncEffortRespawnFlag(newState.sessionEffort, d);
  }
  if (newState.fastMode !== oldState.fastMode) fastModeNoticeIfNeeded(newState.fastMode === true, d);
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
      i?.notifyMetadataChanged({
        model: newState.mainLoopModel ?? getDefaultMainLoopModel(),
      });
    }
  }
  if (newState.advisorModel !== oldState.advisorModel)
    syncRespawnFlag("--advisor", [], newState.advisorModel ?? null, undefined, d);
  if (i && newState.frameUrls !== oldState.frameUrls) {
    let s = isPublishToolEnabled();
    let a = isCcsTenant() ? isArtifactAccountAllowed() : isArtifactAdminAllowed();
    let filtered = frameUrlRowsToPersist(newState.frameUrls)
      .map(([, p]) => p)
      .filter((p) => (p.mcpPublishedHere === true ? a : s));
    if (filtered.length > 0 || (s && nonOpenedFrameUrls(oldState.frameUrls).length > 0))
      i.notifyMetadataChanged({
        artifacts: filtered.length === 0 ? null : filtered.map(frameUrlToRecord),
      });
  }
  if (i && !shallowEqualByKeys(newState.activeGoal, oldState.activeGoal)) {
    let activeGoal = newState.activeGoal;
    i.notifyActiveGoalChanged(activeGoal);
    if (activeGoal) {
      let { tokens_at_start: tokensAtStart, ...f } = serializeGoalState(activeGoal);
      i.notifyMetadataChanged({
        goal: {
          ...f,
          last_reason: f.last_reason ?? null,
          met: false,
        },
      });
    } else
      i.notifyMetadataChanged({
        goal: null,
      });
  }
  if (
    i &&
    (newState.autoCompactWindow !== oldState.autoCompactWindow ||
      newState.mainLoopModel !== oldState.mainLoopModel ||
      newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
      newState.settings !== oldState.settings)
  )
    i.notifyAutocompactInputsChanged();
  if (newState.verbose !== oldState.verbose) saveUserIntentSetting("verbose", newState.verbose, d);
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
    let s = isUltracodeActive(newState.ultracode, getMainLoopModel());
    if (
      oldState.ultracode === true &&
      newState.ultracode !== true &&
      newState.sessionEffort.kind === "level" &&
      isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)
    ) {
      i?.notifyMetadataChanged({
        effort_level: effortSettingToString(newState.sessionEffort),
        ...i.ultracodeActivePatch(s),
      });
      syncEffortRespawnFlag(newState.sessionEffort, d);
    } else i?.notifyUltracodeActive(s);
    reportBridgeEffortMetadata({
      ultracodeActive: s,
    });
  }
}
//@ chunk-tbfde207.js:9479-9662 placement
function syncEffortRespawnFlag(sessionEffort, r) {
  switch (sessionEffort.kind) {
    case "inherit":
    case "default":
      syncRespawnFlag("--effort", [], null, undefined, r);
      return;
    case "level": {
      let n = effortLevelValue(sessionEffort);
      if (n !== undefined && isEffortLevel(n)) syncRespawnFlag("--effort", [], n, undefined, r);
      return;
    }
  }
}
//@ chunk-tbfde207.js:9662-9829 placement
function isObserverOwnedTask(task, tasks) {
  if (task.type !== "local_bash" && task.type !== "monitor_mcp" && task.type !== "monitor_ws") return false;
  let n = task.agentId !== undefined ? tasks[task.agentId] : undefined;
  return n !== undefined && isObserverAgentTask(n);
}
//@ chunk-tbfde207.js:9829-10178 placement
/**
 * 子代理启动的遥测字段。
 */
function agentSpawnTelemetry(e) {
  return {
    agent_type: e.agentType,
    ...(e.selectedAgent && {
      is_built_in: e.selectedAgent.source === "built-in",
    }),
    forked_skill: e.forkedSkillName !== undefined,
    main_thread_spawned: e.spawnDepth === 1 && e.parentAgentId === undefined,
    default_launch: e.cwd === undefined && e.launchedWithDefaults === true,
    ...(e.cwd === undefined &&
      e.launchModel !== undefined && {
        launch_model: e.launchModel,
      }),
  };
}
//@ chunk-tbfde207.js:10178-10767 placement
/**
 * 列出正在运行的后台任务。
 */
function runningBackgroundTasks(e) {
  return Object.values(e.tasks)
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
      ...(isObserverOwnedTask(task, e.tasks) && {
        observer_owned: true,
      }),
    }));
}
//@ chunk-tbfde207.js:10767-10853 placement
/**
 * 两个任务列表的 task_id 顺序是否相同。
 */
function sameTaskIdSequence(e, r) {
  return e.length === r.length && r.every((n, i) => n.task_id === e[i]?.task_id);
}
//@ chunk-tbfde207.js:10853-11161 placement
/**
 * 列出主线程直接派生的运行中代理。
 */
function runningDirectAgents({ tasks }) {
  return Object.values(tasks).flatMap((r) =>
    r.type === "local_agent" &&
    r.status === "running" &&
    r.isBackgrounded === false &&
    r.directCall === true &&
    r.toolUseId !== undefined &&
    r.spawnDepth === 1 &&
    r.parentAgentId === undefined
      ? [
          {
            task_id: r.id,
            task_type: r.type,
            description: r.description,
            tool_use_id: r.toolUseId,
            ...agentSpawnTelemetry(r),
          },
        ]
      : [],
  );
}
//@ chunk-tbfde207.js:11161-11231 placement
/**
 * 目标状态序列化用的字段名（condition、iterations 等）。
 */
var GOAL_STATE_FIELDS = ["condition", "setAt", "iterations", "tokensAtStart", "lastReason"];
//@ chunk-tbfde207.js:11231-11401 placement
/**
 * 把目标状态序列化为线上格式（condition、iterations、set_at、tokens_at_start、last_reason）。
 */
function serializeGoalState(e) {
  return {
    condition: e.condition,
    iterations: e.iterations,
    set_at: e.setAt,
    tokens_at_start: e.tokensAtStart,
    ...(e.lastReason !== undefined && {
      last_reason: e.lastReason,
    }),
  };
}
//@ chunk-tbfde207.js:11401-11503 placement
function shallowEqualByKeys(activeGoal, activeGoal_2) {
  if (activeGoal === activeGoal_2) return true;
  if (activeGoal === undefined || activeGoal_2 === undefined) return false;
  return GOAL_STATE_FIELDS.every((n) => activeGoal[n] === activeGoal_2[n]);
}
//@ chunk-tbfde207.js:11503-11796 placement
function backgroundTasksForMetadata(e) {
  return Object.values(e.tasks)
    .filter(
      (task) =>
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
      parent_task_id: taskParentAgentId(task, e.tasks),
      ...(skipsTranscript(task) && {
        ambient: true,
      }),
      ...(isAwaitedAgentTask(task) && {
        awaited: true,
      }),
    }));
}
//@ chunk-tbfde207.js:11796-11871 placement
/**
 * 需要时发出 fast mode 不可用的提示。
 */
function fastModeNoticeIfNeeded(e, r) {
  if (
    !e &&
    (!supportsFastMode(getMainLoopModel()) ||
      getFastModeUnavailableReasonCode(getMainLoopModel()) !== null ||
      wasCreditsExhaustedNotifiedThisTurn())
  )
    return;
  syncFastModeFlag(e, r);
}
//@ chunk-tbfde207.js:11871-11953 placement
/**
 * 发出 background_tasks_changed 事件。
 */
function emitBackgroundTasksChanged(e) {
  enqueueTaskNotification({
    type: "system",
    subtype: "background_tasks_changed",
    tasks: backgroundTasksForMetadata(e),
  });
}
//@ chunk-tbfde207.js:11953-12011 placement
/**
 * 把 ultracode 活跃状态同步给会话。
 */
function syncUltracodeActive(sessionState, ultracode, restoredWorkerState) {
  sessionState.settleUltracodeActive(isUltracodeActive(ultracode, getMainLoopModel()), restoredWorkerState);
}
//@ chunk-5hmnvmag.js:264-500 callgraph-fingerprint = onChangeAppState (0.452)
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
    let a = newState.expandedView === "tasks";
    saveGlobalConfig((current) => {
      if (current.showExpandedTodos === a) return current;
      return {
        ...current,
        showExpandedTodos: a,
      };
    }, storageV5);
  }
}
export {
  onAppStateChange,
  shallowEqualTaskMaps,
  syncUltracodeActive,
  stripCompactErrorForSdk,
  serializeGoalState,
  emitBackgroundTasksChanged,
  emitStatusChange,
  forwardStreamEventToBridge,
  onChangeAppState,
  externalMetadataToAppState,
};
