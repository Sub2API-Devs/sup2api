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
import { cleanForDisplay, plural } from "./utils/stringUtils.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "./services/analytics/featureTelemetry.js";
import { logError } from "./utils/log.js";
import { toError, errorMessage } from "./utils/errors.js";
import { showScreen, runSteps } from "./utils/runSteps.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { isSameRealPath } from "./utils/fsJunctions.js";
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
import { P, y, R, init_react_production } from "../vendor/react/cjs/react.production.js";
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
/**
 * 把回调以 false 调用
 */
function setFlagFalse(ot) {
  return ot(false);
}
//@ chunk-7fw14qgv.js:2934-2975 sole-consumer
/**
 * 执行重新启动
 */
function execRelaunch(nt) {
  return nt.execRelaunch();
}
//@ chunk-7fw14qgv.js:2975-3035 sole-consumer
/**
 * 先清理再重新启动
 */
function prepareAndRelaunch(it) {
  it();
  import("./chunk-sv7j935w.js").then(execRelaunch);
}
//@ chunk-7fw14qgv.js:3035-3085 affinity
/**
 * 状态置为 save-failed
 */
function markSaveFailed(at) {
  return {
    ...at,
    phase: "save-failed",
  };
}
//@ chunk-7fw14qgv.js:3085-3142 facade-exports
function adoptPersistedWorkspaceTrust(o) {
  if (env.CLAUBBIT || !checkHasTrustDialogAccepted()) return;
  setSessionTrustAccepted(true);
  primePlanSlugCollisions(o);
}
//@ chunk-7fw14qgv.js:3142-3713 facade-exports
function completeOnboarding(storageV5) {
  saveGlobalConfig(
    (current) => ({
      ...current,
      hasCompletedOnboarding: true,
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
    storageV5,
  );
}
//@ chunk-7fw14qgv.js:3713-4336 facade-exports
function projectMcpApprovalStep(o, p) {
  return async (u) => {
    let pendingProjectMcpServers = await getPendingProjectMcpServers(o);
    let T = blockingSettingsErrors();
    if (pendingProjectMcpServers.pendingServers.length === 0) return null;
    if (T.length > 0) {
      let joined = uniq(T.flatMap((C) => (C.file ? [cleanForDisplay(C.file)] : []))).join(", ");
      logFeatureSad("mcp_project_approval_dialog", "mcp_project_approval_skipped_settings_errors");
      p({
        key: "mcp-approval-skipped",
        text: `skipping .mcp.json server approval (settings errors${joined ? ` in ${joined}` : ""}) \xB7 run \`claude doctor\` to list them, fix them, then restart`,
      });
      return null;
    }
    try {
      return await projectMcpApprovalDialog(
        pendingProjectMcpServers,
        (result) => {
          try {
            let C = mcpApprovalPersistNotice(result);
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
      logFeatureBad("mcp_project_approval_dialog", "mcp_project_approval_dialog_threw");
      throw error;
    }
  };
}
//@ chunk-7fw14qgv.js:4336-5082 layout
/**
 * 项目 MCP 批准对话框结束后的提示：选择保存失败、或工作区未被显式信任导致只对本会话生效时，返回对应的提示文本，否则 null。
 */
function mcpApprovalPersistNotice(result) {
  if (result.persistFailed) {
    logFeatureBad("mcp_project_approval_dialog", "mcp_approval_persist_failed");
    return {
      key: "mcp-approval-persist-failed",
      text: "one or more of your MCP server choices could not be saved (check permissions on .claude/settings.local.json) \xB7 you will be asked again next startup",
    };
  }
  let workspaceKey = getWorkspacePersistedTrustKey();
  if (
    getSessionApprovedMcpServers().some((u) => u.workspaceKey === workspaceKey) &&
    !isWorkspacePersistedTrusted() &&
    isLocalSettingsGitTracked({
      onIndeterminate: "tracked",
    })
  ) {
    logFeatureSad("mcp_project_approval_dialog", "mcp_approval_persist_gated");
    return {
      key: "mcp-approval-persist-gated",
      text: "your MCP server choices apply to this session only (workspace not explicitly trusted; .claude/settings.local.json is gated) \xB7 to persist, add them to enabledMcpjsonServers in ~/.claude/settings.json",
    };
  }
  logFeatureOk("mcp_project_approval_dialog");
  return null;
}
//@ chunk-7fw14qgv.js:5082-5168 facade-exports = exitWithMessage (0.308)
/**
 * endInkWithError：在 Ink 里显示红色错误后卸载并退出。
 */
async function endInkWithError(o, p) {
  showScreen(
    o,
    jsxProd_default(Text, {
      color: "error",
      children: p,
    }),
  );
  o.unmount();
  await recordExitWithMessageCause(p);
}
//@ chunk-7fw14qgv.js:5168-5313 layout
async function recordExitWithMessageCause(o) {
  let { setBgExitCause, setBgExitDetail } = await import("./chunk-ped6a95p.js");
  setBgExitCause("exit_with_message");
  setBgExitDetail("exit_with_message", o);
}
//@ chunk-7fw14qgv.js:5313-5443 facade-exports
/**
 * 显示“Loading your organization's managed settings…”等待提示。
 */
function showSettingsLoadHold(o) {
  showScreen(
    o,
    jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Loading your organization's managed settings\u2026",
      }),
    }),
  );
}
//@ chunk-7fw14qgv.js:5443-5531 facade-exports = exitWithError (0.655)
/**
 * exitWithError：exitWithMessage 的错误色版本（可带未发送的提示）。
 */
async function exitWithError(root, message, beforeExit, unsentPrompt) {
  return exitWithMessage(root, message, {
    color: "error",
    beforeExit,
    unsentPrompt,
  });
}
//@ chunk-7fw14qgv.js:5531-6114 facade-exports
/**
 * exitWithMessage：渲染一段（可带颜色的）文本后卸载 Ink、执行 beforeExit、优雅退出。
 */
async function exitWithMessage(o, p, u) {
  let color = u?.color;
  let exitCode = u?.exitCode ?? 1;
  let A = color
    ? jsxProd_default(Text, {
        color,
        children: p,
      })
    : jsxProd_default(Text, {
        children: p,
      });
  showScreen(
    o,
    u?.unsentPrompt
      ? jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            A,
            jsxProd_default(Text, {
              children: `
Your message was not sent:
${u.unsentPrompt}`,
            }),
          ],
        })
      : A,
  );
  o.unmount();
  await u?.beforeExit?.();
  if (exitCode !== 0) await recordExitWithMessageCause(p);
  let { flushAnalyticsSinks } = await import("./chunk-r3wdn2dp.js");
  await flushAnalyticsSinks();
  let { drainRegisteredWriteQueues } = await import("./chunk-kqc5kgje.js");
  let { withTimeout } = await import("./chunk-c1wxfrj3.js");
  await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exitWithMessage)").catch(
    () => {},
  );
  process.exit(exitCode);
}
//@ chunk-7fw14qgv.js:6114-6275 facade-exports = showSetupDialog (0.644)
/**
 * showSetupDialog：在已有 Ink 根上显示一个对话框，返回其 done 回调的值。
 */
