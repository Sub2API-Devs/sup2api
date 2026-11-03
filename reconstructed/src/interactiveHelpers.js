/**
 * interactiveHelpers.tsx
 *
 * 并入旧版已有路径：交互模式启动辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/interactiveHelpers.tsx
 * pieces: chunk-20skp6hd.js (6), chunk-7fw14qgv.js (27), chunk-d4eg9at2.js (1)
 * attribution: placement 6, sole-consumer 3, affinity 2, facade-exports 13, layout 9, fingerprint 1
 */
import { homedir } from "os";
import { openSync, writeSync } from "fs";
import { env } from "./utils/env.js";
import {
  checkHasTrustDialogAccepted,
  saveGlobalConfig,
  getWorkspacePersistedTrustKey,
  isWorkspacePersistedTrusted,
  isLocalSettingsGitTracked,
  markConfigBootPhaseComplete,
  getGlobalConfig,
} from "./utils/config.js";
import {
  setSessionTrustAccepted,
  getSessionApprovedMcpServers,
  getRootSession,
  getOriginalCwd,
  getIsRemoteMode,
  setHomeTrustDialogAccepted,
  getAllowedChannels,
  setAllowedChannels,
  setHasDevChannels,
  isOTelInitPending,
  getMeterProvider,
  setStatsStore,
  getStrictMcpConfig,
} from "./bootstrap/state.js";
import { primePlanSlugCollisions } from "./utils/plans.js";
import { blockingSettingsErrors } from "./utils/settings/settingsNotices.js";
import { uniq } from "./utils/collections.js";
import { ql, plural } from "./utils/stringUtils.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "./services/analytics/featureTelemetry.js";
import { logError } from "./utils/log.js";
import { toError, errorMessage } from "./utils/errors.js";
import { showScreen, runSteps } from "./utils/runSteps.js";
import { e, r } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "./ink/components/Text.js";
import { startDeferredPrefetches } from "./cli/startup/prepareSession.js";
import { recordFullscreenRenderFailure } from "./utils/fullscreenBootGuard.js";
import {
  emitExitMessage,
  gracefulShutdown,
  shutdownCoordinators,
  gracefulShutdownSync,
} from "./utils/gracefulShutdown.js";
import { isBgSession } from "./utils/concurrentSessions.js";
import { isSupervisedMode, isBareMode, isEnvTruthy } from "./utils/envUtils.js";
import { trackError } from "./services/errorTracking/errorTracking.js";
import { Pke } from "./utils/fsJunctions.js";
import { logForDebugging } from "./utils/debug.js";
import {
  resetGrowthBook,
  initializeGrowthBook,
  resetUserData,
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "./services/analytics/growthbook.js";
import { prefetchGitStatus } from "./context.js";
import { applyConfigEnvironmentVariables } from "./utils/managedEnvApply.js";
import { releaseGrowthBookHold, shouldHoldForOnboarding } from "./cli/startup/startupWorkGate.js";
import { capturePolicySnapshot } from "./utils/settings/policySnapshot.js";
import { initializeTelemetryAfterTrust, initializeTelemetryForExit } from "./entrypoints/init.js";
import { onChangeAppState } from "./state/onChangeAppState.js";
import { hasUngatedTrustSources } from "./components/TrustDialog/utils.js";
import { inheritsRelaunchHomeTrust } from "./utils/relaunchHomeTrust.js";
import {
  clearPluginCache,
  shouldFillPluginLoadWithStore,
  loadAllPluginsCacheOnly,
} from "./utils/plugins/pluginLoader.js";
import { shouldShowExternalIncludesDialog } from "./components/ClaudeMdExternalIncludesDialog.js";
import { getExternalClaudeMdIncludes, getMemoryFilesCached } from "./utils/claudemd.js";
import { updateGithubRepoPathMapping } from "./utils/githubRepoPathMapping.js";
import { updateDeepLinkTerminalPreference } from "./utils/deepLink/terminalPreference.js";
import { registerCleanup } from "./utils/cleanupRegistry.js";
import { isQualifiedForGrove, wasGroveRecentlyConfirmed } from "./services/api/grove.js";
import { logEvent } from "./services/analytics/index.js";
import { getProTrialStatus } from "./services/api/proTrial.js";
import { getUnapprovedCustomApiKey } from "./utils/auth.js";
import {
  apply3PDefaultFallbacks,
  withProbeDeadline,
  TIER_LABELS,
} from "./utils/model/thirdPartyDefaultFallbacks.js";
import { hasSkipDangerousModePermissionPrompt } from "./utils/settings/settings.js";
import { getAPIProvider } from "./utils/model/providers.js";
import { withTimeout } from "./utils/sleep.js";
import { w } from "../vendor/react/compiler-runtime.js";
import { P, y, R, j } from "../vendor/react/cjs/react.production.js";
import { fromEnum } from "./services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../runtime/bun-runtime.js";
import { useApp } from "./ink/components/Input.js";
import { getBaseRenderOptions } from "./utils/renderOptions.js";
import { FpsTracker } from "./utils/fpsTracker.js";
import { createStatsStore } from "./context/stats.js";
import { isSynchronizedOutputSupported } from "./ink/terminal.js";
import { collectProjectMcpServerNames } from "./services/mcpServerApproval.js";
import { getEffectiveProjectMcpServerStatus } from "./services/mcp/utils.js";
import { formatMcpServerLabel } from "./utils/plugins/lspPluginIntegration.js";
import { MCPServerApprovalDialog } from "./components/MCPServerApprovalDialog.js";
import { MCPServerMultiselectDialog } from "./components/MCPServerMultiselectDialog.js";
import { readJobState, writeStateAtomic, logJobWriteError } from "./services/daemon/jobState.js";
import { RenderOnceAndExit } from "./utils/staticRender.js";
import { formatMessageLines } from "./cli/handlers/plugins.js";
import { exitAfterAnalyticsFlush } from "./cli/exit.js";

//@ chunk-7fw14qgv.js:2904-2934 sole-consumer
function Ze(ot) {
  return ot(!1);
}
//@ chunk-7fw14qgv.js:2934-2975 sole-consumer
function tt(nt) {
  return nt.execRelaunch();
}
//@ chunk-7fw14qgv.js:2975-3035 sole-consumer
function Ve(it) {
  (it(), import("./chunk-sv7j935w.js").then(tt));
}
//@ chunk-7fw14qgv.js:3035-3085 affinity
function et(at) {
  return { ...at, phase: "save-failed" };
}
//@ chunk-7fw14qgv.js:3085-3142 facade-exports
function adoptPersistedWorkspaceTrust(o) {
  if (env.CLAUBBIT || !checkHasTrustDialogAccepted()) return;
  (setSessionTrustAccepted(!0), primePlanSlugCollisions(o));
}
//@ chunk-7fw14qgv.js:3142-3713 facade-exports
function completeOnboarding(o) {
  saveGlobalConfig(
    (current) => ({
      ...current,
      hasCompletedOnboarding: !0,
      lastOnboardingVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    }),
    o,
  );
}
//@ chunk-7fw14qgv.js:3713-4336 facade-exports
function projectMcpApprovalStep(o, p) {
  return async (u) => {
    let x = await getPendingProjectMcpServers(o),
      T = blockingSettingsErrors();
    if (x.pendingServers.length === 0) return null;
    if (T.length > 0) {
      let joined = uniq(T.flatMap((C) => (C.file ? [ql(C.file)] : []))).join(", ");
      return (
        logFeatureSad("mcp_project_approval_dialog", "mcp_project_approval_skipped_settings_errors"),
        p({
          key: "mcp-approval-skipped",
          text: `skipping .mcp.json server approval (settings errors${joined ? ` in ${joined}` : ""}) \xB7 run \`claude doctor\` to list them, fix them, then restart`,
        }),
        null
      );
    }
    try {
      return await projectMcpApprovalDialog(
        x,
        (A) => {
          try {
            let C = mcpApprovalPersistNotice(A);
            if (C) p(C);
          } catch (error) {
            logError(toError(error));
          } finally {
            u();
          }
        },
        o,
      );
    } catch (error) {
      throw (logFeatureBad("mcp_project_approval_dialog", "mcp_project_approval_dialog_threw"), error);
    }
  };
}
/**
 * 项目 MCP 批准对话框结束后的提示：选择保存失败、或工作区未被显式信任导致只对本会话生效时，返回对应的提示文本，否则 null。
 */
//@ chunk-7fw14qgv.js:4336-5082 layout
function mcpApprovalPersistNotice(result) {
  if (result.persistFailed)
    return (
      logFeatureBad("mcp_project_approval_dialog", "mcp_approval_persist_failed"),
      {
        key: "mcp-approval-persist-failed",
        text: "one or more of your MCP server choices could not be saved (check permissions on .claude/settings.local.json) \xB7 you will be asked again next startup",
      }
    );
  let workspaceKey = getWorkspacePersistedTrustKey();
  if (
    getSessionApprovedMcpServers().some((u) => u.workspaceKey === workspaceKey) &&
    !isWorkspacePersistedTrusted() &&
    isLocalSettingsGitTracked({ onIndeterminate: "tracked" })
  )
    return (
      logFeatureSad("mcp_project_approval_dialog", "mcp_approval_persist_gated"),
      {
        key: "mcp-approval-persist-gated",
        text: "your MCP server choices apply to this session only (workspace not explicitly trusted; .claude/settings.local.json is gated) \xB7 to persist, add them to enabledMcpjsonServers in ~/.claude/settings.json",
      }
    );
  return (logFeatureOk("mcp_project_approval_dialog"), null);
}
/**
 * endInkWithError：在 Ink 里显示红色错误后卸载并退出。
 */
//@ chunk-7fw14qgv.js:5082-5168 facade-exports = exitWithMessage (0.308)
async function endInkWithError(o, p) {
  (showScreen(o, e(Text, { color: "error", children: p })), o.unmount(), await recordExitWithMessageCause(p));
}
//@ chunk-7fw14qgv.js:5168-5313 layout
async function recordExitWithMessageCause(o) {
  let { setBgExitCause: setBgExitCause, setBgExitDetail: setBgExitDetail } =
    await import("./chunk-ped6a95p.js");
  (setBgExitCause("exit_with_message"), setBgExitDetail("exit_with_message", o));
}
/**
 * 显示“Loading your organization's managed settings…”等待提示。
 */
//@ chunk-7fw14qgv.js:5313-5443 facade-exports
function showSettingsLoadHold(o) {
  showScreen(
    o,
    e(Box, {
      paddingX: 1,
      children: e(Text, { dimColor: !0, children: "Loading your organization's managed settings\u2026" }),
    }),
  );
}
/**
 * exitWithError：exitWithMessage 的错误色版本（可带未发送的提示）。
 */
//@ chunk-7fw14qgv.js:5443-5531 facade-exports = exitWithError (0.655)
async function exitWithError(o, p, u, x) {
  return exitWithMessage(o, p, { color: "error", beforeExit: u, unsentPrompt: x });
}
/**
 * exitWithMessage：渲染一段（可带颜色的）文本后卸载 Ink、执行 beforeExit、优雅退出。
 */
//@ chunk-7fw14qgv.js:5531-6114 facade-exports
async function exitWithMessage(o, p, u) {
  let x = u?.color,
    T = u?.exitCode ?? 1,
    A = x ? e(Text, { color: x, children: p }) : e(Text, { children: p });
  if (
    (showScreen(
      o,
      u?.unsentPrompt
        ? r(Box, {
            flexDirection: "column",
            children: [
              A,
              e(Text, {
                children: `
Your message was not sent:
${u.unsentPrompt}`,
              }),
            ],
          })
        : A,
    ),
    o.unmount(),
    await u?.beforeExit?.(),
    T !== 0)
  )
    await recordExitWithMessageCause(p);
  let { flushAnalyticsSinks: flushAnalyticsSinks } = await import("./chunk-r3wdn2dp.js");
  await flushAnalyticsSinks();
  let { drainRegisteredWriteQueues: drainRegisteredWriteQueues } = await import("./chunk-kqc5kgje.js"),
    { withTimeout: withTimeout } = await import("./chunk-c1wxfrj3.js");
  (await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exitWithMessage)").catch(
    () => {},
  ),
    process.exit(T));
}
/**
 * showSetupDialog：在已有 Ink 根上显示一个对话框，返回其 done 回调的值。
 */
