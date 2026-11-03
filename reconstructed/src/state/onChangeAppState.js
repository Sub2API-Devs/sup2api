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
import { zbe } from "../utils/messages.js";
import { checkHasTrustDialogAccepted, saveGlobalConfig } from "../utils/config.js";
import { applyConfigEnvironmentVariables } from "../utils/managedEnvApply.js";
import { captureAdmin3PSteeringSnapshot } from "../utils/model/thirdPartyDefaultFallbacks.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
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
  yhi,
  scr,
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
import { Xyi } from "../services/liveReplica/liveReplica.js";
import { P4n } from "../utils/announcedDirectories.js";
import { isIterativeHavenGateOn } from "../cli/print/agentResume.js";
import { takePendingSwitchSource, bk, runPostModelSwitchHooks } from "../utils/model/modelSwitchHooks.js";
import { forgetHeldWindows } from "../services/claudeAiLimits.js";
import { onKeepaliveModelSwitch } from "../services/api/cacheKeepalive.js";
import { withClientDataReseedOnModelChange, Qsr } from "../bridge/bridgeEnabled.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { reportEffortForModel, reportBridgeEffortMetadata } from "../bridge/applyFlagSettings.js";
import { C7e } from "../services/quotaAutoResume/quotaAutoResume.js";
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
import { frameUrlRowsToPersist, Zz, frameUrlToRecord } from "../tools/ArtifactTool/artifactResumeCarry.js";
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
function E() {
  return !isCompactPairWithheldFromRemote() && !isBridgeBindingForeign();
}
/**
 * 向 SDK 发出 status 事件前去掉 compact_error 字段（未开启时）。
 */
//@ chunk-tbfde207.js:1562-1732 placement
function stripCompactErrorForSdk(e) {
  if (
    e.type === "system" &&
    "subtype" in e &&
    e.subtype === "status" &&
    "compact_error" in e &&
    e.compact_error !== void 0 &&
    !E()
  )
    return { ...e, compact_error: void 0 };
  return e;
}
/**
 * 发出 system/status 事件（权限模式、压缩结果）。
 */
