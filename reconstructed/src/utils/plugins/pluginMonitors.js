/**
 * utils/plugins/pluginMonitors.ts
 *
 * 2.1.316 新增。插件监视器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { j, P } from "../../../vendor/react/cjs/react.production.js";
import {
  loadPluginOptions,
  marketplaceSource,
  hasUserConfigVariables,
  substitutePluginVariables,
} from "./pluginOptionsStorage.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { expandMcpCredentialEnvVars } from "../envExpansion.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  enqueueMonitorEvent,
  createStreamLineBatcher,
  enqueueShellTerminalNotification,
} from "../../tasks/MonitorTask/monitorDelivery.js";
import { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS } from "../tokenBucket.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnlyByPolicy,
  policySettingsUnreadable,
} from "../hooks/hooksConfigSnapshot.js";
import { shouldSkipHookDueToTrust, zlr } from "../hooks.js";
import { getProjectConfigRoot, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { exec } from "../Shell.js";
import { defaultShellKind } from "../shell/shellToolUtils.js";
import { bunOptionsGuard } from "../permissions/protectedSettingsPaths.js";
import { backgroundShellCommand } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { logError } from "../log.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { arePluginHooksHeld } from "../permissions/permissionsLoader.js";
import { useSession } from "../../context/session.js";
import { Cr, useSetAppState, useAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { yX } from "../suggestions/suggestionCache.js";

//@ chunk-18hwfzwa.js:213490-213494 placement
j();
//@ chunk-18hwfzwa.js:213861-213865 placement
j();
//@ chunk-18hwfzwa.js:213865-214530 placement
async function resolvePluginMonitorCommand(h, x, D) {
  let L = x.manifest.userConfig ? await loadPluginOptions(marketplaceSource(x), D) : void 0;
  if (L && hasUserConfigVariables(h.command, L))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Monitor "${h.name}" from plugin ${x.name} references \${user_config.*} in its command. The substituted value would be passed to a shell. Monitor commands cannot safely reference \${user_config.*}; have the monitor script read the value from a config file or prompt instead.`,
      "plugin monitor command references ${user_config.*}",
    );
  let ee = (ke) => {
    let Re = substitutePluginVariables(ke, x);
    return runWithPluginWriteScope({ pluginSource: x.source }, () => expandMcpCredentialEnvVars(Re).expanded);
  };
  return {
    name: h.name,
    command: ee(h.command),
    description: h.description,
    when: h.when,
    pluginName: x.name,
    pluginId: x.source,
    pluginRoot: x.path,
  };
}
//@ chunk-18hwfzwa.js:214530-214879 placement
async function resolvePluginMonitors(h, x) {
  let D = [],
    L = !1;
  for (let ee of h) {
    let monitors = ee.monitors;
    if (!monitors) continue;
    for (let Re of monitors)
      try {
        D.push(await resolvePluginMonitorCommand(Re, ee, x));
      } catch (error) {
        ((L = !0),
          logForDebugging(`plugin ${ee.name}: failed to resolve monitor "${Re.name}": ${error}`, {
            level: "error",
          }));
      }
  }
  if (L) logFeatureBad("plugin_load_monitors", "plugin_load_monitors_resolve_failed");
  else logFeatureOk("plugin_load_monitors");
  return D;
}
//@ chunk-18hwfzwa.js:214879-215163 placement
function rateLimitMonitorOutput(
  h,
  x,
  D = enqueueMonitorEvent,
  L = createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS),
) {
  let ee = 0;
  function ke() {
    if (ee === 0) return;
    (D(
      h.description,
      `[plugin monitor "${h.name}" suppressed ${ee} events \u2014 output rate exceeded]`,
      x.id,
    ),
      (ee = 0));
  }
  return {
    onBatch: (Re) => {
      if (!L.tryConsume()) {
        ee++;
        return;
      }
      (ke(), D(h.description, Re, x.id));
    },
    onExit: ke,
  };
}
//@ chunk-18hwfzwa.js:215163-215899 placement
async function startPluginMonitor(h, x, D) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging(`Skipping plugin monitor ${h.pluginName}:${h.name} - workspace trust not accepted`);
    return;
  }
  let L = {},
    ee = rateLimitMonitorOutput(h, L),
    ke = createStreamLineBatcher(ee.onBatch),
    Re = getProjectConfigRoot(),
    Be = await exec(h.command, D.abortController.signal, defaultShellKind(), {
      host: x,
      ...(Re !== null && { cwd: Re }),
      preventCwdChanges: !0,
      shouldUseSandbox: !1,
      onStdout: ke.onData,
      toolCgroupClass: "plugin",
      storageV5: D.storageV5,
      bunOptionsFor: (We) => bunOptionsGuard(h.pluginId, We),
    });
  L.id = Be.taskOutput.taskId;
  let He = await backgroundShellCommand(
    {
      command: h.command,
      description: h.description,
      shellCommand: Be,
      toolUseId: void 0,
      agentId: void 0,
      kind: "monitor",
    },
    D,
  );
  return (
    Be.result.then(async () => {
      try {
        try {
          (ke.flush(!0), ee.onExit());
        } finally {
          let { terminalNotification: terminalNotification } = await He.settled;
          if (terminalNotification) enqueueShellTerminalNotification(terminalNotification);
        }
      } catch (error) {
        logError(error);
      }
    }),
    L.id
  );
}
/**
 * 启动插件声明的 monitor（后台命令，输出作为事件送入会话）：按 always/on-skill-invoke 触发方式，未接受工作区信任时跳过，失败记录 plugin_arm_monitor。
 */
