/**
 * dialogLaunchers.tsx
 *
 * 并入一个对话框懒加载启动器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/dialogLaunchers.tsx
 * pieces: chunk-9s5t3vdq.js (1), chunk-agvbmc7h.js (2), chunk-kgh2tnx9.js (15)
 * attribution: placement 3, affinity 1, fingerprint 5, sole-consumer 2, callgraph-fingerprint 1, layout 6
 */
import { createStore } from "./state/store.js";
import { toSliceStore } from "./state/sliceHelpers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./services/analytics/growthbook.js";
import { showSetupDialog, exitWithMessage, renderAndRun } from "./interactiveHelpers.js";
import { jsxProd_default } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  hasTypedEarlyInput,
  takeEarlyInputFieldText,
  msUntilEarlyInputFieldRests,
  untilEarlyInputFieldRests,
} from "./utils/earlyInput.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "./services/analytics/featureTelemetry.js";
import { logError } from "./utils/log.js";
import { showScreen } from "./utils/runSteps.js";
import {
  cloudCreateCancelMessage,
  uploadProgressPhase,
  reduceUploadProgress,
  initialUploadProgress,
} from "./components/TeleportProgress.js";
import { gracefulShutdown } from "./utils/gracefulShutdown.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum } from "./services/analytics/safeMetadata.js";
import { createReplMessageQueue } from "./replSessionSeat.js";
import { onChangeAppState } from "./state/onChangeAppState.js";
import { AppRoot } from "./components/AppRoot.js";

//@ chunk-agvbmc7h.js:2409-2672 affinity
var SNAPSHOT_FIELD_POLICY = {
  allowed_tools: "strip",
  avoid_prompts: "strip",
  permission_mode: "strip",
  working_directory: "strip",
  disallowed_tools: "keep",
  bash_command_clamp: "keep",
  sandbox_auto_allow_suspended: "keep",
  effort: "keep",
  model: "keep",
  max_thinking_tokens: "keep",
  flag_settings: "keep",
};
//@ chunk-agvbmc7h.js:2672-2742 fingerprint (2.1.88 match: launchSnapshotUpdateDialog, 0.585)
function launchSnapshotUpdateDialog(permissionLayers) {
  if (!permissionLayers) return permissionLayers;
  return permissionLayers.filter((done) => SNAPSHOT_FIELD_POLICY[done.kind] === "keep");
}
//@ chunk-9s5t3vdq.js:231-302 placement
/**
 * 函数 adoptEngineForLauncher（为启动器接管引擎）；位于「并入一个对话框懒加载启动器」模块。
 */
function adoptEngineForLauncher(session, initialState, middleware) {
  let store = createStore(initialState, middleware);
  session.engineStore.adopt(toSliceStore(store));
  return store;
}
//@ chunk-kgh2tnx9.js:19555-19628 sole-consumer
function isVelvetyMangoEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_mango", true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-kgh2tnx9.js:19628-19663 sole-consumer
/**
 * 函数 keepResult（恒返回 "keep"）；位于「并入一个对话框懒加载启动器」模块。
 */
async function keepResult(dialog, action) {
  return "keep";
}
//@ chunk-kgh2tnx9.js:19663-19868 fingerprint (2.1.88 match: launchInvalidSettingsDialog, 0.614)
/**
 * launchInvalidSettingsDialog：设置文件校验失败时的对话框（继续/修复/退出）。
 */
async function launchInvalidSettingsDialog(root, props) {
  let { InvalidSettingsDialog } = await import("./components/InvalidSettingsDialog.js");
  return showSetupDialog(root, (done) =>
    jsxProd_default(InvalidSettingsDialog, {
      settingsErrors: props.settingsErrors,
      onContinue: () => done(undefined),
      onFix: () => done("fix"),
      onExit: props.onExit,
    }),
  );
}
//@ chunk-kgh2tnx9.js:19868-20354 fingerprint (2.1.88 match: launchTeleportResumeWrapper, 0.397)
/**
 * launchTeleportResumeWrapper：teleport 恢复会话的包装界面（含组织配置同意与设置重载）。
 */
