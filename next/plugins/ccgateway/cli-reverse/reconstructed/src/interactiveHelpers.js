/**
 * interactiveHelpers.tsx
 *
 * 并入旧版已有路径：交互模式启动辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/interactiveHelpers.tsx
 * pieces: chunk-0b83n7d5.js (1), chunk-ezx72dpn.js (6), chunk-yq5f910z.js (27)
 * attribution: fingerprint 1, placement 6, sole-consumer 3, affinity 2, facade-exports 13, layout 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir } from "os";
import { openSync, writeSync } from "fs";
import { init_react_production, useEffect, useState, useRef } from "../vendor/react/cjs/react.production.js";
import {
  getStrictMcpConfig,
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
} from "./bootstrap/state.js";
import { collectProjectMcpServerNames } from "./services/mcpServerApproval.js";
import { getEffectiveProjectMcpServerStatus } from "./services/mcp/utils.js";
import { formatMcpServerLabel } from "./utils/plugins/lspPluginIntegration.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MCPServerApprovalDialog } from "./components/MCPServerApprovalDialog.js";
import { MCPServerMultiselectDialog } from "./components/MCPServerMultiselectDialog.js";
import { isBgSession } from "./utils/concurrentSessions.js";
import { env } from "./utils/env.js";
import { readJobState, writeStateAtomic, logJobWriteError } from "./services/daemon/jobState.js";
import { plural, cleanForDisplay } from "./utils/stringUtils.js";
import {
  checkHasTrustDialogAccepted,
  saveGlobalConfig,
  getWorkspacePersistedTrustKey,
  isWorkspacePersistedTrusted,
  isLocalSettingsGitTracked,
  markConfigBootPhaseComplete,
  getGlobalConfig,
} from "./utils/config.js";
import { primePlanSlugCollisions } from "./utils/plans.js";
import { blockingSettingsErrors } from "./utils/settings/settingsNotices.js";
import { normalizeCaseForComparison_2 } from "./utils/permissions/filesystem.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "./services/analytics/featureTelemetry.js";
import { logError } from "./utils/log.js";
import { toError, errorMessage } from "./utils/errors.js";
import { showScreen, runSteps } from "./utils/runSteps.js";
import { Text, Box } from "./ink/components/Text.js";
import { startDeferredPrefetches } from "./cli/startup/prepareSession.js";
import { recordFullscreenRenderFailure } from "./utils/fullscreenBootGuard.js";
import {
  emitExitMessage,
  gracefulShutdown,
  shutdownCoordinators,
  gracefulShutdownSync,
} from "./utils/gracefulShutdown.js";
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
import { isCodeModeAllowed } from "./utils/foresightStatus.js";
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
import { useMemoCache } from "../vendor/react/compiler-runtime.js";
import { fromEnum } from "./services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../runtime/bun-runtime.js";
import { useApp } from "./ink/components/Input.js";
import { getBaseRenderOptions } from "./utils/renderOptions.js";
import { FpsTracker } from "./utils/fpsTracker.js";
import { createStatsStore } from "./context/stats.js";
import { isSynchronizedOutputSupported } from "./ink/terminal.js";
import { RenderOnceAndExit } from "./utils/staticRender.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-ezx72dpn.js:1141-1145 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ezx72dpn.js:1141", () => {
  init_react_production();
});
//@ chunk-ezx72dpn.js:2792-2796 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ezx72dpn.js:2792", () => {
  init_react_production();
});
//@ chunk-ezx72dpn.js:4355-4566 placement
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
//@ chunk-ezx72dpn.js:4887-5224 placement
/**
 * 有待批准的项目 MCP 服务器时显示批准对话框（单个或多选），并在后台任务中标记等待批准。
 */
async function projectMcpApprovalDialog({ pendingServers, pluginServerNames }, onDone, storageV5) {
  if (pendingServers.length === 0) return null;
  let restoreState;
  restoreState = await markJobBlockedOnMcpApproval(
    pendingServers.map((pendingServer) =>
      formatMcpServerLabel(pendingServer, pluginServerNames.has(pendingServer)),
    ),
    storageV5,
  );
  let onDone_2 = (result) => {
    restoreJobStateAfterApproval(restoreState, storageV5)
      .catch(() => {})
      .then(() => onDone(result));
  };
  let [firstServer, ...restServers] = pendingServers;
  return firstServer !== undefined && restServers.length === 0
    ? jsxProd_default(MCPServerApprovalDialog, {
        serverName: firstServer,
        isPluginServer: pluginServerNames.has(firstServer),
        onDone: onDone_2,
      })
    : jsxProd_default(MCPServerMultiselectDialog, {
        serverNames: pendingServers,
        pluginServerNames,
        onDone: onDone_2,
      });
}
//@ chunk-ezx72dpn.js:5224-5693 placement
/**
 * 后台任务中把作业状态标记为"等待批准新的项目 MCP 服务器"，返回原状态以便之后恢复。
 */
