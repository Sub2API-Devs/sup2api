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
import { e } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function T() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_mango", !0) !== !1;
  } catch {
    return !0;
  }
}
//@ chunk-kgh2tnx9.js:19628-19663 sole-consumer
async function J(o, t) {
  return "keep";
}
/**
 * launchInvalidSettingsDialog：设置文件校验失败时的对话框（继续/修复/退出）。
 */
//@ chunk-kgh2tnx9.js:19663-19868 fingerprint = launchInvalidSettingsDialog (0.614)
async function launchInvalidSettingsDialog(root, props) {
  let { InvalidSettingsDialog: InvalidSettingsDialog } = await import("./chunk-td6byj4s.js");
  return showSetupDialog(root, (done) =>
    e(InvalidSettingsDialog, {
      settingsErrors: props.settingsErrors,
      onContinue: () => done(void 0),
      onFix: () => done("fix"),
      onExit: props.onExit,
    }),
  );
}
/**
 * launchTeleportResumeWrapper：teleport 恢复会话的包装界面（含组织配置同意与设置重载）。
 */
//@ chunk-kgh2tnx9.js:19868-20354 fingerprint = launchTeleportResumeWrapper (0.397)
async function launchTeleportResumeWrapper(root) {
  let [
      { TeleportResumeWrapper: TeleportResumeWrapper },
      { OrgConfigConsentHost: OrgConfigConsentHost },
      {
        HoldForSettingsReload: HoldForSettingsReload,
        enforceOrgConfigGateAfterStepSignIn: enforceOrgConfigGateAfterStepSignIn,
      },
    ] = await Promise.all([
      import("./chunk-4n4efnkg.js"),
      import("./chunk-8v082m33.js"),
      import("./chunk-xcagebg7.js"),
    ]),
    h,
    C = await showSetupDialog(root, (u) =>
      e(OrgConfigConsentHost, {
        children: e(TeleportResumeWrapper, {
          onComplete: u,
          onCancel: () => u(null),
          onSettingsReload: (S) => {
            h = S;
          },
          source: "cliArg",
        }),
      }),
    );
  if (C !== null && h !== void 0) {
    let u = h;
    (await showSetupDialog(root, (done) =>
      e(OrgConfigConsentHost, { children: e(HoldForSettingsReload, { reload: u, onDone: done }) }),
    ),
      await enforceOrgConfigGateAfterStepSignIn(root));
  }
  return C;
}
/**
 * launchTeleportRepoMismatchDialog：teleport 目标仓库与当前目录不一致时选择路径。
 */
//@ chunk-kgh2tnx9.js:20354-20583 fingerprint = launchTeleportRepoMismatchDialog (0.826)
async function launchTeleportRepoMismatchDialog(root, props) {
  let { TeleportRepoMismatchDialog: TeleportRepoMismatchDialog } = await import("./chunk-s1ks86z4.js");
  return showSetupDialog(root, (done) =>
    e(TeleportRepoMismatchDialog, {
      targetRepo: props.targetRepo,
      initialPaths: props.initialPaths,
      onSelectPath: done,
      onCancel: () => done(null),
      storageV5: props.storageV5,
    }),
  );
}
/**
 * 打开"传送目标主机未验证"对话框，返回用户是否确认继续。
 */
//@ chunk-kgh2tnx9.js:20583-20797 placement
async function launchTeleportHostUnverifiedDialog(o, t) {
  let { TeleportHostUnverifiedDialog: TeleportHostUnverifiedDialog } = await import("./chunk-3q9d50y1.js");
  return showSetupDialog(o, (n) =>
    e(TeleportHostUnverifiedDialog, {
      sessionRepo: t.sessionRepo,
      rawRemoteUrl: t.rawRemoteUrl,
      onConfirm: () => n(!0),
      onCancel: () => n(!1),
    }),
  );
}
/**
 * 远程文件模式对话框的启动函数（门面导出名 launchRemoteFileModeDialog），本构建为桩，直接返回 {pick: not_now}。与插件加载无关，旧版名 PluginSettingsSchema 配错。
 */
