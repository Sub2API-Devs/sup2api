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
import { init_react_production, useEffect } from "../../../vendor/react/cjs/react.production.js";
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
import { shouldSkipHookDueToTrust, isManagedHookAllowed } from "../hooks.js";
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
import { useAppStoreDirect, useSetAppState, useAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { suggestionCacheBySessionRoot } from "../suggestions/suggestionCache.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:213490-213494 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:213490", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:213861-213865 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:213861", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:213865-214530 placement
async function resolvePluginMonitorCommand(monitor, plugin, credentials) {
  let options = plugin.manifest.userConfig
    ? await loadPluginOptions(marketplaceSource(plugin), credentials)
    : undefined;
  if (options && hasUserConfigVariables(monitor.command, options))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Monitor "${monitor.name}" from plugin ${plugin.name} references \${user_config.*} in its command. The substituted value would be passed to a shell. Monitor commands cannot safely reference \${user_config.*}; have the monitor script read the value from a config file or prompt instead.`,
      "plugin monitor command references ${user_config.*}",
    );
  let expand = (command) => {
    let substituted = substitutePluginVariables(command, plugin);
    return runWithPluginWriteScope(
      {
        pluginSource: plugin.source,
      },
      () => expandMcpCredentialEnvVars(substituted).expanded,
    );
  };
  return {
    name: monitor.name,
    command: expand(monitor.command),
    description: monitor.description,
    when: monitor.when,
    pluginName: plugin.name,
    pluginId: plugin.source,
    pluginRoot: plugin.path,
  };
}
//@ chunk-18hwfzwa.js:214530-214879 placement
async function resolvePluginMonitors(plugins, credentials) {
  let commands = [];
  let hadFailure = false;
  for (let plugin of plugins) {
    let monitors = plugin.monitors;
    if (!monitors) continue;
    for (let monitor of monitors)
      try {
        commands.push(await resolvePluginMonitorCommand(monitor, plugin, credentials));
      } catch (error) {
        hadFailure = true;
        logForDebugging(`plugin ${plugin.name}: failed to resolve monitor "${monitor.name}": ${error}`, {
          level: "error",
        });
      }
  }
  if (hadFailure) logFeatureBad("plugin_load_monitors", "plugin_load_monitors_resolve_failed");
  else logFeatureOk("plugin_load_monitors");
  return commands;
}
//@ chunk-18hwfzwa.js:214879-215163 placement
function rateLimitMonitorOutput(
  monitor,
  output,
  enqueue = enqueueMonitorEvent,
  bucket = createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS),
) {
  let suppressed = 0;
  function flushSuppressed() {
    if (suppressed === 0) return;
    enqueue(
      monitor.description,
      `[plugin monitor "${monitor.name}" suppressed ${suppressed} events \u2014 output rate exceeded]`,
      output.id,
    );
    suppressed = 0;
  }
  return {
    onBatch: (batch) => {
      if (!bucket.tryConsume()) {
        suppressed++;
        return;
      }
      flushSuppressed();
      enqueue(monitor.description, batch, output.id);
    },
    onExit: flushSuppressed,
  };
}
//@ chunk-18hwfzwa.js:215163-215899 placement
async function startPluginMonitor(resolvedMonitor, host, context) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging(
      `Skipping plugin monitor ${resolvedMonitor.pluginName}:${resolvedMonitor.name} - workspace trust not accepted`,
    );
    return;
  }
  let outputSnapshot = {};
  let limiter = rateLimitMonitorOutput(resolvedMonitor, outputSnapshot);
  let streamLineBatcher = createStreamLineBatcher(limiter.onBatch);
  let projectConfigRoot = getProjectConfigRoot();
  let shellCommand = await exec(resolvedMonitor.command, context.abortController.signal, defaultShellKind(), {
    host,
    ...(projectConfigRoot !== null && {
      cwd: projectConfigRoot,
    }),
    preventCwdChanges: true,
    shouldUseSandbox: false,
    onStdout: streamLineBatcher.onData,
    toolCgroupClass: "plugin",
    storageV5: context.storageV5,
    bunOptionsFor: (command) => bunOptionsGuard(resolvedMonitor.pluginId, command),
  });
  outputSnapshot.id = shellCommand.taskOutput.taskId;
  let background = await backgroundShellCommand(
    {
      command: resolvedMonitor.command,
      description: resolvedMonitor.description,
      shellCommand,
      toolUseId: undefined,
      agentId: undefined,
      kind: "monitor",
    },
    context,
  );
  shellCommand.result.then(async () => {
    try {
      try {
        streamLineBatcher.flush(true);
        limiter.onExit();
      } finally {
        let { terminalNotification } = await background.settled;
        if (terminalNotification) enqueueShellTerminalNotification(terminalNotification);
      }
    } catch (error) {
      logError(error);
    }
  });
  return outputSnapshot.id;
}
//@ chunk-18hwfzwa.js:215899-216443 placement
/**
 * 启动插件声明的 monitor（后台命令，输出作为事件送入会话）：按 always/on-skill-invoke 触发方式，未接受工作区信任时跳过，失败记录 plugin_arm_monitor。
 */
async function armPluginMonitors(
  armed,
  shouldArm,
  host,
  context,
  startMonitor = startPluginMonitor,
  armedKeys = getPluginRegistry().armedMonitorKeys,
) {
  if (isCustomizationDisabled("pluginMonitors")) return;
  if (getIsNonInteractiveSession()) return;
  let managedOnly = shouldAllowManagedHooksOnlyByPolicy() || policySettingsUnreadable();
  let plugins = armed.filter(
    (plugin) => !arePluginHooksHeld(plugin) && (!managedOnly || isManagedHookAllowed(plugin.source)),
  );
  let hadFailure = false;
  for (let monitor of await resolvePluginMonitors(plugins, context.credentials)) {
    if (!shouldArm(monitor)) continue;
    let key = `${monitor.pluginName}:${monitor.name}`;
    if (armedKeys.has(key)) continue;
    armedKeys.add(key);
    try {
      if ((await startMonitor(monitor, host, context)) === undefined) armedKeys.delete(key);
    } catch (error) {
      armedKeys.delete(key);
      hadFailure = true;
      logForDebugging(`plugin monitor ${key}: failed to arm: ${error}`, {
        level: "error",
      });
    }
  }
  if (hadFailure) logFeatureSad("plugin_arm_monitor", "plugin_arm_monitor_failed");
  else logFeatureOk("plugin_arm_monitor");
}
//@ chunk-18hwfzwa.js:216443-216886 placement
function shouldArmPluginMonitors({ enabled }) {
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let setVoiceState = useSetVoiceState();
  let { storageV5, credentials } = useTheme_2();
  let enabled_2 = useAppState((state) => state.plugins.enabled);
  useEffect(() => {
    if (!enabled) return;
    let makeContext = () => ({
      abortController: new AbortController(),
      taskRegistry: setVoiceState,
      storageV5,
      credentials,
    });
    armPluginMonitors(enabled_2, (monitor) => monitor.when === "always", session.host, makeContext());
    return suggestionCacheBySessionRoot.of(session).skillInvoked.subscribe((skillName) => {
      armPluginMonitors(
        appStoreDirect.getState().plugins.enabled,
        (monitor) => monitor.when === `on-skill-invoke:${skillName}`,
        session.host,
        makeContext(),
      );
    });
  }, [enabled, enabled_2, session, appStoreDirect, setAppState, setVoiceState, storageV5, credentials]);
}
//@ chunk-18hwfzwa.js:216886-216890 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:216886", () => {
  init_react_production();
});
export { shouldArmPluginMonitors };