//@ chunk-tbfde207.js:1732-1994 placement
function emitStatusChange({
  status: status,
  permissionMode: permissionMode,
  compactResult: compactResult,
  compactError: compactError,
}) {
  try {
    if (!useShimmerAnimation(status)) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "status",
      status: status,
      ...(permissionMode !== void 0 && { permissionMode: permissionMode }),
      ...(compactResult !== void 0 && { compact_result: compactResult }),
      ...(compactError !== void 0 && E() && { compact_error: compactError }),
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * REPL 桥接开启部分消息时，把流事件作为 stream_event 通知转发给桥接端（附首 token 时间）。
 */
//@ chunk-tbfde207.js:1994-2181 placement
function forwardStreamEventToBridge(e) {
  try {
    if (!isReplBridgeActive() || !isBridgePartialMessagesEnabled()) return;
    if (zbe(e.event)) return;
    enqueueTaskNotification({
      type: "stream_event",
      event: e.event,
      parent_tool_use_id: null,
      ...(e.ttftMs !== void 0 && { ttft_ms: e.ttftMs }),
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 按键顺序浅比较两个对象。
 */
//@ chunk-tbfde207.js:2181-2588 placement = countUnseenAssistantTurns (1)
function shallowEqualTaskMaps(messages, dividerIndex) {
  let keys = Object.keys(messages),
    keys_2 = Object.keys(dividerIndex);
  if (keys.length !== keys_2.length) return !1;
  for (let count = 0; count < keys_2.length; count++) {
    let M = keys_2[count];
    if (M === void 0 || M !== keys[count]) return !1;
    let g = messages[M],
      c = dividerIndex[M];
    if (g === c) continue;
    if (g === void 0 || c === void 0) return !1;
    for (let m of Object.keys(c)) if (m !== "progress" && (!Object.hasOwn(g, m) || g[m] !== c[m])) return !1;
    for (let m of Object.keys(g)) if (m !== "progress" && !Object.hasOwn(c, m)) return !1;
  }
  return !0;
}
//@ chunk-tbfde207.js:2588-2687 placement
function C() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return;
  let e = null,
    r = [];
  (applyConfigEnvironmentVariables(),
    captureAdmin3PSteeringSnapshot(),
    e?.resetProviderBoundCachesIfMoved(r));
}
//@ chunk-tbfde207.js:2687-2854 placement
var externalStatusSchema = u({
  status_category: o(),
  status_detail: o(),
  needs_action: o(),
  recent_action: o().optional(),
  description: o().optional(),
  reply: o().optional(),
  standing: o().optional(),
});
/**
 * 把外部（远程会话）元数据转换为 AppState 片段，拒绝恢复 bypassPermissions 等不安全模式。
 */
//@ chunk-tbfde207.js:2854-3646 fingerprint = externalMetadataToAppState (0.435)
function externalMetadataToAppState(metadata) {
  return (prev) => {
    let toolPermissionContext = prev.toolPermissionContext;
    if (typeof metadata.permission_mode === "string") {
      let d = permissionModeFromString(metadata.permission_mode);
      if (
        (setAccountSetPermissionMode(d),
        d === "bypassPermissions" &&
          (isBypassPermissionsModeDisabled() || !toolPermissionContext.isBypassPermissionsModeAvailable))
      )
        (logForDebugging(
          "[externalMetadataToAppState] Refusing restored mode 'bypassPermissions' (disabled by settings/policy or session not launched with --dangerously-skip-permissions); falling back to 'default'",
          { level: "warn" },
        ),
          (d = "default"));
      try {
        if (
          ((toolPermissionContext = {
            ...transitionPermissionMode(toolPermissionContext.mode, d, toolPermissionContext),
            mode: d,
          }),
          d === "auto")
        )
          toolPermissionContext = stripDangerousPermissionsForAutoMode(toolPermissionContext);
      } catch (error) {
        logForDebugging(
          `[externalMetadataToAppState] transitionPermissionMode rejected restored mode '${d}': ${toError(error).message}`,
        );
      }
    }
    let safeParse = externalStatusSchema.safeParse(metadata.post_turn_summary);
    return {
      ...prev,
      toolPermissionContext: toolPermissionContext,
      ...(typeof metadata.is_ultraplan_mode === "boolean" && { isUltraplanMode: metadata.is_ultraplan_mode }),
      ...(safeParse.success && { postTurnSummary: safeParse.data }),
    };
  };
}
/**
 * AppState 变化时的副作用：权限模式切换、MCP roots、后台任务、模型等通知。
 */
//@ chunk-tbfde207.js:4053-9479 placement
function onAppStateChange({ newState: newState, oldState: oldState }, n, i, d, M) {
  let mode = oldState.toolPermissionContext.mode,
    mode_2 = newState.toolPermissionContext.mode,
    m = newState.proactivityLevel !== oldState.proactivityLevel;
  if (mode !== mode_2) {
    let s = toExternalPermissionMode(mode),
      a = toExternalPermissionMode(mode_2);
    if (s !== a) {
      let f = getPermissionModeAnalyticsFields({
          rule: "first-entry",
          prevMode: mode,
          newMode: mode_2,
          prevUltraplan: oldState.isUltraplanMode,
          newUltraplan: newState.isUltraplanMode,
        }),
        is_ultraplan_mode = f.is_ultraplan_mode;
      if ((i?.notifyMetadataChanged(f), i?.isWorkerPermissionModeRecordEnabled))
        i.notifyInternalMetadataChanged({ worker_permission_mode: a });
      if ((reportBridgePermissionMode(mode_2, is_ultraplan_mode), !i))
        emitStatusChange({ status: null, permissionMode: a });
    }
    (i?.notifyPermissionModeChanged(mode_2), syncSessionPermissionMode(mode_2));
  } else if (m) i?.notifyProactivityLevelChanged();
  if (mode !== mode_2 || m) {
    if (
      (syncRespawnFlag(
        "--permission-mode",
        ["--inherit-permission-mode"],
        cycleAllTeammateModes(
          mode_2,
          newState.proactivityLevel,
          hasLeftProactivityBaseline(newState.toolPermissionContext),
        ),
        void 0,
        d,
      ),
      m)
    )
      syncRespawnFlag("--proactivity", [], newState.proactivityLevel, void 0, d);
  }
  if (newState.toolPermissionContext !== oldState.toolPermissionContext) Xyi();
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
    P4n(newState.toolPermissionContext)
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
        if (!P(runningBackgroundTasks(oldState), y)) a.running_background_tasks = y;
        if (isIterativeHavenGateOn()) {
          let k = runningDirectAgents(newState);
          if (!P(runningDirectAgents(oldState), k)) a.running_foreground_agents = k;
        }
      }
      let resumableOrphanedAgents = i.resumableOrphanedAgents,
        filtered = resumableOrphanedAgents.filter((y) => !Object.hasOwn(newState.tasks, y.task_id));
      if (filtered.length !== resumableOrphanedAgents.length)
        ((i.resumableOrphanedAgents = filtered), (a.resumable_orphaned_agents = filtered));
      if (Object.keys(a).length > 0) i.notifyInternalMetadataChanged(a);
    }
    if (!s) {
      let a = backgroundTasksForMetadata(oldState),
        f = backgroundTasksForMetadata(newState);
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
        enqueueTaskNotification({ type: "system", subtype: "background_tasks_changed", tasks: f });
    }
  }
  let session = oldState.toolPermissionContext.alwaysAllowRules.session,
    session_2 = newState.toolPermissionContext.alwaysAllowRules.session;
  if (session !== session_2) {
    let s = session_2?.filter((a) => !a.startsWith("mcp__"));
    i?.notifyInternalMetadataChanged({ session_allow_rules: s?.length ? s : null });
  }
  if (
    newState.mainLoopModel !== oldState.mainLoopModel ||
    newState.mainLoopModelForSession !== oldState.mainLoopModelForSession ||
    newState.toolPermissionContext.mode !== oldState.toolPermissionContext.mode
  ) {
    let s = takePendingSwitchSource(n);
    try {
      let a = bk(oldState),
        f = bk(newState);
      if (a !== f) {
        if (
          (forgetHeldWindows(["seven_day_overage_included"]),
          newState.mainLoopModel !== oldState.mainLoopModel ||
            newState.mainLoopModelForSession !== oldState.mainLoopModelForSession)
        )
          onKeepaliveModelSwitch(n.host, a, f);
        if (!getIsRemoteMode())
          runPostModelSwitchHooks(n, {
            fromModel: a,
            toModel: f,
            requestedModel: s.requestedModel,
            source: s.source,
          });
        yhi(f);
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  if (newState.mainLoopModel !== oldState.mainLoopModel) {
    let mainLoopModel = newState.mainLoopModel,
      a = withClientDataReseedOnModelChange(() => setMainLoopModelOverride(mainLoopModel)),
      f = getMainLoopModel();
    try {
      reportBridgeModel(f);
    } catch (error) {
      logError(toError(error));
    }
    (reportEffortForModel(f, newState),
      C7e(),
      abortPrecomputeOnModelSwitch(n.precompute),
      Qsr(d, M, a),
      i?.notifyMetadataChanged({ model: mainLoopModel ?? getDefaultMainLoopModel() }),
      syncRespawnFlag("--model", ["-m"], mainLoopModel, void 0, d));
  }
  if (newState.fotwClaim?.phase === "granted" && oldState.fotwClaim?.phase !== "granted") C7e();
  if (
    !isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort) ||
    newState.settingsEffortTable !== oldState.settingsEffortTable
  )
    setMainLoopEffortState({
      sessionEffort: newState.sessionEffort,
      settingsEffortTable: newState.settingsEffortTable,
    });
  if (!isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)) {
    (scr(), getLearnedEffortCaps().clear());
    let s = i?.ultracodeActivePatch(isUltracodeActive(newState.ultracode, getMainLoopModel()));
    (i?.notifyMetadataChanged({ effort_level: effortSettingToString(newState.sessionEffort), ...s }),
      reportEffortForModel(getMainLoopModel(), newState),
      syncEffortRespawnFlag(newState.sessionEffort, d));
  }
  if (newState.fastMode !== oldState.fastMode) j(newState.fastMode === !0, d);
  if (newState.mainLoopModelForSession !== oldState.mainLoopModelForSession) {
    let s = getMainLoopModel();
    try {
      reportBridgeModel(s);
    } catch (error) {
      logError(toError(error));
    }
    if (
      (reportEffortForModel(s, newState),
      hasSessionIngressAuthForFastMode() &&
        (newState.mainLoopModelForSession === null || newState.mainLoopModelForSession === void 0) &&
        oldState.mainLoopModelForSession !== null &&
        oldState.mainLoopModelForSession !== void 0 &&
        newState.mainLoopModel === oldState.mainLoopModel)
    )
      (setMainLoopModelOverride(newState.mainLoopModel),
        i?.notifyMetadataChanged({ model: newState.mainLoopModel ?? getDefaultMainLoopModel() }));
  }
  if (newState.advisorModel !== oldState.advisorModel)
    syncRespawnFlag("--advisor", [], newState.advisorModel ?? null, void 0, d);
  if (i && newState.frameUrls !== oldState.frameUrls) {
    let s = isPublishToolEnabled(),
      a = isCcsTenant() ? isArtifactAccountAllowed() : isArtifactAdminAllowed(),
      filtered = frameUrlRowsToPersist(newState.frameUrls)
        .map(([, p]) => p)
        .filter((p) => (p.mcpPublishedHere === !0 ? a : s));
    if (filtered.length > 0 || (s && Zz(oldState.frameUrls).length > 0))
      i.notifyMetadataChanged({ artifacts: filtered.length === 0 ? null : filtered.map(frameUrlToRecord) });
  }
  if (i && !shallowEqualByKeys(newState.activeGoal, oldState.activeGoal)) {
    let activeGoal = newState.activeGoal;
    if ((i.notifyActiveGoalChanged(activeGoal), activeGoal)) {
      let { tokens_at_start: tokens_at_start, ...f } = serializeGoalState(activeGoal);
      i.notifyMetadataChanged({ goal: { ...f, last_reason: f.last_reason ?? null, met: !1 } });
    } else i.notifyMetadataChanged({ goal: null });
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
      if (
        (clearApiKeyHelperCache(),
        clearAwsCredentialsCache(),
        resetAwsAuthRefreshCooldown(),
        clearGcpCredentialsCache(),
        newState.settings.env !== oldState.settings.env)
      )
        C();
    } catch (error) {
      logForDebugging(
        `Failed to apply settings change (clear auth caches / re-apply env): ${toError(error).message}`,
        { level: "error" },
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
      oldState.ultracode === !0 &&
      newState.ultracode !== !0 &&
      newState.sessionEffort.kind === "level" &&
      isSameEffortSetting(newState.sessionEffort, oldState.sessionEffort)
    )
      (i?.notifyMetadataChanged({
        effort_level: effortSettingToString(newState.sessionEffort),
        ...i.ultracodeActivePatch(s),
      }),
        syncEffortRespawnFlag(newState.sessionEffort, d));
    else i?.notifyUltracodeActive(s);
    reportBridgeEffortMetadata({ ultracodeActive: s });
  }
}
//@ chunk-tbfde207.js:9479-9662 placement
function syncEffortRespawnFlag(e, r) {
  switch (e.kind) {
    case "inherit":
    case "default":
      syncRespawnFlag("--effort", [], null, void 0, r);
      return;
    case "level": {
      let n = effortLevelValue(e);
      if (n !== void 0 && isEffortLevel(n)) syncRespawnFlag("--effort", [], n, void 0, r);
      return;
    }
  }
}
//@ chunk-tbfde207.js:9662-9829 placement
function isObserverOwnedTask(e, r) {
  if (e.type !== "local_bash" && e.type !== "monitor_mcp" && e.type !== "monitor_ws") return !1;
  let n = e.agentId !== void 0 ? r[e.agentId] : void 0;
  return n !== void 0 && isObserverAgentTask(n);
}
/**
 * 子代理启动的遥测字段。
 */
//@ chunk-tbfde207.js:9829-10178 placement
function agentSpawnTelemetry(e) {
  return {
    agent_type: e.agentType,
    ...(e.selectedAgent && { is_built_in: e.selectedAgent.source === "built-in" }),
    forked_skill: e.forkedSkillName !== void 0,
    main_thread_spawned: e.spawnDepth === 1 && e.parentAgentId === void 0,
    default_launch: e.cwd === void 0 && e.launchedWithDefaults === !0,
    ...(e.cwd === void 0 && e.launchModel !== void 0 && { launch_model: e.launchModel }),
  };
}
/**
 * 列出正在运行的后台任务。
 */
//@ chunk-tbfde207.js:10178-10767 placement
function runningBackgroundTasks(e) {
  return Object.values(e.tasks)
    .filter(
      (r) =>
        waitForTaskCompletion(r) &&
        !isObserverAgentTask(r) &&
        (r.type === "local_bash" ||
          r.type === "monitor_mcp" ||
          r.type === "monitor_ws" ||
          r.type === "local_agent" ||
          r.type === "local_workflow"),
    )
    .map((r) => ({
      task_id: r.id,
      task_type: r.type,
      description: r.description,
      ...((r.type === "local_bash" || r.type === "monitor_mcp" || r.type === "monitor_ws") &&
        r.agentId !== void 0 && { owner_agent_id: r.agentId }),
      ...(r.type === "local_bash" && r.kind !== void 0 && { shell_kind: r.kind }),
      ...(r.type === "monitor_ws" && r.ambient && { ambient: !0 }),
      ...(r.type === "local_agent" && { ...agentSpawnTelemetry(r), run_id: getRunId(r.id) }),
      ...(isObserverOwnedTask(r, e.tasks) && { observer_owned: !0 }),
    }));
}
//@ chunk-tbfde207.js:10767-10853 placement
function P(e, r) {
  return e.length === r.length && r.every((n, i) => n.task_id === e[i]?.task_id);
}
/**
 * 列出主线程直接派生的运行中代理。
 */
//@ chunk-tbfde207.js:10853-11161 placement
function runningDirectAgents({ tasks: tasks }) {
  return Object.values(tasks).flatMap((r) =>
    r.type === "local_agent" &&
    r.status === "running" &&
    r.isBackgrounded === !1 &&
    r.directCall === !0 &&
    r.toolUseId !== void 0 &&
    r.spawnDepth === 1 &&
    r.parentAgentId === void 0
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
var O = ["condition", "setAt", "iterations", "tokensAtStart", "lastReason"];
/**
 * 把目标状态序列化为线上格式（condition、iterations、set_at、tokens_at_start、last_reason）。
 */
//@ chunk-tbfde207.js:11231-11401 placement
function serializeGoalState(e) {
  return {
    condition: e.condition,
    iterations: e.iterations,
    set_at: e.setAt,
    tokens_at_start: e.tokensAtStart,
    ...(e.lastReason !== void 0 && { last_reason: e.lastReason }),
  };
}
//@ chunk-tbfde207.js:11401-11503 placement
function shallowEqualByKeys(e, r) {
  if (e === r) return !0;
  if (e === void 0 || r === void 0) return !1;
  return O.every((n) => e[n] === r[n]);
}
//@ chunk-tbfde207.js:11503-11796 placement
function backgroundTasksForMetadata(e) {
  return Object.values(e.tasks)
    .filter(
      (r) =>
        waitForTaskCompletion(r) &&
        !isObserverAgentTask(r) &&
        !isHoldCappedMcpTask(r) &&
        r.type !== "post_turn_memory",
    )
    .map((r) => ({
      task_id: r.id,
      run_id: getRunId(r.id),
      task_type: r.type,
      subagent_type: getSelectableBackgroundTasks(r),
      description: r.description,
      parent_task_id: taskParentAgentId(r, e.tasks),
      ...(skipsTranscript(r) && { ambient: !0 }),
      ...(isAwaitedAgentTask(r) && { awaited: !0 }),
    }));
}
//@ chunk-tbfde207.js:11796-11871 placement
function j(e, r) {
  if (
    !e &&
    (!supportsFastMode(getMainLoopModel()) ||
      getFastModeUnavailableReasonCode(getMainLoopModel()) !== null ||
      wasCreditsExhaustedNotifiedThisTurn())
  )
    return;
  syncFastModeFlag(e, r);
}
/**
 * 发出 background_tasks_changed 事件。
 */
//@ chunk-tbfde207.js:11871-11953 placement
function emitBackgroundTasksChanged(e) {
  enqueueTaskNotification({
    type: "system",
    subtype: "background_tasks_changed",
    tasks: backgroundTasksForMetadata(e),
  });
}
//@ chunk-tbfde207.js:11953-12011 placement
function KPs(e, r, n) {
  e.settleUltracodeActive(isUltracodeActive(r, getMainLoopModel()), n);
}
/**
 * AppState 变化回调：把 tasks 等变化同步到外部（会话元数据、SDK 事件）。
 */
//@ chunk-5hmnvmag.js:264-500 callgraph-fingerprint = onChangeAppState (0.452)
function onChangeAppState({ newState: newState, oldState: oldState }, n, s, p) {
  if (
    (onAppStateChange({ newState: newState, oldState: oldState }, n, void 0, s, p),
    newState.expandedView !== oldState.expandedView)
  ) {
    let a = newState.expandedView === "tasks";
    saveGlobalConfig((current) => {
      if (current.showExpandedTodos === a) return current;
      return { ...current, showExpandedTodos: a };
    }, s);
  }
}

export {
  onAppStateChange,
  shallowEqualTaskMaps,
  KPs,
  stripCompactErrorForSdk,
  serializeGoalState,
  emitBackgroundTasksChanged,
  emitStatusChange,
  forwardStreamEventToBridge,
  onChangeAppState,
  externalMetadataToAppState,
};