//@ chunk-kgh2tnx9.js:20797-20843 placement = PluginSettingsSchema (0.361)
async function PluginSettingsSchema(o, t) {
  return { pick: "not_now" };
}
/**
 * launchDeviceReenrollDialog：受信设备重新注册。
 */
//@ chunk-kgh2tnx9.js:20843-20988 callgraph-fingerprint = launchAssistantSessionChooser (0.176)
async function launchDeviceReenrollDialog(root, props = {}) {
  let { DeviceReenrollDialog: DeviceReenrollDialog } = await import("./chunk-a401dt71.js");
  return showSetupDialog(root, (done) => e(DeviceReenrollDialog, { onDone: done, onCancel: props.onCancel }));
}
/**
 * launchRemoteHomeSettingsDialog：首次把本机设置带入云会话的确认。
 */
//@ chunk-kgh2tnx9.js:20988-21179 layout
async function launchRemoteHomeSettingsDialog(o, t) {
  let { RemoteHomeSettingsDialog: RemoteHomeSettingsDialog } = await import("./chunk-gapztrwn.js");
  return showSetupDialog(o, (n) =>
    e(RemoteHomeSettingsDialog, {
      configHome: t.configHome,
      storageV5: t.storageV5,
      origin: "first_run",
      onDone: n,
    }),
  );
}
/**
 * launchDeviceMcpConsentDialog：设备级 MCP 服务器同意。
 */
//@ chunk-kgh2tnx9.js:21179-21343 layout
async function launchDeviceMcpConsentDialog(o, t) {
  let { DeviceMcpConsentDialog: DeviceMcpConsentDialog } = await import("./chunk-tmg3f18n.js");
  return showSetupDialog(o, (n) =>
    e(DeviceMcpConsentDialog, { servers: t.servers, storageV5: t.storageV5, onDone: n }),
  );
}
/**
 * launchDeviceMcpReconsentDialog：被扣留的设备 MCP 服务器重新同意。
 */
//@ chunk-kgh2tnx9.js:21343-21511 layout
async function launchDeviceMcpReconsentDialog(o, t) {
  let { DeviceMcpReconsentDialog: DeviceMcpReconsentDialog } = await import("./chunk-e7qhpt47.js");
  return showSetupDialog(o, (n) =>
    e(DeviceMcpReconsentDialog, { withheld: t.withheld, storageV5: t.storageV5, onDone: n }),
  );
}
/**
 * launchUnattendedServingConsentDialog：无人值守服务模式的同意。
 */
//@ chunk-kgh2tnx9.js:21511-21657 layout
async function launchUnattendedServingConsentDialog(o) {
  let { UnattendedServingConsentDialog: UnattendedServingConsentDialog } =
    await import("./chunk-d8vjfv68.js");
  return showSetupDialog(o, (r) => e(UnattendedServingConsentDialog, { onDone: r, exitOnCtrlCD: !0 }));
}
/**
 * launchCloudCreateChecklist：云会话创建清单（加载失败/取消各自上报）。
 */