async function markJobBlockedOnMcpApproval(serverLabels, storageV5) {
  {
    if (!isBgSession()) return;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState) return;
    let serverCount = serverLabels.length;
    let serverWord = plural(serverCount, "server");
    let needsWord = plural(serverCount, "needs", "need");
    try {
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...jobState,
          state: "blocked",
          detail: `${serverCount} new MCP ${serverWord} ${needsWord} approval`,
          tempo: "blocked",
          needs: `approve ${serverCount} new project MCP ${serverWord} (${serverLabels.join(", ")}) \u2014 attach to respond`,
          updatedAt: new Date().toISOString(),
        },
        storageV5,
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
//@ chunk-ezx72dpn.js:5693-5921 placement
async function restoreJobStateAfterApproval(restoreState, storageV5) {
  {
    if (!restoreState || !isBgSession()) return;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState || jobState.state !== "blocked") return;
    try {
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...jobState,
          ...restoreState,
          block: undefined,
          updatedAt: new Date().toISOString(),
        },
        storageV5,
      );
    } catch (error) {
      logJobWriteError(error);
    }
  }
}
//@ chunk-yq5f910z.js:2941-2971 sole-consumer
/**
 * 把回调以 false 调用
 */
function setFlagFalse(setFlag) {
  return setFlag(false);
}
//@ chunk-yq5f910z.js:2971-3012 sole-consumer
/**
 * 执行重新启动
 */
function execRelaunch(relauncher) {
  return relauncher.execRelaunch();
}
//@ chunk-yq5f910z.js:3012-3072 sole-consumer
/**
 * 先清理再重新启动
 */
function prepareAndRelaunch(cleanup) {
  cleanup();
  import("./utils/relaunch.js").then(execRelaunch);
}
//@ chunk-yq5f910z.js:3072-3122 affinity
/**
 * 状态置为 save-failed
 */
function markSaveFailed(state) {
  return {
    ...state,
    phase: "save-failed",
  };
}
//@ chunk-yq5f910z.js:3122-3179 facade-exports
function adoptPersistedWorkspaceTrust(projectRoot) {
  if (env.CLAUBBIT || !checkHasTrustDialogAccepted()) return;
  setSessionTrustAccepted(true);
  primePlanSlugCollisions(projectRoot);
}
//@ chunk-yq5f910z.js:3179-3750 facade-exports
function completeOnboarding(storageV5) {
  saveGlobalConfig(
    (current) => ({
      ...current,
      hasCompletedOnboarding: true,
      lastOnboardingVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    }),
    storageV5,
  );
}
//@ chunk-yq5f910z.js:3750-4373 facade-exports
function projectMcpApprovalStep(storageV5, notify) {
  return async (finish) => {
    let pendingProjectMcpServers = await getPendingProjectMcpServers(storageV5);
    let settingsErrors = blockingSettingsErrors();
    if (pendingProjectMcpServers.pendingServers.length === 0) return null;
    if (settingsErrors.length > 0) {
      let joined = normalizeCaseForComparison_2(
        settingsErrors.flatMap((error) => (error.file ? [cleanForDisplay(error.file)] : [])),
      ).join(", ");
      logFeatureSad("mcp_project_approval_dialog", "mcp_project_approval_skipped_settings_errors");
      notify({
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
            let notice = mcpApprovalPersistNotice(result);
            if (notice) notify(notice);
          } catch (error) {
            logError(toError(error));
          } finally {
            finish();
          }
        },
        storageV5,
      );
    } catch (error) {
      logFeatureBad("mcp_project_approval_dialog", "mcp_project_approval_dialog_threw");
      throw error;
    }
  };
}
//@ chunk-yq5f910z.js:4373-5119 layout
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
    getSessionApprovedMcpServers().some((entry) => entry.workspaceKey === workspaceKey) &&
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
//@ chunk-yq5f910z.js:5119-5205 facade-exports (2.1.88 match: exitWithMessage, 0.31)
/**
 * endInkWithError：在 Ink 里显示红色错误后卸载并退出。
 */
async function endInkWithError(root, message) {
  showScreen(
    root,
    jsxProd_default(Text, {
      color: "error",
      children: message,
    }),
  );
  root.unmount();
  await recordExitWithMessageCause(message);
}
//@ chunk-yq5f910z.js:5205-5350 layout
async function recordExitWithMessageCause(message) {
  let { setBgExitCause, setBgExitDetail } = await import("./utils/bgExitSidecars.js");
  setBgExitCause("exit_with_message");
  setBgExitDetail("exit_with_message", message);
}
//@ chunk-yq5f910z.js:5350-5480 facade-exports
/**
 * 显示“Loading your organization's managed settings…”等待提示。
 */