//@ chunk-7fw14qgv.js:6114-6275 facade-exports = showSetupDialog (0.644)
function showSetupDialog(root, renderer, options) {
  return new Promise((x, T) => {
    runSteps(
      root,
      [
        (done) =>
          renderer((C) => {
            (x(C), done());
          }),
      ],
      { session: getRootSession(), onChangeAppState: options?.onChangeAppState, marksJobBlocked: !0 },
    ).catch(T);
  });
}
/**
 * renderAndRun：把元素挂到 Ink 根，等待退出；渲染期未处理异常写入错误并退出。
 */
//@ chunk-7fw14qgv.js:6275-6914 facade-exports
async function renderAndRun(o, p, u, x, T) {
  let A = showScreen(o, p);
  (markConfigBootPhaseComplete(), startDeferredPrefetches(u, x, T));
  try {
    if (
      (await Promise.race([o.waitUntilExit().then(() => "exited"), A.replaced.then(() => "replaced")])) ===
      "replaced"
    )
      return;
  } catch (error) {
    let b = toError(error),
      F = (await recordFullscreenRenderFailure().catch(() => !1))
        ? " It happened while the fullscreen renderer was starting, so the next launch will use the classic renderer (CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 forces that any time)."
        : "";
    if (
      (emitExitMessage(`Claude Code exited after an unrecoverable interface error (${b.message}).${F}`),
      isBgSession() || isSupervisedMode())
    )
      throw error;
    try {
      trackError(b, "unhandled_rejection");
    } catch {}
    await gracefulShutdown(1, "other");
    return;
  }
  (await shutdownCoordinators.of(u.host).runBeforeInteractiveShutdown(), await gracefulShutdown(0));
}
//@ chunk-7fw14qgv.js:6914-6955 layout
var POST_ONBOARDING_GB_TIMEOUT_MS = 2000,
  POST_ONBOARDING_GB_LABEL = "GB post-onboarding init";