function showSetupDialog(root, renderer, options) {
  return new Promise((resolve, reject) => {
    runSteps(
      root,
      [
        (done) =>
          renderer((C) => {
            resolve(C);
            done();
          }),
      ],
      {
        session: getRootSession(),
        onChangeAppState: options?.onChangeAppState,
        marksJobBlocked: true,
      },
    ).catch(reject);
  });
}
//@ chunk-7fw14qgv.js:6275-6914 facade-exports
/**
 * renderAndRun：把元素挂到 Ink 根，等待退出；渲染期未处理异常写入错误并退出。
 */
async function renderAndRun(root, p, session, storageV5, credentials) {
  let A = showScreen(root, p);
  markConfigBootPhaseComplete();
  startDeferredPrefetches(session, storageV5, credentials);
  try {
    if (
      (await Promise.race([root.waitUntilExit().then(() => "exited"), A.replaced.then(() => "replaced")])) ===
      "replaced"
    )
      return;
  } catch (error) {
    let error_2 = toError(error);
    let F = (await recordFullscreenRenderFailure().catch(() => false))
      ? " It happened while the fullscreen renderer was starting, so the next launch will use the classic renderer (CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 forces that any time)."
      : "";
    emitExitMessage(`Claude Code exited after an unrecoverable interface error (${error_2.message}).${F}`);
    if (isBgSession() || isSupervisedMode()) throw error;
    try {
      trackError(error_2, "unhandled_rejection");
    } catch {}
    await gracefulShutdown(1, "other");
    return;
  }
  await shutdownCoordinators.of(session.host).runBeforeInteractiveShutdown();
  await gracefulShutdown(0);
}
//@ chunk-7fw14qgv.js:6914-6955 layout
var POST_ONBOARDING_GB_TIMEOUT_MS = 2000;
var POST_ONBOARDING_GB_LABEL = "GB post-onboarding init";
//@ chunk-7fw14qgv.js:6955-8171 facade-exports
/**
 * 显示启动前的设置屏（showSetupScreens）：工作区信任、onboarding、MCP 项目审批、Chrome 提议等，返回 onboarding 结果。
 */