function showSettingsLoadHold(root) {
  showScreen(
    root,
    jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Loading your organization's managed settings\u2026",
      }),
    }),
  );
}
//@ chunk-yq5f910z.js:5480-5568 facade-exports (2.1.88 match: exitWithError, 0.651)
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
//@ chunk-yq5f910z.js:5568-6151 facade-exports
/**
 * exitWithMessage：渲染一段（可带颜色的）文本后卸载 Ink、执行 beforeExit、优雅退出。
 */
async function exitWithMessage(root, message, options) {
  let color = options?.color;
  let exitCode = options?.exitCode ?? 1;
  let messageElement = color
    ? jsxProd_default(Text, {
        color,
        children: message,
      })
    : jsxProd_default(Text, {
        children: message,
      });
  showScreen(
    root,
    options?.unsentPrompt
      ? jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            messageElement,
            jsxProd_default(Text, {
              children: `
Your message was not sent:
${options.unsentPrompt}`,
            }),
          ],
        })
      : messageElement,
  );
  root.unmount();
  await options?.beforeExit?.();
  if (exitCode !== 0) await recordExitWithMessageCause(message);
  let { flushAnalyticsSinks } = await import("./utils/gracefulShutdown.js");
  await flushAnalyticsSinks();
  let { drainRegisteredWriteQueues } = await import("./utils/settings/writeQueues.js");
  let { withTimeout } = await import("./utils/sleep.js");
  await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exitWithMessage)").catch(
    () => {},
  );
  process.exit(exitCode);
}
//@ chunk-yq5f910z.js:6151-6312 facade-exports (2.1.88 match: showSetupDialog, 0.644)
/**
 * showSetupDialog：在已有 Ink 根上显示一个对话框，返回其 done 回调的值。
 */
