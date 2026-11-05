/**
 * cli/handlers/agents.ts
 *
 * 并入 claude agents 命令处理器（含 --json 输出与舰队开关）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/agents.ts
 * pieces: chunk-krzstbbv.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import {
  ensureFleetGateHydrated,
  isAgentsFleetEnabled,
  fleetGateRejected,
  consumeAgentViewRelaunchMarker,
  isListReturnRelaunch,
} from "../../utils/fleetGates.js";
import { cliOk } from "../exit.js";
import { logEvent } from "../../services/analytics/index.js";
import { parseEarlyArgs, earlyArgsToArgv, resolveEarlyArgPaths } from "../earlyArgs.js";
import { eagerParseCliFlag } from "../../utils/cliArgs.js";
import { appliedSettingSourcesFlagValue } from "../../utils/settings/constants.js";
import { isRestrictedMode } from "../../utils/envUtils.js";
import { mergePluginDirs, withoutPluginDirs, pluginDirsFromEnv } from "../../utils/plugins/pluginDirsEnv.js";
import {
  setInlinePlugins,
  setInlinePluginsNoMcp,
  setCliSessionConfigCarried,
  setCliConfigBeyondSessionState,
  getRootSession,
  setSessionStartType,
} from "../../bootstrap/state.js";
import { clearPluginCache } from "../../utils/plugins/pluginLoader.js";
import {
  cliCarriesSessionConfig,
  cliCarriesConfigBeyondSessionState,
} from "../../utils/sessionConfigFlags.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";

//@ chunk-krzstbbv.js:13201-15859 placement
async function agentsCommandHandler(options, launchState = {}, storage, credentials) {
  if (options.json) {
    await ensureFleetGateHydrated({
      kickGrowthBook: false,
    });
    if (!isAgentsFleetEnabled()) {
      fleetGateRejected("claude agents --json", undefined);
      return;
    }
    let { printAgentsJson } = await import("./printAgentsJson.lazy.js");
    await printAgentsJson(options.cwd, options.all === true, storage);
    cliOk();
  }
  if (process.stdout.isTTY) {
    await ensureFleetGateHydrated();
    if (isAgentsFleetEnabled()) {
      let relaunch = consumeAgentViewRelaunchMarker();
      logEvent("tengu_fleetview", {
        viaCommander: true,
        relaunch,
      });
      let earlyConfig = {
        ...parseEarlyArgs(process.argv.slice(2)).config,
        settings: eagerParseCliFlag("--settings"),
        managedSettings: eagerParseCliFlag("--managed-settings"),
        settingSources: appliedSettingSourcesFlagValue(),
      };
      earlyConfig.restricted ||= isRestrictedMode();
      let pluginDirs = mergePluginDirs(
        earlyConfig.pluginDir,
        withoutPluginDirs(pluginDirsFromEnv(), earlyConfig.pluginDirNoMcp),
      );
      if (pluginDirs.length > 0 || earlyConfig.pluginDirNoMcp.length > 0) {
        setInlinePlugins(pluginDirs);
        setInlinePluginsNoMcp(earlyConfig.pluginDirNoMcp);
        clearPluginCache("claude agents --plugin-dir (commander action)");
      }
      setCliSessionConfigCarried(
        cliCarriesSessionConfig({
          ...launchState,
          ...earlyConfig,
        }),
      );
      setCliConfigBeyondSessionState(
        cliCarriesConfigBeyondSessionState({
          ...launchState,
          ...earlyConfig,
        }),
      );
      let [
        { mountFleetViewWithComposerBack },
        { applyFleetViewHostWindowsEnv },
        { createRoot },
        { getBaseRenderOptions },
      ] = await Promise.all([
        import("../../components/fleet/mountFleetView.js"),
        import("../../screens/FleetView/FleetViewScreen.js"),
        import("../../ink/components/Ansi.lazy.js"),
        import("../../utils/renderOptions.js"),
      ]);
      applyFleetViewHostWindowsEnv();
      let startHousekeeping = () =>
        void import("../../utils/backgroundHousekeeping.js").then((housekeepingModule) =>
          housekeepingModule.startBackgroundHousekeeping(getRootSession().host, storage),
        );
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_wozniak", true);
      if (!featureValue_CACHED_MAY_BE_STALE) startHousekeeping();
      let permissionMode = options.dangerouslySkipPermissions ? "bypassPermissions" : options.permissionMode;
      let dispatchDefaults = {
        permissionMode: permissionMode ?? options.inheritPermissionMode,
        ...(!permissionMode &&
          options.inheritPermissionMode && {
            permissionModeInherited: true,
          }),
        model: options.model,
        effort: options.effort,
        agent: options.agent,
        allowBypass: options.allowDangerouslySkipPermissions,
      };
      let { refuseBypassUnderRoot, applyBypassPolicyGate, ensureAgentsBypassConsent } =
        await import("../../utils/permissions/applyBypassPolicyGate.lazy.js");
      refuseBypassUnderRoot(dispatchDefaults);
      let bypassGate = applyBypassPolicyGate(dispatchDefaults);
      let root = await createRoot(getBaseRenderOptions(false));
      let { ensureAgentsWorkspaceTrust, agentsTrustDecision } =
        await import("../../utils/agentsWorkspaceTrust.js");
      await ensureAgentsWorkspaceTrust(root, agentsTrustDecision(), storage);
      setSessionStartType("agents_view");
      let { checkHasTrustDialogAccepted } = await import("../../utils/config.js");
      if (checkHasTrustDialogAccepted()) {
        if (featureValue_CACHED_MAY_BE_STALE) startHousekeeping();
        let [{ applyConfigEnvironmentVariables }, { initializeTelemetryAfterTrust }] = await Promise.all([
          import("../../utils/managedEnvApply.js"),
          import("../../entrypoints/init.js"),
        ]);
        applyConfigEnvironmentVariables();
        initializeTelemetryAfterTrust(storage);
      }
      await ensureAgentsBypassConsent(root, bypassGate, storage);
      let { orgConfigGateFlagCouldArm } = await import("../../services/policyLimits/orgConfigGateFlag.js");
      if (orgConfigGateFlagCouldArm()) {
        let { enforceOrgConfigGateAtStartup } =
          await import("../../services/policyLimits/orgConfigStartup.js");
        await enforceOrgConfigGateAtStartup({
          interactive: true,
          showBlockedScreen: () =>
            import("../../components/OrgConfigBlockedScreen.js").then(
              (blockedScreenModule) => blockedScreenModule.showOrgConfigBlockedScreen,
              () => {
                return;
              },
            ),
          printMessage: async (message) => {
            let { endInkWithError } = await import("../../interactiveHelpers.js");
            await endInkWithError(root, message);
          },
        });
      }
      let viewOptions = {
        cwdFilter: options.cwd,
        dispatchExtraArgs: earlyArgsToArgv(resolveEarlyArgPaths(earlyConfig, resolve)),
        dispatchDefaults: bypassGate,
        entryChannel: isListReturnRelaunch() ? "list_return" : "cli_agents",
        storageV5: storage,
        credentials,
      };
      await mountFleetViewWithComposerBack(root, viewOptions);
      await gracefulShutdown(0, "other", {
        suppressResumeHint: true,
      });
      return;
    }
  }
  fleetGateRejected(
    "claude agents",
    process.stdout.isTTY
      ? undefined
      : "requires an interactive terminal (stdout is not a TTY) \u2014 use 'claude agents --json' for a machine-readable listing",
  );
}
export { agentsCommandHandler };