async function launchTeleportResumeWrapper(root) {
  let [
    { TeleportResumeWrapper },
    { OrgConfigConsentHost },
    { HoldForSettingsReload, enforceOrgConfigGateAfterStepSignIn },
  ] = await Promise.all([
    import("./components/TeleportResumeWrapper.js"),
    import("./components/OrgConfigConsentHost.js"),
    import("./components/TeleportError.js"),
  ]);
  let pendingReload;
  let result = await showSetupDialog(root, (done) =>
    jsxProd_default(OrgConfigConsentHost, {
      children: jsxProd_default(TeleportResumeWrapper, {
        onComplete: done,
        onCancel: () => done(null),
        onSettingsReload: (reload) => {
          pendingReload = reload;
        },
        source: "cliArg",
      }),
    }),
  );
  if (result !== null && pendingReload !== undefined) {
    let reload = pendingReload;
    await showSetupDialog(root, (done) =>
      jsxProd_default(OrgConfigConsentHost, {
        children: jsxProd_default(HoldForSettingsReload, {
          reload,
          onDone: done,
        }),
      }),
    );
    await enforceOrgConfigGateAfterStepSignIn(root);
  }
  return result;
}
//@ chunk-kgh2tnx9.js:20354-20583 fingerprint (2.1.88 match: launchTeleportRepoMismatchDialog, 0.826)
/**
 * launchTeleportRepoMismatchDialog：teleport 目标仓库与当前目录不一致时选择路径。
 */
async function launchTeleportRepoMismatchDialog(root, props) {
  let { TeleportRepoMismatchDialog } = await import("./components/TeleportRepoMismatchDialog.js");
  return showSetupDialog(root, (done) =>
    jsxProd_default(TeleportRepoMismatchDialog, {
      targetRepo: props.targetRepo,
      initialPaths: props.initialPaths,
      onSelectPath: done,
      onCancel: () => done(null),
      storageV5: props.storageV5,
    }),
  );
}
//@ chunk-kgh2tnx9.js:20583-20797 placement
/**
 * 打开"传送目标主机未验证"对话框，返回用户是否确认继续。
 */
async function launchTeleportHostUnverifiedDialog(root, options) {
  let { TeleportHostUnverifiedDialog } = await import("./components/TeleportHostUnverifiedDialog.lazy.js");
  return showSetupDialog(root, (done) =>
    jsxProd_default(TeleportHostUnverifiedDialog, {
      sessionRepo: options.sessionRepo,
      rawRemoteUrl: options.rawRemoteUrl,
      onConfirm: () => done(true),
      onCancel: () => done(false),
    }),
  );
}
//@ chunk-kgh2tnx9.js:20797-20843 placement (2.1.88 match: PluginSettingsSchema, 0.361)
/**
 * 远程文件模式对话框的启动函数（门面导出名 launchRemoteFileModeDialog），本构建为桩，直接返回 {pick: not_now}。与插件加载无关，旧版名 PluginSettingsSchema 配错。
 */
async function PluginSettingsSchema(root, options) {
  return {
    pick: "not_now",
  };
}
//@ chunk-kgh2tnx9.js:20843-20988 callgraph-fingerprint (2.1.88 match: launchAssistantSessionChooser, 0.176)
/**
 * launchDeviceReenrollDialog：受信设备重新注册。
 */
async function launchDeviceReenrollDialog(root, props = {}) {
  let { DeviceReenrollDialog } = await import("./components/DeviceReenrollDialog.lazy.js");
  return showSetupDialog(root, (done) =>
    jsxProd_default(DeviceReenrollDialog, {
      onDone: done,
      onCancel: props.onCancel,
    }),
  );
}
//@ chunk-kgh2tnx9.js:20988-21179 layout
/**
 * launchRemoteHomeSettingsDialog：首次把本机设置带入云会话的确认。
 */