function showSetupDialog(root, renderer, options) {
  return new Promise((resolve, reject) => {
    runSteps(
      root,
      [
        (done) =>
          renderer((result) => {
            resolve(result);
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
//@ chunk-yq5f910z.js:6312-6951 facade-exports
/**
 * renderAndRun：把元素挂到 Ink 根，等待退出；渲染期未处理异常写入错误并退出。
 */
async function renderAndRun(root, element, host, storageV5, credentials) {
  let screenHandle = showScreen(root, element);
  markConfigBootPhaseComplete();
  startDeferredPrefetches(host, storageV5, credentials);
  try {
    if (
      (await Promise.race([
        root.waitUntilExit().then(() => "exited"),
        screenHandle.replaced.then(() => "replaced"),
      ])) === "replaced"
    )
      return;
  } catch (error) {
    let error_2 = toError(error);
    let fullscreenNote = (await recordFullscreenRenderFailure().catch(() => false))
      ? " It happened while the fullscreen renderer was starting, so the next launch will use the classic renderer (CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 forces that any time)."
      : "";
    emitExitMessage(
      `Claude Code exited after an unrecoverable interface error (${error_2.message}).${fullscreenNote}`,
    );
    if (isBgSession() || isSupervisedMode()) throw error;
    try {
      trackError(error_2, "unhandled_rejection");
    } catch {}
    await gracefulShutdown(1, "other");
    return;
  }
  await shutdownCoordinators.of(host.host).runBeforeInteractiveShutdown();
  await gracefulShutdown(0);
}
//@ chunk-yq5f910z.js:6951-6992 layout
var POST_ONBOARDING_GB_TIMEOUT_MS = 2000;
var POST_ONBOARDING_GB_LABEL = "GB post-onboarding init";
//@ chunk-yq5f910z.js:6992-8208 facade-exports
/**
 * 显示启动前的设置屏（showSetupScreens）：工作区信任、onboarding、MCP 项目审批、Chrome 提议等，返回 onboarding 结果。
 */
async function showSetupScreens(
  session,
  root,
  permissionMode,
  allowDangerouslySkipPermissions,
  commands,
  claudeInChrome,
  devChannels,
  offerClaudeInChrome,
  storageV5,
  credentials,
  askCloudDefaultReason,
) {
  let setupResult = {
    onboardingShown: false,
    onboardingSkippedSignIn: false,
    mcpApprovalSkipWarning: null,
    claudeInChromeAccepted: false,
  };
  let setSkipWarning = (mcpApprovalSkipWarning) => {
    setupResult.mcpApprovalSkipWarning = mcpApprovalSkipWarning;
  };
  if (isBgSession() || env.CLAUDE_BRIDGE_REATTACH_SESSION) {
    let trustAccepted = checkHasTrustDialogAccepted();
    let isTrusted =
      trustAccepted ||
      (env.CLAUDE_BG_WORKSPACE_TRUSTED === true && isSameRealPath(getOriginalCwd(), homedir()));
    if (!isTrusted)
      logForDebugging(
        "Workspace trust is not recorded for this directory; continuing as an untrusted session (hooks and project settings env stay off)",
        {
          level: "warn",
        },
      );
    let steps = [
      () => {
        if (isTrusted) setSessionTrustAccepted(true);
        resetGrowthBook({
          preservePendingExposures: true,
        });
        initializeGrowthBook().catch((error) => logError(toError(error)));
        if (isTrusted) {
          prefetchGitStatus(session);
          import("./utils/plugins/loadPluginHooks.js")
            .then((mod) => mod.loadHooksModulesHeldForTrust(storageV5, credentials))
            .catch((error) => logError(toError(error)));
        }
        return null;
      },
      projectMcpApprovalStep(storageV5, setSkipWarning),
      () => {
        if (isTrusted) {
          applyConfigEnvironmentVariables();
          import("./isDesktopEntrypointExempted.lazy.js").then((mod) => mod.maybePrewarmRecallIndex(session));
          primePlanSlugCollisions(storageV5);
        }
        releaseGrowthBookHold(session.host);
        capturePolicySnapshot();
        if (isTrusted) {
          if (!trustAccepted && !getIsRemoteMode() && !isBareMode())
            startMemoryWatcherLazy(storageV5, credentials);
          setImmediate(initializeTelemetryAfterTrust, storageV5);
        }
        return null;
      },
    ];
    await runSteps(root, steps, {
      session,
      storageV5,
    });
    return setupResult;
  }
  if (isEnvTruthy(false) || env.IS_DEMO) {
    adoptPersistedWorkspaceTrust(storageV5);
    releaseGrowthBookHold(session.host);
    capturePolicySnapshot();
    return setupResult;
  }
  await runSteps(
    root,
    setupSteps(
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
      setupResult,
    ),
    {
      session,
      onChangeAppState,
      marksJobBlocked: true,
      storageV5,
    },
  );
  return setupResult;
}
//@ chunk-yq5f910z.js:8208-13628 facade-exports (2.1.88 match: showSetupScreens, 0.341)
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
  setupResult,
) {
  let config = getGlobalConfig();
  let showedTrustDialog = false;
  let trustAccepted = true;
  return [
    (done) => {
      if (
        config.hasCompletedOnboarding &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "banner" &&
        env.CLAUDE_CODE_POWERUP_ONBOARDING !== "step"
      )
        return null;
      setupResult.onboardingShown = true;
      return import("./components/Onboarding.js").then(({ Onboarding }) =>
        jsxProd_default(Onboarding, {
          host: session.host,
          orgConfigGateFollows: true,
          onDone: ({ skippedSignIn }) => {
            setupResult.onboardingSkippedSignIn = skippedSignIn;
            completeOnboarding(storageV5);
            done();
          },
        }),
      );
    },
    (onDone) => {
      if (env.CLAUBBIT) return null;
      trustAccepted = checkHasTrustDialogAccepted();
      if (trustAccepted && !hasUngatedTrustSources()) return null;
      showedTrustDialog = true;
      return (trustAccepted ? Promise.resolve(false) : inheritsRelaunchHomeTrust()).then((inheritedTrust) => {
        if (inheritedTrust) {
          setHomeTrustDialogAccepted(true);
          return null;
        }
        return import("./components/TrustDialog/TrustDialog.js").then(({ TrustDialog }) =>
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
      if (showedTrustDialog) {
        clearPluginCache("post-trust: re-discover project @skills-dir plugins");
        if (shouldFillPluginLoadWithStore(credentials))
          loadAllPluginsCacheOnly(storageV5, credentials).catch(() => {});
      }
      import("./utils/plugins/loadPluginHooks.js")
        .then((mod) => mod.loadHooksModulesHeldForTrust(storageV5, credentials))
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
    (done) =>
      env.CLAUBBIT
        ? null
        : projectMcpApprovalStep(storageV5, (done) => {
            setupResult.mcpApprovalSkipWarning = done;
          })(done),
    async (done) => {
      if (env.CLAUBBIT || !(await shouldShowExternalIncludesDialog(session, storageV5))) return null;
      let externalIncludes = getExternalClaudeMdIncludes(
        await getMemoryFilesCached(session, true, storageV5, credentials),
      );
      let { ClaudeMdExternalIncludesDialog } = await import("./components/ClaudeMdExternalIncludesDialog.js");
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
      import("./isDesktopEntrypointExempted.lazy.js").then((done) => done.maybePrewarmRecallIndex(session));
      primePlanSlugCollisions(storageV5);
      capturePolicySnapshot();
      if (showedTrustDialog && !trustAccepted && !getIsRemoteMode() && !isBareMode())
        startMemoryWatcherLazy(storageV5, credentials);
      if (setupResult.onboardingShown) registerCleanup(exportTelemetryWhileStartPending);
      else setImmediate(initializeTelemetryAfterTrust, storageV5);
      return shouldHoldForOnboarding(session.host, config) ? awaitGrowthBookAfterOnboarding() : null;
    },
    async (done) => {
      if (isCodeModeAllowed()) {
        let { reviewCodeModeOptInInSetup } = await import("./utils/codeModeOptIn.js");
        let optInResult = await reviewCodeModeOptInInSetup();
        if (optInResult === "none") return null;
        let { CodeModeOptIn } = await import("./components/codeMode/CodeModeOptIn.lazy.js");
        return jsxProd_default(CodeModeOptIn, {
          step: optInResult,
          onStartWithout: () => done(),
          storageV5,
        });
      }
      return null;
    },
    async (done) => {
      if (
        !(await isQualifiedForGrove(storageV5, credentials)) ||
        (await wasGroveRecentlyConfirmed(credentials))
      )
        return null;
      let { GroveDialog } = await import("./components/grove/Grove.js");
      return jsxProd_default(GroveDialog, {
        showIfAlreadyViewed: false,
        location: setupResult.onboardingShown ? "onboarding" : "policy_update_modal",
        onDone: (result) => {
          if (result !== "escape") {
            done();
            return;
          }
          logEvent("tengu_grove_policy_exited", {});
          gracefulShutdownSync(0);
          setupResult.onboardingShown = false;
          setupResult.claudeInChromeAccepted = false;
          done("stop");
        },
      });
    },
    async (done) => {
      if (getProTrialStatus().status !== "not_started") return null;
      let { ProTrialStartScreen } = await import("./components/ProTrialStartScreen.js");
      logEvent("tengu_pro_trial_start_screen_shown", {});
      return jsxProd_default(ProTrialStartScreen, {
        onDone: () => done(),
        storageV5,
        credentials,
      });
    },
    async (done) => {
      if (!setupResult.onboardingShown) return null;
      let { resolvePowerupDiscoveryArm } = await import("./commands/powerup/discoveryCopy.js");
      if (resolvePowerupDiscoveryArm() !== "step") return null;
      let { PowerupDiscoveryStep } = await import("./components/PowerupDiscoveryStep.js");
      return jsxProd_default(PowerupDiscoveryStep, {
        onDone: () => done(),
      });
    },
    (done) => {
      let unapprovedCustomApiKey = getUnapprovedCustomApiKey();
      if (!unapprovedCustomApiKey) return null;
      return wrapFullPageNotice(
        import("./components/ApproveApiKey.js").then(({ ApproveApiKey }) =>
          jsxProd_default(ApproveApiKey, {
            customApiKeyTruncated: unapprovedCustomApiKey,
            onDone: () => done(),
          }),
        ),
      );
    },
    createProviderUpgradeStep("bedrock", storageV5),
    createProviderUpgradeStep("vertex", storageV5),
    async (done) => {
      let fallbackResult;
      try {
        fallbackResult = await apply3PDefaultFallbacks();
      } catch (error) {
        logError(error);
        return null;
      }
      let { lines, hasHardFailure } = fallbackResult;
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
      return import("./components/BypassPermissionsModeDialog.js").then(({ BypassPermissionsModeDialog }) =>
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
          import("./services/mcp/channelAllowlist.js"),
          import("./services/mcp/channelNotification.js"),
          import("./utils/settings/settings.js"),
        ]);
      let finish = () => {
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
        finish();
        return null;
      }
      let { DevChannelsDialog } = await import("./components/DevChannelsDialog.js");
      return jsxProd_default(DevChannelsDialog, {
        channels: devChannels,
        onAccept: () => {
          finish();
          done();
        },
      });
    },
    (done) => {
      if (!claudeInChrome || getGlobalConfig().hasCompletedClaudeInChromeOnboarding) return null;
      return wrapFullPageNotice(
        import("./components/ClaudeInChromeOnboarding.js").then(({ ClaudeInChromeOnboarding }) =>
          jsxProd_default(ClaudeInChromeOnboarding, {
            onDone: () => done(),
          }),
        ),
      );
    },
    async (done) => {
      if (!offerClaudeInChrome) return null;
      let { isChromeExtensionInstalled } = await import("./utils/claudeInChrome/setup.js");
      let pairedDeviceId = await withTimeout(
        isChromeExtensionInstalled(),
        1500,
        "chrome extension scan timed out before offer",
      ).catch(() => true);
      let hasPairedDevice = Boolean(getGlobalConfig().chromeExtension?.pairedDeviceId);
      if (!pairedDeviceId && !hasPairedDevice) {
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
      let hasChromeDefault = getGlobalConfig().claudeInChromeDefaultEnabled !== undefined;
      let { isChromeServerPolicyDenied } = await import("./utils/claudeInChrome/serverPolicy.js");
      let { isClaudeInChromeAllowed } = await import("./utils/claudeInChrome/setup.js");
      if (isChromeServerPolicyDenied() || !isClaudeInChromeAllowed()) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: blocked by enterprise MCP config, managed deniedMcpServers policy, or organization policy (allow_claude_browser_extension)",
        );
        return null;
      }
      if (hasChromeDefault) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: decision already recorded (another instance answered)",
        );
        setupResult.claudeInChromeAccepted = getGlobalConfig().claudeInChromeDefaultEnabled === true;
        return null;
      }
      if (!featureValue_CACHED_MAY_BE_STALE) {
        logForDebugging(
          "[Claude in Chrome] Skipping offer: tengu_chrome_auto_enable no longer set (stale GB cache)",
        );
        return null;
      }
      let { ChromeAutoEnableDialog } = await import("./components/ChromeAutoEnableDialog.js");
      return jsxProd_default(ChromeAutoEnableDialog, {
        onDone: (done_2) => {
          setupResult.claudeInChromeAccepted = done_2;
          done();
        },
        isDontAskMode: permissionMode === "dontAsk",
        isAutoMode: permissionMode === "auto",
      });
    },
  ];
}
//@ chunk-yq5f910z.js:13628-13839 facade-exports
/**
 * 启动未完成就退出时也导出一次 3P 遥测。
 */
async function exportTelemetryWhileStartPending() {
  try {
    if (isOTelInitPending() && getMeterProvider() === null) {
      await initializeTelemetryForExit();
      let { flushTelemetry } = await import("./utils/telemetry/bigQueryExportIntervalMs.lazy.js");
      await flushTelemetry();
    }
  } catch (error) {
    logForDebugging(`[3P telemetry] Export before exit failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-yq5f910z.js:13839-13978 layout
async function wrapFullPageNotice(noticePromise) {
  let [noticeElement, { FullPageNotice }] = await Promise.all([
    noticePromise,
    import("./components/design-system/NoticeUnderScene.js"),
  ]);
  return noticeElement === null
    ? null
    : jsxProd_default(FullPageNotice, {
        children: noticeElement,
      });
}
//@ chunk-yq5f910z.js:13978-14247 layout
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
//@ chunk-yq5f910z.js:14247-14460 layout
function DelayedCallback(props) {
  let $ = useMemoCache(4);
  let { afterMs, onDone, children } = props;
  let timerEffect;
  let timerDeps;
  if ($[0] !== afterMs || $[1] !== onDone) {
    timerEffect = () => {
      let timer = setTimeout(onDone, afterMs);
      return () => clearTimeout(timer);
    };
    timerDeps = [afterMs, onDone];
    $[0] = afterMs;
    $[1] = onDone;
    $[2] = timerEffect;
    $[3] = timerDeps;
  } else {
    timerEffect = $[2];
    timerDeps = $[3];
  }
  useEffect(timerEffect, timerDeps);
  return children;
}
//@ chunk-yq5f910z.js:14460-14830 layout
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
//@ chunk-yq5f910z.js:14830-16294 layout
function createProviderUpgradeStep(provider, storageV5) {
  let events = PROVIDER_UPGRADE_EVENTS[provider];
  return async (done) => {
    if (getAPIProvider() !== provider) return null;
    try {
      let [candidates, { upgradeKey }] = await Promise.all([
        provider === "bedrock"
          ? import("./utils/model/bedrockDefaultCheck.js").then((mod) =>
              withProbeDeadline("bedrock-upgrade", mod.findBedrockUpgradeCandidates()).then((rawCandidates) =>
                rawCandidates.map((candidate) => ({
                  ...candidate,
                  toId: candidate.toBedrockId,
                })),
              ),
            )
          : import("./utils/model/checkVertexDefaultAvailability.lazy.js").then((mod) =>
              withProbeDeadline("vertex-upgrade", mod.findVertexUpgradeCandidates()).then((rawCandidates) =>
                rawCandidates.map((candidate) => ({
                  ...candidate,
                  toId: candidate.toVertexId,
                })),
              ),
            ),
        import("./utils/model/stalePins.js"),
      ]);
      let declined =
        (provider === "bedrock"
          ? getGlobalConfig().bedrockDeclinedUpgrades
          : getGlobalConfig().vertexDeclinedUpgrades) ?? {};
      let filtered = candidates.filter((candidate) => declined[candidate.tier] !== upgradeKey(candidate));
      if (filtered.length === 0) return null;
      let [{ updateSettingsForSource }, { ThirdPartyModelUpgradeDialog }] = await Promise.all([
        import("./utils/settings/settings.js"),
        import("./components/ThirdPartyModelUpgradeDialog.lazy.js"),
      ]);
      async function answer(candidate, accepted) {
        let tier = fromEnum(candidate.tier);
        if (!accepted) {
          await saveGlobalConfig((config) => {
            let configKey = provider === "bedrock" ? "bedrockDeclinedUpgrades" : "vertexDeclinedUpgrades";
            return {
              ...config,
              [configKey]: {
                ...config[configKey],
                [candidate.tier]: upgradeKey(candidate),
              },
            };
          }, storageV5);
          logEvent(events.declined, {
            tier,
            from_key: fromEnum(candidate.fromKey),
            to_key: fromEnum(candidate.toKey),
          });
          return false;
        }
        let envPatch =
          candidate.tier === "haiku"
            ? {
                ANTHROPIC_DEFAULT_HAIKU_MODEL: candidate.toId,
                ...(candidate.envVar === "ANTHROPIC_SMALL_FAST_MODEL" && {
                  ANTHROPIC_SMALL_FAST_MODEL: candidate.toId,
                }),
              }
            : {
                [candidate.envVar]: candidate.toId,
              };
        let { error } = await updateSettingsForSource(
          "userSettings",
          {
            env: envPatch,
          },
          undefined,
          storageV5,
        );
        if (error) {
          logEvent(events.saveFailed, {
            tier,
          });
          return false;
        }
        for (let key of Object.keys(envPatch)) process.env[key] = candidate.toId;
        logEvent(events.accepted, {
          tier,
          from_key: fromEnum(candidate.fromKey),
          to_key: fromEnum(candidate.toKey),
        });
        return true;
      }
      return jsxProd_default(ProviderUpgradeDialog, {
        provider,
        pending: filtered,
        answer,
        onDone: () => done(),
        Dialog: ThirdPartyModelUpgradeDialog,
      });
    } catch (error) {
      logError(error);
      return null;
    }
  };
}
//@ chunk-yq5f910z.js:16294-18101 layout
function ProviderUpgradeDialog(props) {
  let $ = useMemoCache(27);
  let { provider, pending, answer, onDone, Dialog } = props;
  let initialState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialState = {
      at: 0,
      acceptedAny: false,
      phase: "asking",
    };
    $[0] = initialState;
  } else initialState = $[0];
  let [state, setState] = useState(initialState);
  let { at, acceptedAny, phase } = state;
  let { exit } = useApp();
  let lastIndexRef = useRef(null);
  let current = pending[at];
  let advance;
  if ($[1] !== pending.length) {
    advance = (accepted) =>
      setState((previous) => {
        let acceptedAny = previous.acceptedAny || accepted;
        if (previous.at + 1 < pending.length) {
          return {
            at: previous.at + 1,
            acceptedAny,
            phase: "asking",
          };
        }
        return {
          ...previous,
          acceptedAny,
          phase: acceptedAny ? "relaunching" : "done",
        };
      });
    $[1] = pending.length;
    $[2] = advance;
  } else advance = $[2];
  let advanceOne = advance;
  let phaseEffect;
  let phaseDeps;
  if ($[3] !== advanceOne || $[4] !== exit || $[5] !== onDone || $[6] !== phase || $[7] !== provider) {
    phaseEffect = () => {
      if (phase === "done") {
        onDone();
        return;
      }
      if (phase === "save-failed") {
        let timer = setTimeout(setFlagFalse, 2000, advanceOne);
        return () => clearTimeout(timer);
      }
      if (phase === "relaunching") {
        logEvent(PROVIDER_UPGRADE_EVENTS[provider].relaunch, {});
        let timer = setTimeout(prepareAndRelaunch, 250, exit);
        return () => clearTimeout(timer);
      }
    };
    phaseDeps = [phase, provider, advanceOne, onDone, exit];
    $[3] = advanceOne;
    $[4] = exit;
    $[5] = onDone;
    $[6] = phase;
    $[7] = provider;
    $[8] = phaseEffect;
    $[9] = phaseDeps;
  } else {
    phaseEffect = $[8];
    phaseDeps = $[9];
  }
  useEffect(phaseEffect, phaseDeps);
  if (phase === "relaunching" && acceptedAny) {
    let restartingElement;
    if ($[10] === MEMO_CACHE_SENTINEL) {
      restartingElement = jsxProd_default(Text, {
        dimColor: true,
        children: "Restarting Claude Code to apply the new model\u2026",
      });
      $[10] = restartingElement;
    } else restartingElement = $[10];
    return restartingElement;
  }
  if (current === undefined || phase === "done") {
    return null;
  }
  if (phase === "save-failed") {
    const tierLabel = TIER_LABELS[current.tier];
    let errorElement;
    if ($[11] !== tierLabel) {
      errorElement = jsxProd_default_2(Text, {
        color: "error",
        children: ["Failed to save ", tierLabel, " upgrade to settings."],
      });
      $[11] = tierLabel;
      $[12] = errorElement;
    } else errorElement = $[12];
    return errorElement;
  }
  const tierLabel = TIER_LABELS[current.tier];
  let onDone_2;
  if ($[13] !== advanceOne || $[14] !== answer || $[15] !== at || $[16] !== current || $[17] !== onDone) {
    onDone_2 = (answerIndex) => {
      if (lastIndexRef.current === at) {
        return;
      }
      lastIndexRef.current = at;
      answer(current, answerIndex).then(
        (answerResult) => {
          if (answerIndex && !answerResult) {
            setState(markSaveFailed);
            return;
          }
          advanceOne(answerResult);
        },
        (error) => {
          logError(error);
          onDone();
        },
      );
    };
    $[13] = advanceOne;
    $[14] = answer;
    $[15] = at;
    $[16] = current;
    $[17] = onDone;
    $[18] = onDone_2;
  } else onDone_2 = $[18];
  let dialogElement;
  if (
    $[19] !== Dialog ||
    $[20] !== at ||
    $[21] !== current.fromMarketingName ||
    $[22] !== current.toId ||
    $[23] !== current.toMarketingName ||
    $[24] !== tierLabel ||
    $[25] !== onDone_2
  ) {
    dialogElement = jsxProd_default(
      Dialog,
      {
        tierLabel,
        fromName: current.fromMarketingName,
        toName: current.toMarketingName,
        toProviderId: current.toId,
        onDone: onDone_2,
      },
      at,
    );
    $[19] = Dialog;
    $[20] = at;
    $[21] = current.fromMarketingName;
    $[22] = current.toId;
    $[23] = current.toMarketingName;
    $[24] = tierLabel;
    $[25] = onDone_2;
    $[26] = dialogElement;
  } else dialogElement = $[26];
  return dialogElement;
}
//@ chunk-yq5f910z.js:18101-18864 facade-exports (2.1.88 match: getRenderContext, 0.98)
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
  let frameLogFd = -1;
  let frameCount = 0;
  let max = Math.max(1, env.CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY || 1);
  if (frameTimingLogPath)
    try {
      frameLogFd = openSync(frameTimingLogPath, "a");
    } catch {}
  return {
    getFpsMetrics: () => fpsTracker.getMetrics(),
    stats,
    renderOptions: {
      ...baseOptions,
      onFrame: (event) => {
        fpsTracker.record(event.durationMs);
        stats.observe("frame_duration_ms", event.durationMs);
        if (frameLogFd >= 0 && event.phases) {
          let shouldSampleResources = frameCount++ % max === 0;
          let frameLogLine =
            JSON.stringify({
              total: event.durationMs,
              at: Date.now(),
              ...event.phases,
              ...(shouldSampleResources && {
                rss: process.memoryUsage.rss(),
                cpu: process.cpuUsage(),
              }),
            }) +
            `
`;
          writeSync(frameLogFd, frameLogLine);
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
//@ chunk-yq5f910z.js:18864-18948 affinity
function startMemoryWatcherLazy(storageV5, credentials) {
  import("./services/memorySync/memoryWatcher.js").then((mod) =>
    mod.startMemoryWatcher(storageV5, credentials),
  );
}
//@ chunk-0b83n7d5.js:742-818 fingerprint (2.1.88 match: renderAndRun, 1)
/**
 * 在 Ink 根上渲染元素并等待退出（子命令用的简化版 renderAndRun）。
 */
async function renderAndRun_2(root, element) {
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: element,
    }),
  );
  await root.waitUntilExit();
}
export {
  renderAndRun_2,
  showSetupDialog,
  exitWithMessage,
  renderAndRun,
  getPendingProjectMcpServers,
  adoptPersistedWorkspaceTrust,
  completeOnboarding,
  endInkWithError,
  exitWithError,
  exportTelemetryWhileStartPending,
  getRenderContext,
  projectMcpApprovalStep,
  setupSteps,
  showSettingsLoadHold,
  showSetupScreens,
};