/**
 * 显示启动前的设置屏（showSetupScreens）：工作区信任、onboarding、MCP 项目审批、Chrome 提议等，返回 onboarding 结果。
 */
//@ chunk-7fw14qgv.js:6955-8171 facade-exports
async function showSetupScreens(o, p, u, x, T, A, C, b, E, F, M) {
  let k = {
      onboardingShown: !1,
      onboardingSkippedSignIn: !1,
      mcpApprovalSkipWarning: null,
      claudeInChromeAccepted: !1,
    },
    O = (I) => {
      k.mcpApprovalSkipWarning = I;
    };
  if (isBgSession() || env.CLAUDE_BRIDGE_REATTACH_SESSION) {
    let I = checkHasTrustDialogAccepted(),
      h = I || (env.CLAUDE_BG_WORKSPACE_TRUSTED === !0 && Pke(getOriginalCwd(), homedir()));
    if (!h)
      logForDebugging(
        "Workspace trust is not recorded for this directory; continuing as an untrusted session (hooks and project settings env stay off)",
        { level: "warn" },
      );
    let _ = [
      () => {
        if (h) setSessionTrustAccepted(!0);
        if (
          (resetGrowthBook({ preservePendingExposures: !0 }),
          initializeGrowthBook().catch((D) => logError(toError(D))),
          h)
        )
          (prefetchGitStatus(o),
            import("./chunk-c7p56eem.js")
              .then((D) => D.loadHooksModulesHeldForTrust(E, F))
              .catch((D) => logError(toError(D))));
        return null;
      },
      projectMcpApprovalStep(E, O),
      () => {
        if (h)
          (applyConfigEnvironmentVariables(),
            import("./chunk-fhdzwff4.js").then((D) => D.maybePrewarmRecallIndex(o)),
            primePlanSlugCollisions(E));
        if ((releaseGrowthBookHold(o.host), capturePolicySnapshot(), h)) {
          if (!I && !getIsRemoteMode() && !isBareMode()) startMemoryWatcherLazy(E, F);
          setImmediate(initializeTelemetryAfterTrust, E);
        }
        return null;
      },
    ];
    return (await runSteps(p, _, { session: o, storageV5: E }), k);
  }
  if (isEnvTruthy(!1) || env.IS_DEMO)
    return (adoptPersistedWorkspaceTrust(E), releaseGrowthBookHold(o.host), capturePolicySnapshot(), k);
  return (
    await runSteps(
      p,
      setupSteps(
        {
          session: o,
          permissionMode: u,
          allowDangerouslySkipPermissions: x,
          commands: T,
          claudeInChrome: A,
          devChannels: C,
          offerClaudeInChrome: b,
          storageV5: E,
          credentials: F,
          askCloudDefaultReason: M,
        },
        k,
      ),
      { session: o, onChangeAppState: onChangeAppState, marksJobBlocked: !0, storageV5: E },
    ),
    k
  );
}
/**
 * 构造 setup 步骤序列（setupSteps）：每步是一个可能显示的对话框（信任、bypass 确认、开发通道、云默认等）。
 */
