/**
 * cli/handlers/agents.ts
 *
 * 并入 claude agents 命令处理器（含 --json 输出与舰队开关）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/agents.ts
 * pieces: chunk-xv2m2k8x.js (1)
 * attribution: placement 1
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
  getRootSession,
  setSessionStartType,
} from "../../bootstrap/state.js";
import { clearPluginCache } from "../../utils/plugins/pluginLoader.js";
import { cliCarriesSessionConfig } from "../../utils/sessionConfigFlags.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";

//@ chunk-xv2m2k8x.js:12045-14681 placement
async function agentsCommandHandler(e, f = {}, o, credentials) {
  if (e.json) {
    await ensureFleetGateHydrated({
      kickGrowthBook: false,
    });
    if (!isAgentsFleetEnabled()) {
      fleetGateRejected("claude agents --json", undefined);
      return;
    }
    let { printAgentsJson } = await import("./chunk-p7xejzdb.js");
    await printAgentsJson(e.cwd, e.all === true, o);
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
      let s = {
        ...parseEarlyArgs(process.argv.slice(2)).config,
        settings: eagerParseCliFlag("--settings"),
        managedSettings: eagerParseCliFlag("--managed-settings"),
        settingSources: appliedSettingSourcesFlagValue(),
      };
      s.restricted ||= isRestrictedMode();
      let c = mergePluginDirs(s.pluginDir, withoutPluginDirs(pluginDirsFromEnv(), s.pluginDirNoMcp));
      if (c.length > 0 || s.pluginDirNoMcp.length > 0) {
        setInlinePlugins(c);
        setInlinePluginsNoMcp(s.pluginDirNoMcp);
        clearPluginCache("claude agents --plugin-dir (commander action)");
      }
      setCliSessionConfigCarried(
        cliCarriesSessionConfig({
          ...f,
          ...s,
        }),
      );
      let [
        { mountFleetViewWithComposerBack: w },
        { applyFleetViewHostWindowsEnv: S },
        { createRoot: C },
        { getBaseRenderOptions: y },
      ] = await Promise.all([
        import("./chunk-ygxzcsa5.js"),
        import("./chunk-7gry1hef.js"),
        import("./chunk-1m6xc21j.js"),
        import("./chunk-92g44ry1.js"),
      ]);
      S();
      let u = () =>
        void import("./chunk-5kp2513a.js").then((t) =>
          t.startBackgroundHousekeeping(getRootSession().host, o),
        );
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_wozniak", true);
      if (!featureValue_CACHED_MAY_BE_STALE) u();
      let permissionMode = e.dangerouslySkipPermissions ? "bypassPermissions" : e.permissionMode;
      let p = {
        permissionMode: permissionMode ?? e.inheritPermissionMode,
        ...(!permissionMode &&
          e.inheritPermissionMode && {
            permissionModeInherited: true,
          }),
        model: e.model,
        effort: e.effort,
        agent: e.agent,
        allowBypass: e.allowDangerouslySkipPermissions,
      };
      let { refuseBypassUnderRoot, applyBypassPolicyGate, ensureAgentsBypassConsent } =
        await import("./chunk-k88gsmtn.js");
      refuseBypassUnderRoot(p);
      let d = applyBypassPolicyGate(p);
      let r = await C(y(false));
      let { ensureAgentsWorkspaceTrust, agentsTrustDecision } = await import("./chunk-pn8x1715.js");
      await ensureAgentsWorkspaceTrust(r, agentsTrustDecision(), o);
      setSessionStartType("agents_view");
      let { checkHasTrustDialogAccepted } = await import("./chunk-eesswvbz.js");
      if (checkHasTrustDialogAccepted()) {
        if (featureValue_CACHED_MAY_BE_STALE) u();
        let [{ applyConfigEnvironmentVariables: t }, { initializeTelemetryAfterTrust: i }] =
          await Promise.all([import("./chunk-q6kb333n.js"), import("./chunk-4a9xkd77.js")]);
        t();
        i(o);
      }
      await ensureAgentsBypassConsent(r, d, o);
      let { orgConfigGateFlagCouldArm } = await import("./chunk-bbtp62nj.js");
      if (orgConfigGateFlagCouldArm()) {
        let { enforceOrgConfigGateAtStartup } = await import("./chunk-np0e9bed.js");
        await enforceOrgConfigGateAtStartup({
          interactive: true,
          showBlockedScreen: () =>
            import("./chunk-6bvzpeaf.js").then(
              (i) => i.showOrgConfigBlockedScreen,
              () => {
                return;
              },
            ),
          printMessage: async (i) => {
            let { endInkWithError } = await import("./chunk-pz8vz2wa.js");
            await endInkWithError(r, i);
          },
        });
      }
      let M = {
        cwdFilter: e.cwd,
        dispatchExtraArgs: earlyArgsToArgv(resolveEarlyArgPaths(s, resolve)),
        dispatchDefaults: d,
        entryChannel: isListReturnRelaunch() ? "list_return" : "cli_agents",
        storageV5: o,
        credentials,
      };
      await w(r, M);
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