//@ chunk-kgh2tnx9.js:21657-23396 layout
function launchCloudCreateChecklist(o, t) {
  let r = import("./chunk-fr4xjkmb.js"),
    n = T(),
    d = null,
    h = null,
    C = null,
    u = !1,
    S = !1,
    y = !1;
  function R(i) {
    if (!y) ((y = !0), i());
  }
  let D = !1;
  function P(i) {
    if (n && !D && hasTypedEarlyInput()) ((D = !0), i());
  }
  let w = r.then(
    (i) => i,
    (i) => (R(() => logFeatureBad("ccr_create_checklist", "load_failed")), logError(i), null),
  );
  function _({ CloudCreateChecklist: CloudCreateChecklist }, s) {
    let p = e(CloudCreateChecklist, {
      state: s,
      cancelling: C !== null,
      onCancel: () => M(CloudCreateChecklist),
      hasPromptLine: n,
      isQuestionWaiting: S,
    });
    if (h) h.update(p);
    else h = showScreen(o, p, { session: t.session });
  }
  function x(i) {
    (R(() => logFeatureSad("ccr_create_checklist", "cancelled")),
      P(() => logFeatureSad("ccr_create_prompt_line", "create_cancelled")));
    let s = t.alsoAtExit?.(),
      p = cloudCreateCancelMessage(i);
    return exitWithMessage(
      o,
      s === void 0
        ? p
        : `${p}
${s}`,
      { exitCode: 130, beforeExit: () => gracefulShutdown(130), unsentPrompt: takeEarlyInputFieldText() },
    );
  }
  function M(i) {
    let s = d;
    if (s === null || u || uploadProgressPhase(s) === "created") return;
    if (C !== null) {
      ((u = !0), logEvent("tengu_cloud_create_cancel_forced", { waited_ms: Date.now() - C }), x(s));
      return;
    }
    ((C = Date.now()),
      t.onCancel(),
      logEvent("tengu_cloud_create_cancelled", {
        phase: fromEnum(uploadProgressPhase(s)),
        request_sent: s.requestSent,
      }));
    try {
      _({ CloudCreateChecklist: i }, s);
    } catch (error) {
      logError(error);
    }
  }
  function A(i) {
    w.then((s) => {
      let p = d;
      if (s === null || p === null) return;
      if (i) h = null;
      try {
        _(s, p);
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
          let now = Date.now(),
            k = d === null;
          if (((d = reduceUploadProgress(d ?? initialUploadProgress(now), i, now)), _(s, d), k))
            logEvent("tengu_cloud_create_checklist_shown", {});
          if (i.kind === "created")
            (R(() => logFeatureOk("ccr_create_checklist")), P(() => logFeatureOk("ccr_create_prompt_line")));
        } catch (error) {
          (R(() => logFeatureBad("ccr_create_checklist", "render_failed")), logError(error));
        }
      });
    },
    repaint: () => A(!0),
    async untilTypingRests(i) {
      if (msUntilEarlyInputFieldRests() === 0) return;
      ((S = !0), A(!1));
      try {
        await untilEarlyInputFieldRests(i);
      } finally {
        S = !1;
      }
    },
    cancel() {
      w.then((i) => {
        if (i !== null) M(i.CloudCreateChecklist);
      });
    },
    failed() {
      (R(() => logFeatureBad("ccr_create_checklist", "create_failed")),
        P(() => logFeatureSad("ccr_create_prompt_line", "create_failed")));
    },
    exitCancelled: () => (u ? new Promise(() => {}) : x(d)),
  };
}
/**
 * launchProviderSetupWizard：外部构建为空实现。
 */
//@ chunk-kgh2tnx9.js:23396-23420 layout
async function launchProviderSetupWizard(o, t) {}
/**
 * launchResumeChooser：动态导入 ResumeConversation 组件并渲染会话选择器。
 */
//@ chunk-kgh2tnx9.js:23420-23795 fingerprint = launchResumeChooser (0.681)
async function launchResumeChooser(root, appProps, worktreePathsPromise, resumeProps) {
  let [d, { ResumeConversation: ResumeConversation }] = await Promise.all([
      worktreePathsPromise,
      import("./chunk-jde8wnzx.js"),
    ]),
    { session: session, storageV5: storageV5, credentials: credentials } = appProps,
    y = createReplMessageQueue(storageV5),
    R = o0n(session, appProps.initialState, (D) => onChangeAppState(D, session, storageV5, credentials));
  await renderAndRun(
    root,
    e(AppRoot, {
      session: session,
      storageV5: storageV5,
      messageQueue: y,
      store: R,
      writesExitHandoff: !0,
      getFpsMetrics: appProps.getFpsMetrics,
      stats: appProps.stats,
      children: e(ResumeConversation, { ...resumeProps, worktreePaths: d }),
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
function launchSnapshotUpdateDialog(e) {
  if (!e) return e;
  return e.filter((done) => SNAPSHOT_FIELD_POLICY[done.kind] === "keep");
}
//@ chunk-9s5t3vdq.js:231-302 placement
function o0n(e, o, p) {
  let t = createStore(o, p);
  return (e.engineStore.adopt(toSliceStore(t)), t);
}

export { o0n, launchSnapshotUpdateDialog };