//@ chunk-7fw14qgv.js:8171-13351 facade-exports = showSetupScreens (0.356)
function setupSteps(
  {
    session: session,
    permissionMode: permissionMode,
    allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
    commands: commands,
    claudeInChrome: claudeInChrome,
    devChannels: devChannels,
    offerClaudeInChrome: offerClaudeInChrome,
    storageV5: storageV5,
    credentials: credentials,
    askCloudDefaultReason: askCloudDefaultReason,
  },
  M,
) {
  let config = getGlobalConfig(),
    O = !1,
    I = !0;
  return [
    (h) => {
      if (
        config.hasCompletedOnboarding &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "banner" &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "step"
      )
        return null;
      return (
        (M.onboardingShown = !0),
        import("./chunk-p8fze0jh.js").then(({ Onboarding: Onboarding }) =>
          e(Onboarding, {
            host: session.host,
            orgConfigGateFollows: !0,
            onDone: ({ skippedSignIn: skippedSignIn }) => {
              ((M.onboardingSkippedSignIn = skippedSignIn), completeOnboarding(storageV5), h());
            },
          }),
        )
      );
    },
    (h) => {
      if (env.CLAUBBIT) return null;
      if (((I = checkHasTrustDialogAccepted()), I && !hasUngatedTrustSources())) return null;
      return (
        (O = !0),
        (I ? Promise.resolve(!1) : inheritsRelaunchHomeTrust()).then((_) => {
          if (_) return (setHomeTrustDialogAccepted(!0), null);
          return import("./chunk-8rmevhsy.js").then(({ TrustDialog: TrustDialog }) =>
            e(TrustDialog, { commands: commands, onDone: h }),
          );
        })
      );
    },
    () => {
      if (env.CLAUBBIT) return null;
      if ((setSessionTrustAccepted(!0), O)) {
        if (
          (clearPluginCache("post-trust: re-discover project @skills-dir plugins"),
          shouldFillPluginLoadWithStore(credentials))
        )
          loadAllPluginsCacheOnly(storageV5, credentials).catch(() => {});
      }
      if (
        (import("./chunk-c7p56eem.js")
          .then((h) => h.loadHooksModulesHeldForTrust(storageV5, credentials))
          .catch((h) => logError(toError(h))),
        resetGrowthBook({ preservePendingExposures: !0 }),
        config.hasCompletedOnboarding)
      )
        return (initializeGrowthBook().catch((h) => logError(toError(h))), null);
      return (resetUserData(), awaitGrowthBookAfterOnboarding());
    },
    () => {
      if (env.CLAUBBIT) return null;
      return null;
    },
    (h) =>
      env.CLAUBBIT
        ? null
        : projectMcpApprovalStep(storageV5, (done) => {
            M.mcpApprovalSkipWarning = done;
          })(h),
    async (done) => {
      if (env.CLAUBBIT || !(await shouldShowExternalIncludesDialog(session, storageV5))) return null;
      let externalIncludes = getExternalClaudeMdIncludes(
          await getMemoryFilesCached(session, !0, storageV5, credentials),
        ),
        { ClaudeMdExternalIncludesDialog: ClaudeMdExternalIncludesDialog } =
          await import("./chunk-pqxfhfwa.js");
      return e(ClaudeMdExternalIncludesDialog, {
        onDone: () => done(),
        isStandaloneDialog: !0,
        externalIncludes: externalIncludes,
      });
    },
    () => {
      if (
        (updateGithubRepoPathMapping(storageV5),
        updateDeepLinkTerminalPreference(storageV5),
        applyConfigEnvironmentVariables(),
        releaseGrowthBookHold(session.host),
        import("./chunk-fhdzwff4.js").then((done) => done.maybePrewarmRecallIndex(session)),
        primePlanSlugCollisions(storageV5),
        capturePolicySnapshot(),
        O && !I && !getIsRemoteMode() && !isBareMode())
      )
        startMemoryWatcherLazy(storageV5, credentials);
      if (M.onboardingShown) registerCleanup(exportTelemetryWhileStartPending);
      else setImmediate(initializeTelemetryAfterTrust, storageV5);
      return shouldHoldForOnboarding(session.host, config) ? awaitGrowthBookAfterOnboarding() : null;
    },
    async (h) => null,
    async (h) => {
      if (
        !(await isQualifiedForGrove(storageV5, credentials)) ||
        (await wasGroveRecentlyConfirmed(credentials))
      )
        return null;
      let { GroveDialog: GroveDialog } = await import("./chunk-xjw8k0v4.js");
      return e(GroveDialog, {
        showIfAlreadyViewed: !1,
        location: M.onboardingShown ? "onboarding" : "policy_update_modal",
        onDone: (D) => {
          if (D !== "escape") {
            h();
            return;
          }
          (logEvent("tengu_grove_policy_exited", {}),
            gracefulShutdownSync(0),
            (M.onboardingShown = !1),
            (M.claudeInChromeAccepted = !1),
            h("stop"));
        },
      });
    },
    async (h) => {
      if (getProTrialStatus().status !== "not_started") return null;
      let { ProTrialStartScreen: ProTrialStartScreen } = await import("./chunk-5qm79scx.js");
      return (
        logEvent("tengu_pro_trial_start_screen_shown", {}),
        e(ProTrialStartScreen, { onDone: () => h(), storageV5: storageV5, credentials: credentials })
      );
    },
    async (h) => {
      if (!M.onboardingShown) return null;
      let { resolvePowerupDiscoveryArm: resolvePowerupDiscoveryArm } = await import("./chunk-qnzjpqzw.js");
      if (resolvePowerupDiscoveryArm() !== "step") return null;
      let { PowerupDiscoveryStep: PowerupDiscoveryStep } = await import("./chunk-e1ykjvh2.js");
      return e(PowerupDiscoveryStep, { onDone: () => h() });
    },
    (h) => {
      let _ = getUnapprovedCustomApiKey();
      if (!_) return null;
      return wrapFullPageNotice(
        import("./chunk-0e7yb7k9.js").then(({ ApproveApiKey: ApproveApiKey }) =>
          e(ApproveApiKey, { customApiKeyTruncated: _, onDone: () => h() }),
        ),
      );
    },
    createProviderUpgradeStep("bedrock", storageV5),
    createProviderUpgradeStep("vertex", storageV5),
    async (done) => {
      let _;
      try {
        _ = await apply3PDefaultFallbacks();
      } catch (error) {
        return (logError(error), null);
      }
      let { lines: lines, hasHardFailure: hasHardFailure } = _;
      if (lines.length === 0) return null;
      return e(DelayedCallback, {
        afterMs: hasHardFailure ? 4000 : 1500,
        onDone: done,
        children: e(Box, {
          flexDirection: "column",
          children: lines.map((done) => e(Text, { color: "warning", children: done }, done)),
        }),
      });
    },
    (done) => {
      if (
        (permissionMode !== "bypassPermissions" && !allowDangerouslySkipPermissions) ||
        hasSkipDangerousModePermissionPrompt()
      )
        return null;
      return import("./chunk-styvqsd2.js").then(
        ({ BypassPermissionsModeDialog: BypassPermissionsModeDialog }) =>
          e(BypassPermissionsModeDialog, { onAccept: () => done(), storageV5: storageV5 }),
      );
    },
    ...[],
    async (done) => {
      if (getAllowedChannels().length === 0 && (devChannels?.length ?? 0) === 0) return null;
      if ((await checkGate_CACHED_OR_BLOCKING("tengu_harbor"), !devChannels || devChannels.length === 0))
        return null;
      let [
          { isChannelsOffForSession: isChannelsOffForSession },
          { isChannelsPolicyBlocked: isChannelsPolicyBlocked },
          { getSettingsForSource: getSettingsForSource },
        ] = await Promise.all([
          import("./chunk-crv2zsgh.js"),
          import("./chunk-5t1s95gq.js"),
          import("./chunk-0crvnfjy.js"),
        ]),
        L = () => {
          let mapped = devChannels.map((J) => ({ ...J, dev: !0 }));
          (setAllowedChannels(getAllowedChannels().concat(mapped)), setHasDevChannels(!0));
        };
      if (
        isChannelsOffForSession() ||
        getAPIProvider() !== "firstParty" ||
        isChannelsPolicyBlocked(getSettingsForSource("policySettings"))
      )
        return (L(), null);
      let { DevChannelsDialog: DevChannelsDialog } = await import("./chunk-jmdd9gvn.js");
      return e(DevChannelsDialog, {
        channels: devChannels,
        onAccept: () => {
          (L(), done());
        },
      });
    },
    (done) => {
      if (!claudeInChrome || getGlobalConfig().hasCompletedClaudeInChromeOnboarding) return null;
      return wrapFullPageNotice(
        import("./chunk-hthm3h8y.js").then(({ ClaudeInChromeOnboarding: ClaudeInChromeOnboarding }) =>
          e(ClaudeInChromeOnboarding, { onDone: () => done() }),
        ),
      );
    },
    async (h) => {
      if (!offerClaudeInChrome) return null;
      let { isChromeExtensionInstalled: isChromeExtensionInstalled } = await import("./chunk-2jvt0tn4.js"),
        D = await withTimeout(
          isChromeExtensionInstalled(),
          1500,
          "chrome extension scan timed out before offer",
        ).catch(() => !0),
        U = Boolean(getGlobalConfig().chromeExtension?.pairedDeviceId);
      if (!D && !U)
        return (
          logForDebugging("[Claude in Chrome] Skipping offer: extension not present locally (stale cache)"),
          null
        );
      await withTimeout(
        initializeGrowthBook().catch(() => {}),
        1500,
        "GrowthBook init timed out before chrome offer",
      ).catch(() => {});
      let L = getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_auto_enable", !1),
        Y = getGlobalConfig().claudeInChromeDefaultEnabled !== void 0,
        { isChromeServerPolicyDenied: isChromeServerPolicyDenied } = await import("./chunk-5t6stktg.js"),
        { isClaudeInChromeAllowed: isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
      if (isChromeServerPolicyDenied() || !isClaudeInChromeAllowed())
        return (
          logForDebugging(
            "[Claude in Chrome] Skipping offer: blocked by enterprise MCP config, managed deniedMcpServers policy, or organization policy (allow_claude_browser_extension)",
          ),
          null
        );
      if (Y)
        return (
          logForDebugging(
            "[Claude in Chrome] Skipping offer: decision already recorded (another instance answered)",
          ),
          (M.claudeInChromeAccepted = getGlobalConfig().claudeInChromeDefaultEnabled === !0),
          null
        );
      if (!L)
        return (
          logForDebugging(
            "[Claude in Chrome] Skipping offer: tengu_chrome_auto_enable no longer set (stale GB cache)",
          ),
          null
        );
      let { ChromeAutoEnableDialog: ChromeAutoEnableDialog } = await import("./chunk-p5jda2d9.js");
      return e(ChromeAutoEnableDialog, {
        onDone: (done) => {
          ((M.claudeInChromeAccepted = done), h());
        },
        isDontAskMode: permissionMode === "dontAsk",
        isAutoMode: permissionMode === "auto",
      });
    },
  ];
}
/**
 * 启动未完成就退出时也导出一次 3P 遥测。
 */
//@ chunk-7fw14qgv.js:13351-13562 facade-exports
async function exportTelemetryWhileStartPending() {
  try {
    if (isOTelInitPending() && getMeterProvider() === null) {
      await initializeTelemetryForExit();
      let { flushTelemetry: flushTelemetry } = await import("./chunk-9vvvg0d3.js");
      await flushTelemetry();
    }
  } catch (error) {
    logForDebugging(`[3P telemetry] Export before exit failed: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-7fw14qgv.js:13562-13701 layout
async function wrapFullPageNotice(o) {
  let [p, { FullPageNotice: FullPageNotice }] = await Promise.all([o, import("./chunk-g1ymramv.js")]);
  return p === null ? null : e(FullPageNotice, { children: p });
}
//@ chunk-7fw14qgv.js:13701-13970 layout
async function awaitGrowthBookAfterOnboarding() {
  let now = Date.now();
  try {
    (await withTimeout(initializeGrowthBook(), POST_ONBOARDING_GB_TIMEOUT_MS, POST_ONBOARDING_GB_LABEL),
      logForDebugging(`[STARTUP] post-onboarding GB await ${Date.now() - now}ms`));
  } catch (error) {
    if (
      (logForDebugging(`[STARTUP] post-onboarding GB await ${Date.now() - now}ms: ${error}`, {
        level: "warn",
      }),
      !(error instanceof Error && error.message === POST_ONBOARDING_GB_LABEL))
    )
      logError(toError(error));
  }
  return null;
}
//@ chunk-7fw14qgv.js:13970-14183 layout
function DelayedCallback(o) {
  let T = w(4),
    { afterMs: afterMs, onDone: onDone, children: children } = o,
    A,
    C;
  if (T[0] !== afterMs || T[1] !== onDone)
    ((A = () => {
      let b = setTimeout(onDone, afterMs);
      return () => clearTimeout(b);
    }),
      (C = [afterMs, onDone]),
      (T[0] = afterMs),
      (T[1] = onDone),
      (T[2] = A),
      (T[3] = C));
  else ((A = T[2]), (C = T[3]));
  return (P(A, C), children);
}
//@ chunk-7fw14qgv.js:14183-14553 layout
var PROVIDER_UPGRADE_EVENTS = {
  bedrock: {
    accepted: "tengu_bedrock_upgrade_accepted",
    declined: "tengu_bedrock_upgrade_declined",
    saveFailed: "tengu_bedrock_upgrade_save_failed",
    relaunch: "tengu_bedrock_upgrade_relaunch",
  },
  vertex: {
    accepted: "tengu_vertex_upgrade_accepted",
    declined: "tengu_vertex_upgrade_declined",
    saveFailed: "tengu_vertex_upgrade_save_failed",
    relaunch: "tengu_vertex_upgrade_relaunch",
  },
};
//@ chunk-7fw14qgv.js:14553-16017 layout
function createProviderUpgradeStep(o, p) {
  let u = PROVIDER_UPGRADE_EVENTS[o];
  return async (x) => {
    if (getAPIProvider() !== o) return null;
    try {
      let [T, { upgradeKey: upgradeKey }] = await Promise.all([
          o === "bedrock"
            ? import("./chunk-a7mvp1gg.js").then((k) =>
                withProbeDeadline("bedrock-upgrade", k.findBedrockUpgradeCandidates()).then((O) =>
                  O.map((I) => ({ ...I, toId: I.toBedrockId })),
                ),
              )
            : import("./chunk-5wnerh16.js").then((k) =>
                withProbeDeadline("vertex-upgrade", k.findVertexUpgradeCandidates()).then((O) =>
                  O.map((I) => ({ ...I, toId: I.toVertexId })),
                ),
              ),
          import("./chunk-rf3fzhp0.js"),
        ]),
        C =
          (o === "bedrock"
            ? getGlobalConfig().bedrockDeclinedUpgrades
            : getGlobalConfig().vertexDeclinedUpgrades) ?? {},
        filtered = T.filter((k) => C[k.tier] !== upgradeKey(k));
      if (filtered.length === 0) return null;
      let [
        { updateSettingsForSource: updateSettingsForSource },
        { ThirdPartyModelUpgradeDialog: ThirdPartyModelUpgradeDialog },
      ] = await Promise.all([import("./chunk-0crvnfjy.js"), import("./chunk-jxwr2fwk.js")]);
      async function M(k, O) {
        let I = fromEnum(k.tier);
        if (!O)
          return (
            await saveGlobalConfig((D) => {
              let U = o === "bedrock" ? "bedrockDeclinedUpgrades" : "vertexDeclinedUpgrades";
              return { ...D, [U]: { ...D[U], [k.tier]: upgradeKey(k) } };
            }, p),
            logEvent(u.declined, { tier: I, from_key: fromEnum(k.fromKey), to_key: fromEnum(k.toKey) }),
            !1
          );
        let h =
            k.tier === "haiku"
              ? {
                  ANTHROPIC_DEFAULT_HAIKU_MODEL: k.toId,
                  ...(k.envVar === "ANTHROPIC_SMALL_FAST_MODEL" && { ANTHROPIC_SMALL_FAST_MODEL: k.toId }),
                }
              : { [k.envVar]: k.toId },
          { error: error } = await updateSettingsForSource("userSettings", { env: h }, void 0, p);
        if (error) return (logEvent(u.saveFailed, { tier: I }), !1);
        for (let D of Object.keys(h)) process.env[D] = k.toId;
        return (
          logEvent(u.accepted, { tier: I, from_key: fromEnum(k.fromKey), to_key: fromEnum(k.toKey) }),
          !0
        );
      }
      return e(ProviderUpgradeDialog, {
        provider: o,
        pending: filtered,
        answer: M,
        onDone: () => x(),
        Dialog: ThirdPartyModelUpgradeDialog,
      });
    } catch (error) {
      return (logError(error), null);
    }
  };
}
//@ chunk-7fw14qgv.js:16017-17824 layout
function ProviderUpgradeDialog(o) {
  let C = w(27),
    { provider: provider, pending: pending, answer: answer, onDone: onDone, Dialog: Dialog } = o,
    b;
  if (C[0] === MEMO_CACHE_SENTINEL) ((b = { at: 0, acceptedAny: !1, phase: "asking" }), (C[0] = b));
  else b = C[0];
  let [E, F] = y(b),
    { at: at, acceptedAny: acceptedAny, phase: phase } = E,
    { exit: exit } = useApp(),
    h = R(null),
    _ = pending[at],
    D;
  if (C[1] !== pending.length)
    ((D = (U) =>
      F((L) => {
        let Y = L.acceptedAny || U;
        if (L.at + 1 < pending.length) {
          return { at: L.at + 1, acceptedAny: Y, phase: "asking" };
        }
        return { ...L, acceptedAny: Y, phase: Y ? "relaunching" : "done" };
      })),
      (C[1] = pending.length),
      (C[2] = D));
  else D = C[2];
  let G = D,
    J,
    ne;
  if (C[3] !== G || C[4] !== exit || C[5] !== onDone || C[6] !== phase || C[7] !== provider)
    ((J = () => {
      if (phase === "done") {
        onDone();
        return;
      }
      if (phase === "save-failed") {
        let ie = setTimeout(Ze, 2000, G);
        return () => clearTimeout(ie);
      }
      if (phase === "relaunching") {
        logEvent(PROVIDER_UPGRADE_EVENTS[provider].relaunch, {});
        let ae = setTimeout(Ve, 250, exit);
        return () => clearTimeout(ae);
      }
    }),
      (ne = [phase, provider, G, onDone, exit]),
      (C[3] = G),
      (C[4] = exit),
      (C[5] = onDone),
      (C[6] = phase),
      (C[7] = provider),
      (C[8] = J),
      (C[9] = ne));
  else ((J = C[8]), (ne = C[9]));
  if ((P(J, ne), phase === "relaunching" && acceptedAny)) {
    let W;
    if (C[10] === MEMO_CACHE_SENTINEL)
      ((W = e(Text, { dimColor: !0, children: "Restarting Claude Code to apply the new model\u2026" })),
        (C[10] = W));
    else W = C[10];
    return W;
  }
  if (_ === void 0 || phase === "done") {
    return null;
  }
  if (phase === "save-failed") {
    const W = TIER_LABELS[_.tier];
    let q;
    if (C[11] !== W)
      ((q = r(Text, { color: "error", children: ["Failed to save ", W, " upgrade to settings."] })),
        (C[11] = W),
        (C[12] = q));
    else q = C[12];
    return q;
  }
  const W = TIER_LABELS[_.tier];
  let q;
  if (C[13] !== G || C[14] !== answer || C[15] !== at || C[16] !== _ || C[17] !== onDone)
    ((q = (Me) => {
      if (h.current === at) {
        return;
      }
      ((h.current = at),
        answer(_, Me).then(
          (Re) => {
            if (Me && !Re) {
              F(et);
              return;
            }
            G(Re);
          },
          (rt) => {
            (logError(rt), onDone());
          },
        ));
    }),
      (C[13] = G),
      (C[14] = answer),
      (C[15] = at),
      (C[16] = _),
      (C[17] = onDone),
      (C[18] = q));
  else q = C[18];
  let xe;
  if (
    C[19] !== Dialog ||
    C[20] !== at ||
    C[21] !== _.fromMarketingName ||
    C[22] !== _.toId ||
    C[23] !== _.toMarketingName ||
    C[24] !== W ||
    C[25] !== q
  )
    ((xe = e(
      Dialog,
      {
        tierLabel: W,
        fromName: _.fromMarketingName,
        toName: _.toMarketingName,
        toProviderId: _.toId,
        onDone: q,
      },
      at,
    )),
      (C[19] = Dialog),
      (C[20] = at),
      (C[21] = _.fromMarketingName),
      (C[22] = _.toId),
      (C[23] = _.toMarketingName),
      (C[24] = W),
      (C[25] = q),
      (C[26] = xe));
  else xe = C[26];
  return xe;
}
/**
 * getRenderContext：构造 Ink 渲染选项、FPS 统计、帧耗时日志（CLAUDE_CODE_FRAME_TIMING_LOG）。
 */
//@ chunk-7fw14qgv.js:17824-18587 facade-exports = getRenderContext (0.98)
function getRenderContext(exitOnCtrlC) {
  let p = 0,
    baseOptions = getBaseRenderOptions(exitOnCtrlC);
  if (baseOptions.stdin) logEvent("tengu_stdin_interactive", {});
  let fpsTracker = new FpsTracker(),
    stats = createStatsStore();
  setStatsStore(stats);
  let frameTimingLogPath = env.CLAUDE_CODE_FRAME_TIMING_LOG,
    C = -1,
    b = 0,
    max = Math.max(1, env.CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY || 1);
  if (frameTimingLogPath)
    try {
      C = openSync(frameTimingLogPath, "a");
    } catch {}
  return {
    getFpsMetrics: () => fpsTracker.getMetrics(),
    stats: stats,
    renderOptions: {
      ...baseOptions,
      onFrame: (event) => {
        if (
          (fpsTracker.record(event.durationMs),
          stats.observe("frame_duration_ms", event.durationMs),
          C >= 0 && event.phases)
        ) {
          let M = b++ % max === 0,
            k =
              JSON.stringify({
                total: event.durationMs,
                at: Date.now(),
                ...event.phases,
                ...(M && { rss: process.memoryUsage.rss(), cpu: process.cpuUsage() }),
              }) +
              `
`;
          writeSync(C, k);
        }
        if (isSynchronizedOutputSupported()) return;
        for (let flicker of event.flickers) {
          if (flicker.reason === "resize") continue;
          let now = Date.now();
          if (now - p < 1000)
            logEvent("tengu_flicker", {
              desiredHeight: flicker.desiredHeight,
              actualHeight: flicker.availableHeight,
              reason: flicker.reason,
            });
          p = now;
        }
      },
    },
  };
}
//@ chunk-7fw14qgv.js:18587-18671 affinity
function startMemoryWatcherLazy(o, p) {
  import("./chunk-6cezjbyv.js").then((u) => u.startMemoryWatcher(o, p));
}
//@ chunk-20skp6hd.js:1140-1144 placement
j();
//@ chunk-20skp6hd.js:2791-2795 placement
j();
/**
 * 列出待批准的项目 MCP 服务器（严格 MCP 配置时为空），并给出其中来自插件的服务器名。
 */
//@ chunk-20skp6hd.js:4353-4564 placement
async function getPendingProjectMcpServers(t) {
  if (getStrictMcpConfig()) return { pendingServers: [], pluginServerNames: new Set() };
  let { serverNames: serverNames, pluginServerNames: pluginServerNames } =
    await collectProjectMcpServerNames(t);
  return {
    pendingServers: serverNames.filter((l) => getEffectiveProjectMcpServerStatus(l) === "pending"),
    pluginServerNames: pluginServerNames,
  };
}
/**
 * 有待批准的项目 MCP 服务器时显示批准对话框（单个或多选），并在后台任务中标记等待批准。
 */
//@ chunk-20skp6hd.js:4885-5222 placement
async function projectMcpApprovalDialog(
  { pendingServers: pendingServers, pluginServerNames: pluginServerNames },
  d,
  o,
) {
  if (pendingServers.length === 0) return null;
  let l;
  l = await markJobBlockedOnMcpApproval(
    pendingServers.map((v) => formatMcpServerLabel(v, pluginServerNames.has(v))),
    o,
  );
  let f = (v) => {
      restoreJobStateAfterApproval(l, o)
        .catch(() => {})
        .then(() => d(v));
    },
    [m, ...b] = pendingServers;
  return m !== void 0 && b.length === 0
    ? e(MCPServerApprovalDialog, { serverName: m, isPluginServer: pluginServerNames.has(m), onDone: f })
    : e(MCPServerMultiselectDialog, {
        serverNames: pendingServers,
        pluginServerNames: pluginServerNames,
        onDone: f,
      });
}
/**
 * 后台任务中把作业状态标记为"等待批准新的项目 MCP 服务器"，返回原状态以便之后恢复。
 */
//@ chunk-20skp6hd.js:5222-5691 placement
async function markJobBlockedOnMcpApproval(t, u) {
  {
    if (!isBgSession()) return;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let o = await readJobState(CLAUDE_JOB_DIR, u);
    if (!o) return;
    let l = t.length,
      f = plural(l, "server"),
      m = plural(l, "needs", "need");
    try {
      return (
        await writeStateAtomic(
          CLAUDE_JOB_DIR,
          {
            ...o,
            state: "blocked",
            detail: `${l} new MCP ${f} ${m} approval`,
            tempo: "blocked",
            needs: `approve ${l} new project MCP ${f} (${t.join(", ")}) \u2014 attach to respond`,
            updatedAt: new Date().toISOString(),
          },
          u,
        ),
        { state: o.state, tempo: o.tempo, needs: o.needs, detail: o.detail }
      );
    } catch (error) {
      logJobWriteError(error);
    }
  }
  return;
}
//@ chunk-20skp6hd.js:5691-5919 placement
async function restoreJobStateAfterApproval(t, u) {
  {
    if (!t || !isBgSession()) return;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let o = await readJobState(CLAUDE_JOB_DIR, u);
    if (!o || o.state !== "blocked") return;
    try {
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        { ...o, ...t, block: void 0, updatedAt: new Date().toISOString() },
        u,
      );
    } catch (error) {
      logJobWriteError(error);
    }
  }
}
//@ chunk-d4eg9at2.js:10206-10308 fingerprint = renderAndRun (1)
function renderAndRun_2(s, o, i) {
  (s.render(e(RenderOnceAndExit, { children: e(Text, { children: formatMessageLines(o) }) })),
    s.waitUntilExit().then(() => exitAfterAnalyticsFlush(i)));
}

export { showSetupDialog, exitWithMessage, renderAndRun, renderAndRun_2, getPendingProjectMcpServers };