//@ chunk-18hwfzwa.js:215899-216443 placement
async function armPluginMonitors(
  h,
  x,
  D,
  L,
  ee = startPluginMonitor,
  ke = getPluginRegistry().armedMonitorKeys,
) {
  if (isCustomizationDisabled("pluginMonitors")) return;
  if (getIsNonInteractiveSession()) return;
  let Re = shouldAllowManagedHooksOnlyByPolicy() || policySettingsUnreadable(),
    filtered = h.filter((We) => !arePluginHooksHeld(We) && (!Re || zlr(We.source))),
    He = !1;
  for (let We of await resolvePluginMonitors(filtered, L.credentials)) {
    if (!x(We)) continue;
    let ze = `${We.pluginName}:${We.name}`;
    if (ke.has(ze)) continue;
    ke.add(ze);
    try {
      if ((await ee(We, D, L)) === void 0) ke.delete(ze);
    } catch (error) {
      (ke.delete(ze),
        (He = !0),
        logForDebugging(`plugin monitor ${ze}: failed to arm: ${error}`, { level: "error" }));
    }
  }
  if (He) logFeatureSad("plugin_arm_monitor", "plugin_arm_monitor_failed");
  else logFeatureOk("plugin_arm_monitor");
}
//@ chunk-18hwfzwa.js:216443-216886 placement
function shouldArmPluginMonitors({ enabled: enabled }) {
  let x = useSession(),
    D = Cr(),
    L = useSetAppState(),
    ee = useSetVoiceState(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Be = useAppState((He) => He.plugins.enabled);
  P(() => {
    if (!enabled) return;
    let He = () => ({
      abortController: new AbortController(),
      taskRegistry: ee,
      storageV5: storageV5,
      credentials: credentials,
    });
    return (
      armPluginMonitors(Be, (We) => We.when === "always", x.host, He()),
      yX.of(x).skillInvoked.subscribe((We) => {
        armPluginMonitors(
          D.getState().plugins.enabled,
          (ze) => ze.when === `on-skill-invoke:${We}`,
          x.host,
          He(),
        );
      })
    );
  }, [enabled, Be, x, D, L, ee, storageV5, credentials]);
}
//@ chunk-18hwfzwa.js:216886-216890 placement
j();

export { shouldArmPluginMonitors };