async function showSetupScreens(
  o,
  p,
  permissionMode,
  allowDangerouslySkipPermissions,
  commands,
  claudeInChrome,
  devChannels,
  offerClaudeInChrome,
  E,
  F,
  askCloudDefaultReason,
) {
  let k = {
    onboardingShown: false,
    onboardingSkippedSignIn: false,
    mcpApprovalSkipWarning: null,
    claudeInChromeAccepted: false,
  };
  let O = (mcpApprovalSkipWarning) => {
    k.mcpApprovalSkipWarning = mcpApprovalSkipWarning;
  };
  if (isBgSession() || env.CLAUDE_BRIDGE_REATTACH_SESSION) {
    let I = checkHasTrustDialogAccepted();
    let h = I || (env.CLAUDE_BG_WORKSPACE_TRUSTED === true && isSameRealPath(getOriginalCwd(), homedir()));
    if (!h)
      logForDebugging(
        "Workspace trust is not recorded for this directory; continuing as an untrusted session (hooks and project settings env stay off)",
        {
          level: "warn",
        },
      );
    let _ = [
      () => {
        if (h) setSessionTrustAccepted(true);
        resetGrowthBook({
          preservePendingExposures: true,
        });
        initializeGrowthBook().catch((error) => logError(toError(error)));
        if (h) {
          prefetchGitStatus(o);
          import("./chunk-c7p56eem.js")
            .then((D) => D.loadHooksModulesHeldForTrust(E, F))
            .catch((error) => logError(toError(error)));
        }
        return null;
      },
      projectMcpApprovalStep(E, O),
      () => {
        if (h) {
          applyConfigEnvironmentVariables();
          import("./chunk-fhdzwff4.js").then((D) => D.maybePrewarmRecallIndex(o));
          primePlanSlugCollisions(E);
        }
        releaseGrowthBookHold(o.host);
        capturePolicySnapshot();
        if (h) {
          if (!I && !getIsRemoteMode() && !isBareMode()) startMemoryWatcherLazy(E, F);
          setImmediate(initializeTelemetryAfterTrust, E);
        }
        return null;
      },
    ];
    await runSteps(p, _, {
      session: o,
      storageV5: E,
    });
    return k;
  }
  if (isEnvTruthy(false) || env.IS_DEMO) {
    adoptPersistedWorkspaceTrust(E);
    releaseGrowthBookHold(o.host);
    capturePolicySnapshot();
    return k;
  }
  await runSteps(
    p,
    setupSteps(
      {
        session: o,
        permissionMode,
        allowDangerouslySkipPermissions,
        commands,
        claudeInChrome,
        devChannels,
        offerClaudeInChrome,
        storageV5: E,
        credentials: F,
        askCloudDefaultReason,
      },
      k,
    ),
    {
      session: o,
      onChangeAppState,
      marksJobBlocked: true,
      storageV5: E,
    },
  );
  return k;
}
//@ chunk-7fw14qgv.js:8171-13351 facade-exports = showSetupScreens (0.356)
/**
 * 构造 setup 步骤序列（setupSteps）：每步是一个可能显示的对话框（信任、bypass 确认、开发通道、云默认等）。
 */
