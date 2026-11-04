/**
 * commands/plugin/PluginOptionsFlow.tsx
 *
 * 插件安装后的选项配置流程（userConfig 步骤、保存与激活结果提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginOptionsFlow.tsx
 * pieces: chunk-hwmsct5x.js (1), chunk-vrb44rx7.js (16)
 * attribution: fingerprint 2, placement 15
 */
import { stripAnsi } from "../../utils/stripAnsi.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
  suspenseTypeExport,
  use,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { loadAllPlugins } from "../../utils/plugins/pluginLoader.js";
import {
  findMarketplace,
  getUnconfiguredOptions,
  loadPluginOptions,
  savePluginOptions as savePluginOptions_2,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { getUnconfiguredChannels } from "../../utils/plugins/mcpPluginIntegration.js";
import { getEnabledSettingSources } from "../../utils/settings/constants.js";
import { lookupByPluginAliases } from "../../utils/plugins/pluginConfigSources.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { NEEDS_CONFIG_NOTE } from "./activatePluginsAfterInstall.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { loadMcpServerUserConfig, saveMcpServerUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { SettingsDialogCancelBinding } from "../../utils/settings/mdm/constants.js";
import { PluginOptionsDialog } from "./PluginOptionsDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:222410-222714 fingerprint = findPluginOptionsTarget (0.49)
function findPluginOptionsTarget(pluginId) {
  if (typeof pluginId.value !== "string") return null;
  let resolvedPluginId = pluginId.value === "default" ? null : stripAnsi(pluginId.value);
  let displayName = typeof pluginId.displayName === "string" ? pluginId.displayName : "";
  let description = typeof pluginId.description === "string" ? pluginId.description : "";
  return {
    value: resolvedPluginId,
    label: sanitizeTitle(displayName) || (resolvedPluginId !== null ? sanitizeTitle(resolvedPluginId) : ""),
    description: markdownSafeText(description),
    ...(pluginId.disabled === true && {
      disabled: true,
    }),
  };
}
//@ chunk-vrb44rx7.js:43972-43976 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:43972", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:43976-43980 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:43976", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:43980-44043 placement
function channelNeedsOptions(channel) {
  return Object.keys(channel.userConfig ?? {}).length > 0;
}
//@ chunk-vrb44rx7.js:44043-44076 placement
function optionsSteps(steps) {
  return {
    steps,
  };
}
//@ chunk-vrb44rx7.js:44076-44091 placement
function noop() {}
//@ chunk-vrb44rx7.js:44091-44200 placement
function toPluginOptionsSaveError(error) {
  logForDebugging(`Failed to save plugin options: ${errorMessage(error)}`, {
    level: "error",
  });
  return error ?? Error("save failed");
}
//@ chunk-vrb44rx7.js:44200-44291 placement
async function findMarketplaceOfAllPlugins(pluginIds, state, storageV5) {
  let { enabled, disabled } = await loadAllPlugins(state, storageV5);
  return findMarketplace([...enabled, ...disabled], pluginIds);
}
//@ chunk-vrb44rx7.js:44291-44385 placement
async function hasUnconfiguredOptions(plugin, targetPlugin) {
  return (
    Object.keys(await getUnconfiguredOptions(plugin, targetPlugin)).length > 0 ||
    (await getUnconfiguredChannels(plugin, targetPlugin)).length > 0
  );
}
//@ chunk-vrb44rx7.js:44385-44810 placement
async function savePluginOptions(pluginId, options, state, credentials) {
  let marketplaceOfAllPlugins = await findMarketplaceOfAllPlugins(pluginId, state, credentials);
  if (!marketplaceOfAllPlugins || !(await hasUnconfiguredOptions(marketplaceOfAllPlugins, credentials)))
    return null;
  let saveResult;
  for (let source of getEnabledSettingSources()) {
    let entry = lookupByPluginAliases(getSettingsForSource(source)?.enabledPlugins, pluginId);
    if (entry !== undefined) saveResult = entry;
  }
  let installedDisabled =
    saveResult !== undefined
      ? saveResult === false
      : marketplaceOfAllPlugins.manifest.defaultEnabled === false;
  return {
    type: "plugin-options",
    plugin: marketplaceOfAllPlugins,
    pluginId,
    depNote: options?.suffix ?? "",
    alreadyInstalled: true,
    depsResolved: options?.changed ?? false,
    installedDisabled,
    installedDisabledByDefault:
      saveResult === undefined && marketplaceOfAllPlugins.manifest.defaultEnabled === false,
  };
}
//@ chunk-vrb44rx7.js:44810-47061 placement
/**
 * 生成安装/配置结果提示（已安装、需重载、加载失败、默认禁用、已激活等）。
 */
function formatInstallOutcome(props) {
  let $ = useMemoCache(22);
  let { viewState, onInstallComplete, onFinish } = props;
  let {
    plugin,
    pluginId,
    depNote,
    alreadyInstalled,
    depsResolved,
    installedDisabled,
    installedDisabledByDefault,
  } = viewState;
  let tabLabel = alreadyInstalled ? "Already installed" : "Installed";
  let [installing, setInstalling] = useState(false);
  let finishedRef = useRef(false);
  let content;
  let footer;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = () => () => {
      finishedRef.current = true;
    };
    footer = [];
    $[0] = content;
    $[1] = footer;
  } else {
    content = $[0];
    footer = $[1];
  }
  useEffect(content, footer);
  let canInstall = !alreadyInstalled || Boolean(depsResolved);
  let runInstall;
  if (
    $[2] !== installedDisabled ||
    $[3] !== installedDisabledByDefault ||
    $[4] !== onInstallComplete ||
    $[5] !== pluginId
  ) {
    runInstall = async function runInstall(config) {
      if (!config) {
        return "";
      }
      let installOutcome = onInstallComplete ? await onInstallComplete([pluginId]) : "reload-required";
      if (installedDisabled) {
        let enableCommand = claudeCommand("plugin enable", pluginId);
        let enableHint = `enable it in /plugin${enableCommand ? ` or run: ${enableCommand}` : ""}.`;
        let body =
          installOutcome === "load-failed"
            ? " The plugin couldn't be loaded \u2014 see /plugin for details."
            : "";
        return installedDisabledByDefault
          ? ` This plugin is disabled by default \u2014 ${enableHint}${body}`
          : ` This plugin is disabled \u2014 ${enableHint}${body}`;
      }
      switch (installOutcome) {
        case "activated": {
          return " Plugin is now active.";
        }
        case "needs-config": {
          return ` Plugin is now active.${NEEDS_CONFIG_NOTE}`;
        }
        case "load-failed": {
          return " The plugin couldn't be loaded \u2014 see /plugin for details.";
        }
        case "reload-required": {
          return " Run /reload-plugins to apply.";
        }
      }
    };
    $[2] = installedDisabled;
    $[3] = installedDisabledByDefault;
    $[4] = onInstallComplete;
    $[5] = pluginId;
    $[6] = runInstall;
  } else runInstall = $[6];
  let install = runInstall;
  if (installing) {
    let activatingBadge;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      activatingBadge = jsxProd_default(WorkerBadge, {
        message: "Activating plugin\u2026",
      });
      $[7] = activatingBadge;
    } else activatingBadge = $[7];
    return activatingBadge;
  }
  let onDone;
  if (
    $[8] !== install ||
    $[9] !== alreadyInstalled ||
    $[10] !== canInstall ||
    $[11] !== depNote ||
    $[12] !== onFinish ||
    $[13] !== onInstallComplete ||
    $[14] !== plugin ||
    $[15] !== pluginId ||
    $[16] !== tabLabel
  ) {
    onDone = (outcome, config, extra) => {
      (async () => {
        setInstalling(true);
        let chosen = (value) => {
          if (!finishedRef.current) onFinish(value);
        };
        oe: switch (outcome) {
          case "configured": {
            let hasExtra = Boolean(extra);
            let canProceed = canInstall || hasExtra;
            chosen(
              `\u2713 ${hasExtra ? (alreadyInstalled ? "Configured" : "Installed and configured") : tabLabel} ${getPluginDisplayName(plugin)}${depNote}.${await install(canProceed)}`,
            );
            break oe;
          }
          case "skipped": {
            let needsDeps = canInstall || Boolean(extra);
            chosen(
              `\u2713 ${tabLabel} ${getPluginDisplayName(plugin)}${depNote}.${await install(needsDeps)}`,
            );
            break oe;
          }
          case "read-error": {
            chosen(
              `${tabLabel} ${getPluginDisplayName(plugin)}${depNote}, but its saved options could not be read (${config}).${await install(canInstall)}`,
            );
            break oe;
          }
          case "error": {
            let failed = false;
            if (canInstall || Boolean(extra))
              failed = (await onInstallComplete?.([pluginId])) === "load-failed";
            chosen(
              `${tabLabel} but failed to save config: ${config}${failed ? " The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
            );
          }
        }
      })();
    };
    $[8] = install;
    $[9] = alreadyInstalled;
    $[10] = canInstall;
    $[11] = depNote;
    $[12] = onFinish;
    $[13] = onInstallComplete;
    $[14] = plugin;
    $[15] = pluginId;
    $[16] = tabLabel;
    $[17] = onDone;
  } else onDone = $[17];
  let details;
  if ($[18] !== plugin || $[19] !== pluginId || $[20] !== onDone) {
    details = jsxProd_default(PluginOptionsFlow, {
      plugin,
      pluginId,
      onDone,
    });
    $[18] = plugin;
    $[19] = pluginId;
    $[20] = onDone;
    $[21] = details;
  } else details = $[21];
  return details;
}
//@ chunk-vrb44rx7.js:47061-48783 fingerprint = PluginOptionsFlow (0.768)
function PluginOptionsFlow(props) {
  let $ = useMemoCache(24);
  let { plugin, pluginId, onDone } = props;
  let { storageV5, credentials } = useTheme_2();
  let loadSteps;
  if ($[0] !== credentials || $[1] !== plugin || $[2] !== pluginId || $[3] !== storageV5) {
    loadSteps = async function loadSteps() {
      let result = [];
      let unconfigured = await getUnconfiguredOptions(plugin, credentials);
      if (Object.keys(unconfigured).length > 0)
        result.push({
          key: "top-level",
          title: `Configure ${getPluginDisplayName(plugin)}`,
          subtitle: "Plugin options",
          schema: unconfigured,
          load: () => loadPluginOptions(pluginId, credentials),
          save: (values) => savePluginOptions_2(pluginId, values, plugin.manifest.userConfig, storageV5),
        });
      let channels = await getUnconfiguredChannels(plugin, credentials);
      for (const channel of channels)
        result.push({
          key: `channel:${channel.server}`,
          title: `Configure ${channel.displayName}`,
          subtitle: `Plugin: ${getPluginDisplayName(plugin)}`,
          schema: channel.configSchema,
          load: async () =>
            (await loadMcpServerUserConfig(pluginId, channel.server, credentials)) ?? undefined,
          save: (values) =>
            saveMcpServerUserConfig(pluginId, channel.server, values, channel.configSchema, storageV5),
        });
      return result;
    };
    $[0] = credentials;
    $[1] = plugin;
    $[2] = pluginId;
    $[3] = storageV5;
    $[4] = loadSteps;
  } else loadSteps = $[4];
  let load = loadSteps;
  let steps;
  if (
    $[5] !== load ||
    $[6] !== plugin.manifest.channels ||
    $[7] !== plugin.manifest.userConfig ||
    $[8] !== pluginId
  ) {
    steps = () =>
      Object.keys(plugin.manifest.userConfig ?? {}).length > 0 ||
      (plugin.manifest.channels ?? []).some(channelNeedsOptions)
        ? load().then(optionsSteps, (values_1) => {
            logOptionsReadFailure(pluginId, values_1);
            return {
              steps: [],
              error: errorMessage(values_1),
            };
          })
        : {
            steps: [],
          };
    $[5] = load;
    $[6] = plugin.manifest.channels;
    $[7] = plugin.manifest.userConfig;
    $[8] = pluginId;
    $[9] = steps;
  } else steps = $[9];
  let [loadedSteps] = useState(steps);
  let loadingRef = useRef(false);
  let [started, setStarted] = useState(false);
  if (!(loadedSteps instanceof Promise)) {
    let loader;
    if ($[10] !== onDone || $[11] !== loadedSteps) {
      loader = jsxProd_default(PluginOptionsLoader, {
        loaded: loadedSteps,
        onDone,
      });
      $[10] = onDone;
      $[11] = loadedSteps;
      $[12] = loader;
    } else loader = $[12];
    return loader;
  }
  if (started) {
    return null;
  }
  let onCancel;
  if ($[13] !== onDone) {
    onCancel = () => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setStarted(true);
      onDone("skipped", undefined, false);
    };
    $[13] = onDone;
    $[14] = onCancel;
  } else onCancel = $[14];
  let children;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(WorkerBadge, {
      message: "Loading\u2026",
      dimColor: true,
    });
    $[15] = children;
  } else children = $[15];
  let fallback;
  if ($[16] !== onCancel) {
    fallback = jsxProd_default(SettingsDialogCancelBinding, {
      onCancel,
      children,
    });
    $[16] = onCancel;
    $[17] = fallback;
  } else fallback = $[17];
  let children_2;
  if ($[18] !== onDone || $[19] !== loadedSteps) {
    children_2 = jsxProd_default(PluginOptionsStepsLoader, {
      steps: loadedSteps,
      onDone,
    });
    $[18] = onDone;
    $[19] = loadedSteps;
    $[20] = children_2;
  } else children_2 = $[20];
  let suspenseWrapper;
  if ($[21] !== fallback || $[22] !== children_2) {
    suspenseWrapper = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: children_2,
    });
    $[21] = fallback;
    $[22] = children_2;
    $[23] = suspenseWrapper;
  } else suspenseWrapper = $[23];
  return suspenseWrapper;
}
//@ chunk-vrb44rx7.js:48783-48932 placement
function PluginOptionsStepsLoader(props) {
  let $ = useMemoCache(3);
  let { steps, onDone } = props;
  let loaded = use(steps);
  let content;
  if ($[0] !== loaded || $[1] !== onDone) {
    content = jsxProd_default(PluginOptionsLoader, {
      loaded,
      onDone,
    });
    $[0] = loaded;
    $[1] = onDone;
    $[2] = content;
  } else content = $[2];
  return content;
}
//@ chunk-vrb44rx7.js:48932-50819 placement
/**
 * 读取已保存的插件选项并决定配置步骤（读失败、跳过、已配置）。
 */
function PluginOptionsLoader(props) {
  let $ = useMemoCache(34);
  let { loaded, onDone } = props;
  let { steps, error } = loaded;
  let [stepIndex, setStepIndex] = useState(0);
  let savedAny = useRef(false);
  let finishedRef = useRef(false);
  let savingRef = useRef(false);
  let onFinishOnce;
  if ($[0] !== onDone) {
    onFinishOnce = function onFinishOnce(...args) {
      let finishArgs = args;
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      onDone(...finishArgs);
    };
    $[0] = onDone;
    $[1] = onFinishOnce;
  } else onFinishOnce = $[1];
  let finish = onFinishOnce;
  let skipIfNoSteps;
  if ($[2] !== finish || $[3] !== error) {
    skipIfNoSteps = () => {
      if (error !== undefined) finish("read-error", error);
      else finish("skipped");
    };
    $[2] = finish;
    $[3] = error;
    $[4] = skipIfNoSteps;
  } else skipIfNoSteps = $[4];
  let runSkip = useEffectEvent(skipIfNoSteps);
  let onEmpty;
  if ($[5] !== error || $[6] !== runSkip || $[7] !== steps.length) {
    onEmpty = () => {
      if (error !== undefined || steps.length === 0) runSkip();
    };
    $[5] = error;
    $[6] = runSkip;
    $[7] = steps.length;
    $[8] = onEmpty;
  } else onEmpty = $[8];
  let emptyDeps;
  if ($[9] !== error || $[10] !== steps.length) {
    emptyDeps = [steps.length, error];
    $[9] = error;
    $[10] = steps.length;
    $[11] = emptyDeps;
  } else emptyDeps = $[11];
  useEffect(onEmpty, emptyDeps);
  let [pendingSave, setPendingSave] = useState(null);
  let handleSaved;
  if ($[12] !== finish || $[13] !== steps.length) {
    handleSaved = (entry, saveError) => {
      savingRef.current = false;
      setPendingSave(null);
      if (saveError !== undefined) {
        finish("error", errorMessage(saveError), savedAny.current);
        return;
      }
      if (Object.keys(entry.values).length > 0) savedAny.current = true;
      let nextIndex = entry.index + 1;
      if (nextIndex < steps.length) setStepIndex(nextIndex);
      else finish("configured", undefined, savedAny.current);
    };
    $[12] = finish;
    $[13] = steps.length;
    $[14] = handleSaved;
  } else handleSaved = $[14];
  let handleSavedOnce = useEffectEvent(handleSaved);
  let resolvePending;
  if ($[15] !== pendingSave || $[16] !== handleSavedOnce) {
    resolvePending = () => {
      if (pendingSave === null) {
        return;
      }
      let savedEntry = pendingSave;
      savedEntry.saveOutcome.then((outcome) => handleSavedOnce(savedEntry, outcome));
    };
    $[15] = pendingSave;
    $[16] = handleSavedOnce;
    $[17] = resolvePending;
  } else resolvePending = $[17];
  let saveDeps;
  if ($[18] !== pendingSave) {
    saveDeps = [pendingSave];
    $[18] = pendingSave;
    $[19] = saveDeps;
  } else saveDeps = $[19];
  useEffect(resolvePending, saveDeps);
  if (steps.length === 0) {
    return null;
  }
  let step = steps[stepIndex];
  let renderStep;
  if ($[20] !== step || $[21] !== stepIndex || $[22] !== pendingSave) {
    renderStep = function renderStep(stepProps) {
      if (finishedRef.current || savingRef.current || pendingSave !== null) {
        return;
      }
      savingRef.current = true;
      setPendingSave({
        index: stepIndex,
        values: stepProps,
        saveOutcome: (async () => step.save(stepProps))().then(noop, toPluginOptionsSaveError),
      });
    };
    $[20] = step;
    $[21] = stepIndex;
    $[22] = pendingSave;
    $[23] = renderStep;
  } else renderStep = $[23];
  let onSave = renderStep;
  let onCancel;
  if ($[24] !== finish) {
    onCancel = () => {
      if (savingRef.current) {
        return;
      }
      finish("skipped", undefined, savedAny.current);
    };
    $[24] = finish;
    $[25] = onCancel;
  } else onCancel = $[25];
  let content;
  if (
    $[26] !== step.key ||
    $[27] !== step.load ||
    $[28] !== step.schema ||
    $[29] !== step.subtitle ||
    $[30] !== step.title ||
    $[31] !== onSave ||
    $[32] !== onCancel
  ) {
    content = jsxProd_default(
      PluginOptionsDialogLoader,
      {
        title: step.title,
        subtitle: step.subtitle,
        configSchema: step.schema,
        load: step.load,
        onSave,
        onCancel,
      },
      step.key,
    );
    $[26] = step.key;
    $[27] = step.load;
    $[28] = step.schema;
    $[29] = step.subtitle;
    $[30] = step.title;
    $[31] = onSave;
    $[32] = onCancel;
    $[33] = content;
  } else content = $[33];
  return content;
}
//@ chunk-vrb44rx7.js:50819-51351 placement
/**
 * 异步执行 load 取已保存的插件选项（失败时记日志），在 Suspense 下渲染选项对话框；加载期间只挂取消键绑定。
 */
function PluginOptionsDialogLoader(props) {
  let $ = useMemoCache(14);
  let dialogProps;
  let load;
  if ($[0] !== props) {
    ({ load, ...dialogProps } = props);
    $[0] = props;
    $[1] = dialogProps;
    $[2] = load;
  } else {
    dialogProps = $[1];
    load = $[2];
  }
  let content;
  if ($[3] !== dialogProps.title || $[4] !== load) {
    content = () =>
      Promise.resolve()
        .then(load)
        .catch((error) => {
          logOptionsReadFailure(dialogProps.title, error);
        });
    $[3] = dialogProps.title;
    $[4] = load;
    $[5] = content;
  } else content = $[5];
  let [savedPromise] = useState(content);
  let fallback;
  if ($[6] !== dialogProps.onCancel) {
    fallback = jsxProd_default(SettingsDialogCancelBinding, {
      onCancel: dialogProps.onCancel,
    });
    $[6] = dialogProps.onCancel;
    $[7] = fallback;
  } else fallback = $[7];
  let children;
  if ($[8] !== dialogProps || $[9] !== savedPromise) {
    children = jsxProd_default(PluginOptionsDialogWithSaved, {
      dialog: dialogProps,
      saved: savedPromise,
    });
    $[8] = dialogProps;
    $[9] = savedPromise;
    $[10] = children;
  } else children = $[10];
  let footer;
  if ($[11] !== fallback || $[12] !== children) {
    footer = jsxProd_default(suspenseTypeExport, {
      fallback,
      children,
    });
    $[11] = fallback;
    $[12] = children;
    $[13] = footer;
  } else footer = $[13];
  return footer;
}
//@ chunk-vrb44rx7.js:51351-51441 placement
function logOptionsReadFailure(pluginId, error) {
  logForDebugging(`Failed to read saved plugin options (${pluginId}): ${errorMessage(error)}`, {
    level: "error",
  });
}
//@ chunk-vrb44rx7.js:51441-51594 placement
function PluginOptionsDialogWithSaved(props) {
  let $ = useMemoCache(3);
  let { dialog, saved } = props;
  let initialValues = use(saved);
  let content;
  if ($[0] !== dialog || $[1] !== initialValues) {
    content = jsxProd_default(PluginOptionsDialog, {
      ...dialog,
      initialValues,
    });
    $[0] = dialog;
    $[1] = initialValues;
    $[2] = content;
  } else content = $[2];
  return content;
}
export {
  findPluginOptionsTarget,
  PluginOptionsFlow,
  PluginOptionsDialogLoader,
  findMarketplaceOfAllPlugins,
  savePluginOptions,
  formatInstallOutcome,
};
