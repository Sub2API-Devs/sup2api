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
import { createStore } from "./state/store.js";
import { toSliceStore } from "./state/sliceHelpers.js";

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
async function keepResult(o, t) {
  return "keep";
}
//@ chunk-kgh2tnx9.js:19663-19868 fingerprint = launchInvalidSettingsDialog (0.614)
/**
 * launchInvalidSettingsDialog：设置文件校验失败时的对话框（继续/修复/退出）。
 */
async function launchInvalidSettingsDialog(root, props) {
  let { InvalidSettingsDialog } = await import("./chunk-td6byj4s.js");
  return showSetupDialog(root, (done) =>
    jsxProd_default(InvalidSettingsDialog, {
      settingsErrors: props.settingsErrors,
      onContinue: () => done(undefined),
      onFix: () => done("fix"),
      onExit: props.onExit,
    }),
  );
}
//@ chunk-kgh2tnx9.js:19868-20354 fingerprint = launchTeleportResumeWrapper (0.397)
/**
 * launchTeleportResumeWrapper：teleport 恢复会话的包装界面（含组织配置同意与设置重载）。
 */
async function launchTeleportResumeWrapper(root) {
  let [
    { TeleportResumeWrapper },
    { OrgConfigConsentHost },
    { HoldForSettingsReload, enforceOrgConfigGateAfterStepSignIn },
  ] = await Promise.all([
    import("./chunk-4n4efnkg.js"),
    import("./chunk-8v082m33.js"),
    import("./chunk-xcagebg7.js"),
  ]);
  let h;
  let C = await showSetupDialog(root, (done) =>
    jsxProd_default(OrgConfigConsentHost, {
      children: jsxProd_default(TeleportResumeWrapper, {
        onComplete: done,
        onCancel: () => done(null),
        onSettingsReload: (S) => {
          h = S;
        },
        source: "cliArg",
      }),
    }),
  );
  if (C !== null && h !== undefined) {
    let reload = h;
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
  return C;
}
//@ chunk-kgh2tnx9.js:20354-20583 fingerprint = launchTeleportRepoMismatchDialog (0.826)
/**
 * launchTeleportRepoMismatchDialog：teleport 目标仓库与当前目录不一致时选择路径。
 */
async function launchTeleportRepoMismatchDialog(root, props) {
  let { TeleportRepoMismatchDialog } = await import("./chunk-s1ks86z4.js");
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
async function launchTeleportHostUnverifiedDialog(o, t) {
  let { TeleportHostUnverifiedDialog } = await import("./chunk-3q9d50y1.js");
  return showSetupDialog(o, (n) =>
    jsxProd_default(TeleportHostUnverifiedDialog, {
      sessionRepo: t.sessionRepo,
      rawRemoteUrl: t.rawRemoteUrl,
      onConfirm: () => n(true),
      onCancel: () => n(false),
    }),
  );
}
//@ chunk-kgh2tnx9.js:20797-20843 placement = PluginSettingsSchema (0.361)
/**
 * 远程文件模式对话框的启动函数（门面导出名 launchRemoteFileModeDialog），本构建为桩，直接返回 {pick: not_now}。与插件加载无关，旧版名 PluginSettingsSchema 配错。
 */
async function PluginSettingsSchema(o, t) {
  return {
    pick: "not_now",
  };
}
//@ chunk-kgh2tnx9.js:20843-20988 callgraph-fingerprint = launchAssistantSessionChooser (0.176)
/**
 * launchDeviceReenrollDialog：受信设备重新注册。
 */
async function launchDeviceReenrollDialog(root, props = {}) {
  let { DeviceReenrollDialog } = await import("./chunk-a401dt71.js");
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
async function launchRemoteHomeSettingsDialog(o, t) {
  let { RemoteHomeSettingsDialog } = await import("./chunk-gapztrwn.js");
  return showSetupDialog(o, (onDone) =>
    jsxProd_default(RemoteHomeSettingsDialog, {
      configHome: t.configHome,
      storageV5: t.storageV5,
      origin: "first_run",
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21179-21343 layout
/**
 * launchDeviceMcpConsentDialog：设备级 MCP 服务器同意。
 */
async function launchDeviceMcpConsentDialog(o, t) {
  let { DeviceMcpConsentDialog } = await import("./chunk-tmg3f18n.js");
  return showSetupDialog(o, (onDone) =>
    jsxProd_default(DeviceMcpConsentDialog, {
      servers: t.servers,
      storageV5: t.storageV5,
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21343-21511 layout
/**
 * launchDeviceMcpReconsentDialog：被扣留的设备 MCP 服务器重新同意。
 */
async function launchDeviceMcpReconsentDialog(o, t) {
  let { DeviceMcpReconsentDialog } = await import("./chunk-e7qhpt47.js");
  return showSetupDialog(o, (onDone) =>
    jsxProd_default(DeviceMcpReconsentDialog, {
      withheld: t.withheld,
      storageV5: t.storageV5,
      onDone,
    }),
  );
}
//@ chunk-kgh2tnx9.js:21511-21657 layout
/**
 * launchUnattendedServingConsentDialog：无人值守服务模式的同意。
 */
async function launchUnattendedServingConsentDialog(o) {
  let { UnattendedServingConsentDialog } = await import("./chunk-d8vjfv68.js");
  return showSetupDialog(o, (onDone) =>
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
function launchCloudCreateChecklist(o, t) {
  let r = import("./chunk-fr4xjkmb.js");
  let n = isVelvetyMangoEnabled();
  let state = null;
  let h = null;
  let C = null;
  let u = false;
  let S = false;
  let y = false;
  function R(i) {
    if (!y) {
      y = true;
      i();
    }
  }
  let D = false;
  function P(i) {
    if (n && !D && hasTypedEarlyInput()) {
      D = true;
      i();
    }
  }
  let w = r.then(
    (i) => i,
    (error) => {
      R(() => logFeatureBad("ccr_create_checklist", "load_failed"));
      logError(error);
      return null;
    },
  );
  function _({ CloudCreateChecklist }, state) {
    let p = jsxProd_default(CloudCreateChecklist, {
      state,
      cancelling: C !== null,
      onCancel: () => M(CloudCreateChecklist),
      hasPromptLine: n,
      isQuestionWaiting: S,
    });
    if (h) h.update(p);
    else
      h = showScreen(o, p, {
        session: t.session,
      });
  }
  function x(i) {
    R(() => logFeatureSad("ccr_create_checklist", "cancelled"));
    P(() => logFeatureSad("ccr_create_prompt_line", "create_cancelled"));
    let s = t.alsoAtExit?.();
    let p = cloudCreateCancelMessage(i);
    return exitWithMessage(
      o,
      s === undefined
        ? p
        : `${p}
${s}`,
      {
        exitCode: 130,
        beforeExit: () => gracefulShutdown(130),
        unsentPrompt: takeEarlyInputFieldText(),
      },
    );
  }
  function M(CloudCreateChecklist) {
    let state_2 = state;
    if (state_2 === null || u || uploadProgressPhase(state_2) === "created") return;
    if (C !== null) {
      u = true;
      logEvent("tengu_cloud_create_cancel_forced", {
        waited_ms: Date.now() - C,
      });
      x(state_2);
      return;
    }
    C = Date.now();
    t.onCancel();
    logEvent("tengu_cloud_create_cancelled", {
      phase: fromEnum(uploadProgressPhase(state_2)),
      request_sent: state_2.requestSent,
    });
    try {
      _(
        {
          CloudCreateChecklist,
        },
        state_2,
      );
    } catch (error) {
      logError(error);
    }
  }
  function A(i) {
    w.then((s) => {
      let state_2 = state;
      if (s === null || state_2 === null) return;
      if (i) h = null;
      try {
        _(s, state_2);
      } catch (error) {
        logError(error);
      }
    });
  }
  return {
    update(i) {
      w.then((s) => {
        if (s === null) return;
        try {
          let now = Date.now();
          let k = state === null;
          state = reduceUploadProgress(state ?? initialUploadProgress(now), i, now);
          _(s, state);
          if (k) logEvent("tengu_cloud_create_checklist_shown", {});
          if (i.kind === "created") {
            R(() => logFeatureOk("ccr_create_checklist"));
            P(() => logFeatureOk("ccr_create_prompt_line"));
          }
        } catch (error) {
          R(() => logFeatureBad("ccr_create_checklist", "render_failed"));
          logError(error);
        }
      });
    },
    repaint: () => A(true),
    async untilTypingRests(i) {
      if (msUntilEarlyInputFieldRests() === 0) return;
      S = true;
      A(false);
      try {
        await untilEarlyInputFieldRests(i);
      } finally {
        S = false;
      }
    },
    cancel() {
      w.then((i) => {
        if (i !== null) M(i.CloudCreateChecklist);
      });
    },
    failed() {
      R(() => logFeatureBad("ccr_create_checklist", "create_failed"));
      P(() => logFeatureSad("ccr_create_prompt_line", "create_failed"));
    },
    exitCancelled: () => (u ? new Promise(() => {}) : x(state)),
  };
}
//@ chunk-kgh2tnx9.js:23396-23420 layout
/**
 * launchProviderSetupWizard：外部构建为空实现。
 */
async function launchProviderSetupWizard(o, t) {}
//@ chunk-kgh2tnx9.js:23420-23795 fingerprint = launchResumeChooser (0.681)
/**
 * launchResumeChooser：动态导入 ResumeConversation 组件并渲染会话选择器。
 */
async function launchResumeChooser(root, appProps, worktreePathsPromise, resumeProps) {
  let [worktreePaths, { ResumeConversation }] = await Promise.all([
    worktreePathsPromise,
    import("./chunk-jde8wnzx.js"),
  ]);
  let { session, storageV5, credentials } = appProps;
  let messageQueue = createReplMessageQueue(storageV5);
  let store = adoptEngineForLauncher(session, appProps.initialState, (D) =>
    onChangeAppState(D, session, storageV5, credentials),
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
//@ chunk-agvbmc7h.js:2672-2742 fingerprint = launchSnapshotUpdateDialog (0.585)
function launchSnapshotUpdateDialog(permissionLayers) {
  if (!permissionLayers) return permissionLayers;
  return permissionLayers.filter((done) => SNAPSHOT_FIELD_POLICY[done.kind] === "keep");
}
//@ chunk-9s5t3vdq.js:231-302 placement
/**
 * 函数 adoptEngineForLauncher（为启动器接管引擎）；位于「并入一个对话框懒加载启动器」模块。
 */
function adoptEngineForLauncher(session, initialState, p) {
  let store = createStore(initialState, p);
  session.engineStore.adopt(toSliceStore(store));
  return store;
}
export { adoptEngineForLauncher, launchSnapshotUpdateDialog };