function setupSteps(
  {
    session,
    permissionMode,
    allowDangerouslySkipPermissions,
    commands,
    claudeInChrome,
    devChannels,
    offerClaudeInChrome,
    storageV5,
    credentials,
    askCloudDefaultReason,
  },
  M,
) {
  let config = getGlobalConfig();
  let O = false;
  let I = true;
  return [
    (h) => {
      if (
        config.hasCompletedOnboarding &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "banner" &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "step"
      )
        return null;
      M.onboardingShown = true;
      return import("./chunk-p8fze0jh.js").then(({ Onboarding }) =>
        jsxProd_default(Onboarding, {
          host: session.host,
          orgConfigGateFollows: true,
          onDone: ({ skippedSignIn }) => {
            M.onboardingSkippedSignIn = skippedSignIn;
            completeOnboarding(storageV5);
            h();
          },
        }),
      );
    },
    (onDone) => {
      if (env.CLAUBBIT) return null;
      I = checkHasTrustDialogAccepted();
      if (I && !hasUngatedTrustSources()) return null;
      O = true;
      return (I ? Promise.resolve(false) : inheritsRelaunchHomeTrust()).then((_) => {
        if (_) {
          setHomeTrustDialogAccepted(true);
          return null;
        }
        return import("./chunk-8rmevhsy.js").then(({ TrustDialog }) =>
          jsxProd_default(TrustDialog, {
            commands,
            onDone,
          }),
        );
      });
    },
    () => {
      if (env.CLAUBBIT) return null;
      setSessionTrustAccepted(true);
      if (O) {
        clearPluginCache("post-trust: re-discover project @skills-dir plugins");
        if (shouldFillPluginLoadWithStore(credentials))
          loadAllPluginsCacheOnly(storageV5, credentials).catch(() => {});
      }
      import("./chunk-c7p56eem.js")
        .then((h) => h.loadHooksModulesHeldForTrust(storageV5, credentials))
        .catch((error) => logError(toError(error)));
      resetGrowthBook({
        preservePendingExposures: true,
      });
      if (config.hasCompletedOnboarding) {
        initializeGrowthBook().catch((error) => logError(toError(error)));
        return null;
      }
      resetUserData();
      return awaitGrowthBookAfterOnboarding();
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
        await getMemoryFilesCached(session, true, storageV5, credentials),
      );
      let { ClaudeMdExternalIncludesDialog } = await import("./chunk-pqxfhfwa.js");
      return jsxProd_default(ClaudeMdExternalIncludesDialog, {
        onDone: () => done(),
        isStandaloneDialog: true,
        externalIncludes,
      });
    },
    () => {
      updateGithubRepoPathMapping(storageV5);
      updateDeepLinkTerminalPreference(storageV5);
      applyConfigEnvironmentVariables();
      releaseGrowthBookHold(session.host);
      import("./chunk-fhdzwff4.js").then((done) => done.maybePrewarmRecallIndex(session));
      primePlanSlugCollisions(storageV5);
      capturePolicySnapshot();
      if (O && !I && !getIsRemoteMode() && !isBareMode()) startMemoryWatcherLazy(storageV5, credentials);
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
      let { GroveDialog } = await import("./chunk-xjw8k0v4.js");
      return jsxProd_default(GroveDialog, {
        showIfAlreadyViewed: false,
        location: M.onboardingShown ? "onboarding" : "policy_update_modal",
        onDone: (D) => {
          if (D !== "escape") {
            h();
            return;
          }
          logEvent("tengu_grove_policy_exited", {});
          gracefulShutdownSync(0);
          M.onboardingShown = false;
          M.claudeInChromeAccepted = false;
          h("stop");
        },
      });
    },
    async (h) => {
      if (getProTrialStatus().status !== "not_started") return null;
      let { ProTrialStartScreen } = await import("./chunk-5qm79scx.js");
      logEvent("tengu_pro_trial_start_screen_shown", {});
      return jsxProd_default(ProTrialStartScreen, {
        onDone: () => h(),
        storageV5,
        credentials,
      });
    },
    async (h) => {
      if (!M.onboardingShown) return null;
      let { resolvePowerupDiscoveryArm } = await import("./chunk-qnzjpqzw.js");
      if (resolvePowerupDiscoveryArm() !== "step") return null;
      let { PowerupDiscoveryStep } = await import("./chunk-e1ykjvh2.js");
      return jsxProd_default(PowerupDiscoveryStep, {
        onDone: () => h(),
      });
    },
    (h) => {
      let unapprovedCustomApiKey = getUnapprovedCustomApiKey();
      if (!unapprovedCustomApiKey) return null;
      return wrapFullPageNotice(
        import("./chunk-0e7yb7k9.js").then(({ ApproveApiKey }) =>
          jsxProd_default(ApproveApiKey, {
            customApiKeyTruncated: unapprovedCustomApiKey,
            onDone: () => h(),
          }),
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
        logError(error);
        return null;
      }
      let { lines, hasHardFailure } = _;
      if (lines.length === 0) return null;
      return jsxProd_default(DelayedCallback, {
        afterMs: hasHardFailure ? 4000 : 1500,
        onDone: done,
        children: jsxProd_default(Box, {
          flexDirection: "column",
          children: lines.map((done) =>
            jsxProd_default(
              Text,
              {
                color: "warning",
                children: done,
              },
              done,
            ),
          ),
        }),
      });
    },
    (done) => {
      if (
        (permissionMode !== "bypassPermissions" && !allowDangerouslySkipPermissions) ||
        hasSkipDangerousModePermissionPrompt()
      )
        return null;
      return import("./chunk-styvqsd2.js").then(({ BypassPermissionsModeDialog }) =>
        jsxProd_default(BypassPermissionsModeDialog, {
          onAccept: () => done(),
          storageV5,
        }),
      );
    },
    ...[],
    async (done) => {
      if (getAllowedChannels().length === 0 && (devChannels?.length ?? 0) === 0) return null;
      await checkGate_CACHED_OR_BLOCKING("tengu_harbor");
      if (!devChannels || devChannels.length === 0) return null;
      let [{ isChannelsOffForSession }, { isChannelsPolicyBlocked }, { getSettingsForSource }] =
        await Promise.all([
          import("./chunk-crv2zsgh.js"),
          import("./chunk-5t1s95gq.js"),
          import("./chunk-0crvnfjy.js"),
        ]);
      let L = () => {
        let mapped = devChannels.map((devChannel) => ({
          ...devChannel,
          dev: true,
        }));
        setAllowedChannels(getAllowedChannels().concat(mapped));
        setHasDevChannels(true);
      };
      if (
        isChannelsOffForSession() ||
        getAPIProvider() !== "firstParty" ||
        isChannelsPolicyBlocked(getSettingsForSource("policySettings"))
      ) {
        L();
        return null;
      }
      let { DevChannelsDialog } = await import("./chunk-jmdd9gvn.js");
      return jsxProd_default(DevChannelsDialog, {
        channels: devChannels,
        onAccept: () => {
          L();
          done();
        },
      });
    },
    (done) => {
      if (!claudeInChrome || getGlobalConfig().hasCompletedClaudeInChromeOnboarding) return null;
      return wrapFullPageNotice(
        import("./chunk-hthm3h8y.js").then(({ ClaudeInChromeOnboarding }) =>
          jsxProd_default(ClaudeInChromeOnboarding, {
            onDone: () => done(),
          }),
        ),
      );
    },
    async (h) => {
      if (!offerClaudeInChrome) return null;
      let { isChromeExtensionInstalled } = await import("./chunk-2jvt0tn4.js");
      let D = await withTimeout(
        isChromeExtensionInstalled(),
        1500,
        "chrome extension scan timed out before offer",
      ).catch(() => true);
      let U = Boolean(getGlobalConfig().chromeExtension?.pairedDeviceId);
      if (!D && !U) {
        logForDebugging("[Claude in Chrome] Skipping offer: extension not present locally (stale cache)");
        return null;
      }
      await withTimeout(
        initializeGrowthBook().catch(() => {}),
        1500,
        "GrowthBook init timed out before chrome offer",
      ).catch(() => {});
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_chrome_auto_enable",
        false,
      );
      let Y = getGlobalConfig().claudeInChromeDefaultEnabled !== undefined;
      let { isChromeServerPolicyDenied } = await import("./chunk-5t6stktg.js");
      let { isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
      if (isChromeServerPolicyDenied() || !isClaudeInChromeAllowed()) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: blocked by enterprise MCP config, managed deniedMcpServers policy, or organization policy (allow_claude_browser_extension)",
        );
        return null;
      }
      if (Y) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: decision already recorded (another instance answered)",
        );
        M.claudeInChromeAccepted = getGlobalConfig().claudeInChromeDefaultEnabled === true;
        return null;
      }
      if (!featureValue_CACHED_MAY_BE_STALE) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: tengu_chrome_auto_enable no longer set (stale GB cache)",
        );
        return null;
      }
      let { ChromeAutoEnableDialog } = await import("./chunk-p5jda2d9.js");
      return jsxProd_default(ChromeAutoEnableDialog, {
        onDone: (done) => {
          M.claudeInChromeAccepted = done;
          h();
        },
        isDontAskMode: permissionMode === "dontAsk",
        isAutoMode: permissionMode === "auto",
      });
    },
  ];
}
//@ chunk-7fw14qgv.js:13351-13562 facade-exports
/**
 * 启动未完成就退出时也导出一次 3P 遥测。
 */