async function launchRemoteHomeSettingsDialog(root, options) {
  let { RemoteHomeSettingsDialog } = await import("./components/RemoteHomeSettingsDialog.js");
  return showSetupDialog(root, (onDone) =>
    jsxProd_default(RemoteHomeSettingsDialog, {
      configHome: options.configHome,
      storageV5: options.storageV5,
      origin: "first_run",
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21179-21343 layout
/**
 * launchDeviceMcpConsentDialog：设备级 MCP 服务器同意。
 */
async function launchDeviceMcpConsentDialog(root, options) {
  let { DeviceMcpConsentDialog } = await import("./components/DeviceMcpConsentDialog.js");
  return showSetupDialog(root, (onDone) =>
    jsxProd_default(DeviceMcpConsentDialog, {
      servers: options.servers,
      storageV5: options.storageV5,
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21343-21511 layout
/**
 * launchDeviceMcpReconsentDialog：被扣留的设备 MCP 服务器重新同意。
 */
async function launchDeviceMcpReconsentDialog(root, options) {
  let { DeviceMcpReconsentDialog } = await import("./components/DeviceMcpReconsentDialog.js");
  return showSetupDialog(root, (onDone) =>
    jsxProd_default(DeviceMcpReconsentDialog, {
      withheld: options.withheld,
      storageV5: options.storageV5,
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21511-21657 layout
/**
 * launchUnattendedServingConsentDialog：无人值守服务模式的同意。
 */
async function launchUnattendedServingConsentDialog(root) {
  let { UnattendedServingConsentDialog } =
    await import("./components/UnattendedServingConsentDialog.lazy.js");
  return showSetupDialog(root, (onDone) =>
    jsxProd_default(UnattendedServingConsentDialog, {
      onDone,
      exitOnCtrlCD: true,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21657-23396 layout
/**
 * launchCloudCreateChecklist：云会话创建清单（加载失败/取消各自上报）。
 */
function launchCloudCreateChecklist(root, options) {
  let modulePromise = import("./components/cloud/CloudCreateChecklist.js");
  let hasPromptLine = isVelvetyMangoEnabled();
  let uploadProgress = null;
  let screenHandle = null;
  let cancelStartedAt = null;
  let isExiting = false;
  let isWaitingForInput = false;
  let hasLoggedOutcome = false;
  function logOnce(logFn) {
    if (!hasLoggedOutcome) {
      hasLoggedOutcome = true;
      logFn();
    }
  }
  let hasLoggedEarlyInputCancel = false;
  function logEarlyInputOnce(logFn) {
    if (hasPromptLine && !hasLoggedEarlyInputCancel && hasTypedEarlyInput()) {
      hasLoggedEarlyInputCancel = true;
      logFn();
    }
  }
  let moduleLoad = modulePromise.then(
    (loadedModule) => loadedModule,
    (error) => {
      logOnce(() => logFeatureBad("ccr_create_checklist", "load_failed"));
      logError(error);
      return null;
    },
  );
  function renderChecklist({ CloudCreateChecklist }, state) {
    let element = jsxProd_default(CloudCreateChecklist, {
      state,
      cancelling: cancelStartedAt !== null,
      onCancel: () => cancelChecklist(CloudCreateChecklist),
      hasPromptLine,
      isQuestionWaiting: isWaitingForInput,
    });
    if (screenHandle) screenHandle.update(element);
    else
      screenHandle = showScreen(root, element, {
        session: options.session,
      });
  }
  function exitCancelled(reason) {
    logOnce(() => logFeatureSad("ccr_create_checklist", "cancelled"));
    logEarlyInputOnce(() => logFeatureSad("ccr_create_prompt_line", "create_cancelled"));
    let exitExtra = options.alsoAtExit?.();
    let cancelMessage = cloudCreateCancelMessage(reason);
    return exitWithMessage(
      root,
      exitExtra === undefined
        ? cancelMessage
        : `${cancelMessage}
${exitExtra}`,
      {
        exitCode: 130,
        beforeExit: () => gracefulShutdown(130),
        unsentPrompt: takeEarlyInputFieldText(),
      },
    );
  }
  function cancelChecklist(CloudCreateChecklist) {
    let progressSnapshot = uploadProgress;
    if (progressSnapshot === null || isExiting || uploadProgressPhase(progressSnapshot) === "created") return;
    if (cancelStartedAt !== null) {
      isExiting = true;
      logEvent("tengu_cloud_create_cancel_forced", {
        waited_ms: Date.now() - cancelStartedAt,
      });
      exitCancelled(progressSnapshot);
      return;
    }
    cancelStartedAt = Date.now();
    options.onCancel();
    logEvent("tengu_cloud_create_cancelled", {
      phase: fromEnum(uploadProgressPhase(progressSnapshot)),
      request_sent: progressSnapshot.requestSent,
    });
    try {
      renderChecklist(
        {
          CloudCreateChecklist,
        },
        progressSnapshot,
      );
    } catch (error) {
      logError(error);
    }
  }
  function repaintChecklist(resetHandle) {
    moduleLoad.then((loadedModule) => {
      let state = uploadProgress;
      if (loadedModule === null || state === null) return;
      if (resetHandle) screenHandle = null;
      try {
        renderChecklist(loadedModule, state);
      } catch (error) {
        logError(error);
      }
    });
  }
  return {
    update(step) {
      moduleLoad.then((loadedModule) => {
        if (loadedModule === null) return;
        try {
          let now = Date.now();
          let isFirstRender = uploadProgress === null;
          uploadProgress = reduceUploadProgress(uploadProgress ?? initialUploadProgress(now), step, now);
          renderChecklist(loadedModule, uploadProgress);
          if (isFirstRender) logEvent("tengu_cloud_create_checklist_shown", {});
          if (step.kind === "created") {
            logOnce(() => logFeatureOk("ccr_create_checklist"));
            logEarlyInputOnce(() => logFeatureOk("ccr_create_prompt_line"));
          }
        } catch (error) {
          logOnce(() => logFeatureBad("ccr_create_checklist", "render_failed"));
          logError(error);
        }
      });
    },
    repaint: () => repaintChecklist(true),
    async untilTypingRests(restOptions) {
      if (msUntilEarlyInputFieldRests() === 0) return;
      isWaitingForInput = true;
      repaintChecklist(false);
      try {
        await untilEarlyInputFieldRests(restOptions);
      } finally {
        isWaitingForInput = false;
      }
    },
    cancel() {
      moduleLoad.then((loadedModule) => {
        if (loadedModule !== null) cancelChecklist(loadedModule.CloudCreateChecklist);
      });
    },
    failed() {
      logOnce(() => logFeatureBad("ccr_create_checklist", "create_failed"));
      logEarlyInputOnce(() => logFeatureSad("ccr_create_prompt_line", "create_failed"));
    },
    exitCancelled: () => (isExiting ? new Promise(() => {}) : exitCancelled(uploadProgress)),
  };
}
//@ chunk-kgh2tnx9.js:23396-23420 layout
/**
 * launchProviderSetupWizard：外部构建为空实现。
 */
async function launchProviderSetupWizard(root, options) {}
//@ chunk-kgh2tnx9.js:23420-23795 fingerprint (2.1.88 match: launchResumeChooser, 0.681)
/**
 * launchResumeChooser：动态导入 ResumeConversation 组件并渲染会话选择器。
 */
async function launchResumeChooser(root, appProps, worktreePathsPromise, resumeProps) {
  let [worktreePaths, { ResumeConversation }] = await Promise.all([
    worktreePathsPromise,
    import("./screens/ResumeConversation.js"),
  ]);
  let { session, storageV5, credentials } = appProps;
  let messageQueue = createReplMessageQueue(storageV5);
  let store = adoptEngineForLauncher(session, appProps.initialState, (nextAppState) =>
    onChangeAppState(nextAppState, session, storageV5, credentials),
  );
  await renderAndRun(
    root,
    jsxProd_default(AppRoot, {
      session,
      storageV5,
      messageQueue,
      store,
      writesExitHandoff: true,
      getFpsMetrics: appProps.getFpsMetrics,
      stats: appProps.stats,
      children: jsxProd_default(ResumeConversation, {
        ...resumeProps,
        worktreePaths,
      }),
    }),
    session,
    storageV5,
    credentials,
  );
}
export {
  adoptEngineForLauncher,
  launchSnapshotUpdateDialog,
  launchCloudCreateChecklist,
  launchDeviceMcpConsentDialog,
  launchDeviceMcpReconsentDialog,
  launchDeviceReenrollDialog,
  launchInvalidSettingsDialog,
  launchProviderSetupWizard,
  PluginSettingsSchema,
  launchRemoteHomeSettingsDialog,
  launchResumeChooser,
  keepResult,
  launchTeleportHostUnverifiedDialog,
  launchTeleportRepoMismatchDialog,
  launchTeleportResumeWrapper,
  launchUnattendedServingConsentDialog,
};