async function exportTelemetryWhileStartPending() {
  try {
    if (isOTelInitPending() && getMeterProvider() === null) {
      await initializeTelemetryForExit();
      let { flushTelemetry } = await import("./chunk-9vvvg0d3.js");
      await flushTelemetry();
    }
  } catch (error) {
    logForDebugging(`[3P telemetry] Export before exit failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-7fw14qgv.js:13562-13701 layout
async function wrapFullPageNotice(o) {
  let [p, { FullPageNotice }] = await Promise.all([o, import("./chunk-g1ymramv.js")]);
  return p === null
    ? null
    : jsxProd_default(FullPageNotice, {
        children: p,
      });
}
//@ chunk-7fw14qgv.js:13701-13970 layout
async function awaitGrowthBookAfterOnboarding() {
  let now = Date.now();
  try {
    await withTimeout(initializeGrowthBook(), POST_ONBOARDING_GB_TIMEOUT_MS, POST_ONBOARDING_GB_LABEL);
    logForDebugging(`[STARTUP] post-onboarding GB await ${Date.now() - now}ms`);
  } catch (error) {
    logForDebugging(`[STARTUP] post-onboarding GB await ${Date.now() - now}ms: ${error}`, {
      level: "warn",
    });
    if (!(error instanceof Error && error.message === POST_ONBOARDING_GB_LABEL)) logError(toError(error));
  }
  return null;
}
//@ chunk-7fw14qgv.js:13970-14183 layout
function DelayedCallback(props) {
  let T = w(4);
  let { afterMs, onDone, children } = props;
  let A;
  let C;
  if (T[0] !== afterMs || T[1] !== onDone) {
    A = () => {
      let timer = setTimeout(onDone, afterMs);
      return () => clearTimeout(timer);
    };
    C = [afterMs, onDone];
    T[0] = afterMs;
    T[1] = onDone;
    T[2] = A;
    T[3] = C;
  } else {
    A = T[2];
    C = T[3];
  }
  P(A, C);
  return children;
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
function createProviderUpgradeStep(o, storageV5) {
  let u = PROVIDER_UPGRADE_EVENTS[o];
  return async (x) => {
    if (getAPIProvider() !== o) return null;
    try {
      let [T, { upgradeKey }] = await Promise.all([
        o === "bedrock"
          ? import("./chunk-a7mvp1gg.js").then((k) =>
              withProbeDeadline("bedrock-upgrade", k.findBedrockUpgradeCandidates()).then((O) =>
                O.map((I) => ({
                  ...I,
                  toId: I.toBedrockId,
                })),
              ),
            )
          : import("./chunk-5wnerh16.js").then((k) =>
              withProbeDeadline("vertex-upgrade", k.findVertexUpgradeCandidates()).then((O) =>
                O.map((I) => ({
                  ...I,
                  toId: I.toVertexId,
                })),
              ),
            ),
        import("./chunk-rf3fzhp0.js"),
      ]);
      let C =
        (o === "bedrock"
          ? getGlobalConfig().bedrockDeclinedUpgrades
          : getGlobalConfig().vertexDeclinedUpgrades) ?? {};
      let filtered = T.filter((k) => C[k.tier] !== upgradeKey(k));
      if (filtered.length === 0) return null;
      let [{ updateSettingsForSource }, { ThirdPartyModelUpgradeDialog }] = await Promise.all([
        import("./chunk-0crvnfjy.js"),
        import("./chunk-jxwr2fwk.js"),
      ]);
      async function M(k, O) {
        let tier = fromEnum(k.tier);
        if (!O) {
          await saveGlobalConfig((D) => {
            let U = o === "bedrock" ? "bedrockDeclinedUpgrades" : "vertexDeclinedUpgrades";
            return {
              ...D,
              [U]: {
                ...D[U],
                [k.tier]: upgradeKey(k),
              },
            };
          }, storageV5);
          logEvent(u.declined, {
            tier,
            from_key: fromEnum(k.fromKey),
            to_key: fromEnum(k.toKey),
          });
          return false;
        }
        let h =
          k.tier === "haiku"
            ? {
                ANTHROPIC_DEFAULT_HAIKU_MODEL: k.toId,
                ...(k.envVar === "ANTHROPIC_SMALL_FAST_MODEL" && {
                  ANTHROPIC_SMALL_FAST_MODEL: k.toId,
                }),
              }
            : {
                [k.envVar]: k.toId,
              };
        let { error } = await updateSettingsForSource(
          "userSettings",
          {
            env: h,
          },
          undefined,
          storageV5,
        );
        if (error) {
          logEvent(u.saveFailed, {
            tier,
          });
          return false;
        }
        for (let key of Object.keys(h)) process.env[key] = k.toId;
        logEvent(u.accepted, {
          tier,
          from_key: fromEnum(k.fromKey),
          to_key: fromEnum(k.toKey),
        });
        return true;
      }
      return jsxProd_default(ProviderUpgradeDialog, {
        provider: o,
        pending: filtered,
        answer: M,
        onDone: () => x(),
        Dialog: ThirdPartyModelUpgradeDialog,
      });
    } catch (error) {
      logError(error);
      return null;
    }
  };
}
//@ chunk-7fw14qgv.js:16017-17824 layout
function ProviderUpgradeDialog(props) {
  let C = w(27);
  let { provider, pending, answer, onDone, Dialog } = props;
  let b;
  if (C[0] === MEMO_CACHE_SENTINEL) {
    b = {
      at: 0,
      acceptedAny: false,
      phase: "asking",
    };
    C[0] = b;
  } else b = C[0];
  let [E, F] = y(b);
  let { at, acceptedAny, phase } = E;
  let { exit } = useApp();
  let h = R(null);
  let _ = pending[at];
  let D;
  if (C[1] !== pending.length) {
    D = (U) =>
      F((L) => {
        let acceptedAny = L.acceptedAny || U;
        if (L.at + 1 < pending.length) {
          return {
            at: L.at + 1,
            acceptedAny,
            phase: "asking",
          };
        }
        return {
          ...L,
          acceptedAny,
          phase: acceptedAny ? "relaunching" : "done",
        };
      });
    C[1] = pending.length;
    C[2] = D;
  } else D = C[2];
  let G = D;
  let J;
  let ne;
  if (C[3] !== G || C[4] !== exit || C[5] !== onDone || C[6] !== phase || C[7] !== provider) {
    J = () => {
      if (phase === "done") {
        onDone();
        return;
      }
      if (phase === "save-failed") {
        let timer = setTimeout(setFlagFalse, 2000, G);
        return () => clearTimeout(timer);
      }
      if (phase === "relaunching") {
        logEvent(PROVIDER_UPGRADE_EVENTS[provider].relaunch, {});
        let timer = setTimeout(prepareAndRelaunch, 250, exit);
        return () => clearTimeout(timer);
      }
    };
    ne = [phase, provider, G, onDone, exit];
    C[3] = G;
    C[4] = exit;
    C[5] = onDone;
    C[6] = phase;
    C[7] = provider;
    C[8] = J;
    C[9] = ne;
  } else {
    J = C[8];
    ne = C[9];
  }
  P(J, ne);
  if (phase === "relaunching" && acceptedAny) {
    let W;
    if (C[10] === MEMO_CACHE_SENTINEL) {
      W = jsxProd_default(Text, {
        dimColor: true,
        children: "Restarting Claude Code to apply the new model\u2026",
      });
      C[10] = W;
    } else W = C[10];
    return W;
  }
  if (_ === undefined || phase === "done") {
    return null;
  }
  if (phase === "save-failed") {
    const W = TIER_LABELS[_.tier];
    let q;
    if (C[11] !== W) {
      q = jsxProd_default_2(Text, {
        color: "error",
        children: ["Failed to save ", W, " upgrade to settings."],
      });
      C[11] = W;
      C[12] = q;
    } else q = C[12];
    return q;
  }
  const tierLabel = TIER_LABELS[_.tier];
  let onDone_2;
  if (C[13] !== G || C[14] !== answer || C[15] !== at || C[16] !== _ || C[17] !== onDone) {
    onDone_2 = (Me) => {
      if (h.current === at) {
        return;
      }
      h.current = at;
      answer(_, Me).then(
        (Re) => {
          if (Me && !Re) {
            F(markSaveFailed);
            return;
          }
          G(Re);
        },
        (error) => {
          logError(error);
          onDone();
        },
      );
    };
    C[13] = G;
    C[14] = answer;
    C[15] = at;
    C[16] = _;
    C[17] = onDone;
    C[18] = onDone_2;
  } else onDone_2 = C[18];
  let xe;
  if (
    C[19] !== Dialog ||
    C[20] !== at ||
    C[21] !== _.fromMarketingName ||
    C[22] !== _.toId ||
    C[23] !== _.toMarketingName ||
    C[24] !== tierLabel ||
    C[25] !== onDone_2
  ) {
    xe = jsxProd_default(
      Dialog,
      {
        tierLabel,
        fromName: _.fromMarketingName,
        toName: _.toMarketingName,
        toProviderId: _.toId,
        onDone: onDone_2,
      },
      at,
    );
    C[19] = Dialog;
    C[20] = at;
    C[21] = _.fromMarketingName;
    C[22] = _.toId;
    C[23] = _.toMarketingName;
    C[24] = tierLabel;
    C[25] = onDone_2;
    C[26] = xe;
  } else xe = C[26];
  return xe;
}
//@ chunk-7fw14qgv.js:17824-18587 facade-exports = getRenderContext (0.98)
/**
 * getRenderContext：构造 Ink 渲染选项、FPS 统计、帧耗时日志（CLAUDE_CODE_FRAME_TIMING_LOG）。
 */
function getRenderContext(exitOnCtrlC) {
  let lastFlickerTime = 0;
  let baseOptions = getBaseRenderOptions(exitOnCtrlC);
  if (baseOptions.stdin) logEvent("tengu_stdin_interactive", {});
  let fpsTracker = new FpsTracker();
  let stats = createStatsStore();
  setStatsStore(stats);
  let frameTimingLogPath = env.CLAUDE_CODE_FRAME_TIMING_LOG;
  let C = -1;
  let b = 0;
  let max = Math.max(1, env.CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY || 1);
  if (frameTimingLogPath)
    try {
      C = openSync(frameTimingLogPath, "a");
    } catch {}
  return {
    getFpsMetrics: () => fpsTracker.getMetrics(),
    stats,
    renderOptions: {
      ...baseOptions,
      onFrame: (event) => {
        fpsTracker.record(event.durationMs);
        stats.observe("frame_duration_ms", event.durationMs);
        if (C >= 0 && event.phases) {
          let M = b++ % max === 0;
          let k =
            JSON.stringify({
              total: event.durationMs,
              at: Date.now(),
              ...event.phases,
              ...(M && {
                rss: process.memoryUsage.rss(),
                cpu: process.cpuUsage(),
              }),
            }) +
            `
`;
          writeSync(C, k);
        }
        if (isSynchronizedOutputSupported()) return;
        for (let flicker of event.flickers) {
          if (flicker.reason === "resize") continue;
          let now = Date.now();
          if (now - lastFlickerTime < 1000)
            logEvent("tengu_flicker", {
              desiredHeight: flicker.desiredHeight,
              actualHeight: flicker.availableHeight,
              reason: flicker.reason,
            });
          lastFlickerTime = now;
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
init_react_production();
//@ chunk-20skp6hd.js:2791-2795 placement
init_react_production();
//@ chunk-20skp6hd.js:4353-4564 placement
/**
 * 列出待批准的项目 MCP 服务器（严格 MCP 配置时为空），并给出其中来自插件的服务器名。
 */
async function getPendingProjectMcpServers(root) {
  if (getStrictMcpConfig())
    return {
      pendingServers: [],
      pluginServerNames: new Set(),
    };
  let { serverNames, pluginServerNames } = await collectProjectMcpServerNames(root);
  return {
    pendingServers: serverNames.filter(
      (serverName) => getEffectiveProjectMcpServerStatus(serverName) === "pending",
    ),
    pluginServerNames,
  };
}
//@ chunk-20skp6hd.js:4885-5222 placement
/**
 * 有待批准的项目 MCP 服务器时显示批准对话框（单个或多选），并在后台任务中标记等待批准。
 */
async function projectMcpApprovalDialog({ pendingServers, pluginServerNames }, d, o) {
  if (pendingServers.length === 0) return null;
  let l;
  l = await markJobBlockedOnMcpApproval(
    pendingServers.map((pendingServer) =>
      formatMcpServerLabel(pendingServer, pluginServerNames.has(pendingServer)),
    ),
    o,
  );
  let onDone = (v) => {
    restoreJobStateAfterApproval(l, o)
      .catch(() => {})
      .then(() => d(v));
  };
  let [m, ...b] = pendingServers;
  return m !== undefined && b.length === 0
    ? jsxProd_default(MCPServerApprovalDialog, {
        serverName: m,
        isPluginServer: pluginServerNames.has(m),
        onDone,
      })
    : jsxProd_default(MCPServerMultiselectDialog, {
        serverNames: pendingServers,
        pluginServerNames,
        onDone,
      });
}
//@ chunk-20skp6hd.js:5222-5691 placement
/**
 * 后台任务中把作业状态标记为"等待批准新的项目 MCP 服务器"，返回原状态以便之后恢复。
 */
async function markJobBlockedOnMcpApproval(t, u) {
  {
    if (!isBgSession()) return;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let jobState = await readJobState(CLAUDE_JOB_DIR, u);
    if (!jobState) return;
    let l = t.length;
    let f = plural(l, "server");
    let m = plural(l, "needs", "need");
    try {
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...jobState,
          state: "blocked",
          detail: `${l} new MCP ${f} ${m} approval`,
          tempo: "blocked",
          needs: `approve ${l} new project MCP ${f} (${t.join(", ")}) \u2014 attach to respond`,
          updatedAt: new Date().toISOString(),
        },
        u,
      );
      return {
        state: jobState.state,
        tempo: jobState.tempo,
        needs: jobState.needs,
        detail: jobState.detail,
      };
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
    let jobState = await readJobState(CLAUDE_JOB_DIR, u);
    if (!jobState || jobState.state !== "blocked") return;
    try {
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...jobState,
          ...t,
          block: undefined,
          updatedAt: new Date().toISOString(),
        },
        u,
      );
    } catch (error) {
      logJobWriteError(error);
    }
  }
}
//@ chunk-d4eg9at2.js:10206-10308 fingerprint = renderAndRun (1)
function renderAndRun_2(s, o, i) {
  s.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: formatMessageLines(o),
      }),
    }),
  );
  s.waitUntilExit().then(() => exitAfterAnalyticsFlush(i));
}
export { showSetupDialog, exitWithMessage, renderAndRun, renderAndRun_2, getPendingProjectMcpServers };
