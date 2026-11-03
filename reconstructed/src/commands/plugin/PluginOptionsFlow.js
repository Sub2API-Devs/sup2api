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
import { init_react_production, y, R, P, fo, Qr, Oo } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { stripAnsi } from "../../utils/stripAnsi.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";

//@ chunk-vrb44rx7.js:43972-43976 placement
init_react_production();
//@ chunk-vrb44rx7.js:43976-43980 placement
init_react_production();
//@ chunk-vrb44rx7.js:43980-44043 placement
function channelNeedsOptions(Se) {
  return Object.keys(Se.userConfig ?? {}).length > 0;
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
function toPluginOptionsSaveError(ft) {
  logForDebugging(`Failed to save plugin options: ${errorMessage(ft)}`, {
    level: "error",
  });
  return ft ?? Error("save failed");
}
//@ chunk-vrb44rx7.js:44200-44291 placement
async function findMarketplaceOfAllPlugins(i, h, k) {
  let { enabled, disabled } = await loadAllPlugins(h, k);
  return findMarketplace([...enabled, ...disabled], i);
}
//@ chunk-vrb44rx7.js:44291-44385 placement
async function hasUnconfiguredOptions(plugin, h) {
  return (
    Object.keys(await getUnconfiguredOptions(plugin, h)).length > 0 ||
    (await getUnconfiguredChannels(plugin, h)).length > 0
  );
}
//@ chunk-vrb44rx7.js:44385-44810 placement
async function savePluginOptions(i, h, storageV5, credentials) {
  let marketplaceOfAllPlugins = await findMarketplaceOfAllPlugins(i, storageV5, credentials);
  if (!marketplaceOfAllPlugins || !(await hasUnconfiguredOptions(marketplaceOfAllPlugins, credentials)))
    return null;
  let T;
  for (let U of getEnabledSettingSources()) {
    let L = lookupByPluginAliases(getSettingsForSource(U)?.enabledPlugins, i);
    if (L !== undefined) T = L;
  }
  let installedDisabled =
    T !== undefined ? T === false : marketplaceOfAllPlugins.manifest.defaultEnabled === false;
  return {
    type: "plugin-options",
    plugin: marketplaceOfAllPlugins,
    pluginId: i,
    depNote: h?.suffix ?? "",
    alreadyInstalled: true,
    depsResolved: h?.changed ?? false,
    installedDisabled,
    installedDisabledByDefault: T === undefined && marketplaceOfAllPlugins.manifest.defaultEnabled === false,
  };
}
//@ chunk-vrb44rx7.js:44810-47061 placement
/**
 * 生成安装/配置结果提示（已安装、需重载、加载失败、默认禁用、已激活等）。
 */
function formatInstallOutcome(props) {
  let pe = w(22);
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
  let V = alreadyInstalled ? "Already installed" : "Installed";
  let [B, _] = y(false);
  let J = R(false);
  let fe;
  let me;
  if (pe[0] === MEMO_CACHE_SENTINEL) {
    fe = () => () => {
      J.current = true;
    };
    me = [];
    pe[0] = fe;
    pe[1] = me;
  } else {
    fe = pe[0];
    me = pe[1];
  }
  P(fe, me);
  let ne = !alreadyInstalled || Boolean(depsResolved);
  let he;
  if (
    pe[2] !== installedDisabled ||
    pe[3] !== installedDisabledByDefault ||
    pe[4] !== onInstallComplete ||
    pe[5] !== pluginId
  ) {
    he = async function ae(W) {
      if (!W) {
        return "";
      }
      let Oe = onInstallComplete ? await onInstallComplete([pluginId]) : "reload-required";
      if (installedDisabled) {
        let rt = claudeCommand("plugin enable", pluginId);
        let et = `enable it in /plugin${rt ? ` or run: ${rt}` : ""}.`;
        let je = Oe === "load-failed" ? " The plugin couldn't be loaded \u2014 see /plugin for details." : "";
        return installedDisabledByDefault
          ? ` This plugin is disabled by default \u2014 ${et}${je}`
          : ` This plugin is disabled \u2014 ${et}${je}`;
      }
      switch (Oe) {
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
    pe[2] = installedDisabled;
    pe[3] = installedDisabledByDefault;
    pe[4] = onInstallComplete;
    pe[5] = pluginId;
    pe[6] = he;
  } else he = pe[6];
  let ae = he;
  if (B) {
    let Se;
    if (pe[7] === MEMO_CACHE_SENTINEL) {
      Se = jsxProd_default(WorkerBadge, {
        message: "Activating plugin\u2026",
      });
      pe[7] = Se;
    } else Se = pe[7];
    return Se;
  }
  let onDone;
  if (
    pe[8] !== ae ||
    pe[9] !== alreadyInstalled ||
    pe[10] !== ne ||
    pe[11] !== depNote ||
    pe[12] !== onFinish ||
    pe[13] !== onInstallComplete ||
    pe[14] !== plugin ||
    pe[15] !== pluginId ||
    pe[16] !== V
  ) {
    onDone = (kt, Tt, Ke) => {
      (async () => {
        _(true);
        let He = (Et) => {
          if (!J.current) onFinish(Et);
        };
        oe: switch (kt) {
          case "configured": {
            let ct = Boolean(Ke);
            let Ct = ne || ct;
            He(
              `\u2713 ${ct ? (alreadyInstalled ? "Configured" : "Installed and configured") : V} ${getPluginDisplayName(plugin)}${depNote}.${await ae(Ct)}`,
            );
            break oe;
          }
          case "skipped": {
            let ft = ne || Boolean(Ke);
            He(`\u2713 ${V} ${getPluginDisplayName(plugin)}${depNote}.${await ae(ft)}`);
            break oe;
          }
          case "read-error": {
            He(
              `${V} ${getPluginDisplayName(plugin)}${depNote}, but its saved options could not be read (${Tt}).${await ae(ne)}`,
            );
            break oe;
          }
          case "error": {
            let at = false;
            if (ne || Boolean(Ke)) at = (await onInstallComplete?.([pluginId])) === "load-failed";
            He(
              `${V} but failed to save config: ${Tt}${at ? " The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
            );
          }
        }
      })();
    };
    pe[8] = ae;
    pe[9] = alreadyInstalled;
    pe[10] = ne;
    pe[11] = depNote;
    pe[12] = onFinish;
    pe[13] = onInstallComplete;
    pe[14] = plugin;
    pe[15] = pluginId;
    pe[16] = V;
    pe[17] = onDone;
  } else onDone = pe[17];
  let Ot;
  if (pe[18] !== plugin || pe[19] !== pluginId || pe[20] !== onDone) {
    Ot = jsxProd_default(PluginOptionsFlow, {
      plugin,
      pluginId,
      onDone,
    });
    pe[18] = plugin;
    pe[19] = pluginId;
    pe[20] = onDone;
    pe[21] = Ot;
  } else Ot = pe[21];
  return Ot;
}
//@ chunk-vrb44rx7.js:47061-48783 fingerprint = PluginOptionsFlow (0.768)
function PluginOptionsFlow(props) {
  let D = w(24);
  let { plugin, pluginId, onDone } = props;
  let { storageV5, credentials } = useTheme_2();
  let U;
  if (D[0] !== credentials || D[1] !== plugin || D[2] !== pluginId || D[3] !== storageV5) {
    U = async function J() {
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
    D[0] = credentials;
    D[1] = plugin;
    D[2] = pluginId;
    D[3] = storageV5;
    D[4] = U;
  } else U = D[4];
  let J = U;
  let pe;
  if (
    D[5] !== J ||
    D[6] !== plugin.manifest.channels ||
    D[7] !== plugin.manifest.userConfig ||
    D[8] !== pluginId
  ) {
    pe = () =>
      Object.keys(plugin.manifest.userConfig ?? {}).length > 0 ||
      (plugin.manifest.channels ?? []).some(channelNeedsOptions)
        ? J().then(optionsSteps, (values_1) => {
            logOptionsReadFailure(pluginId, values_1);
            return {
              steps: [],
              error: errorMessage(values_1),
            };
          })
        : {
            steps: [],
          };
    D[5] = J;
    D[6] = plugin.manifest.channels;
    D[7] = plugin.manifest.userConfig;
    D[8] = pluginId;
    D[9] = pe;
  } else pe = D[9];
  let [me] = y(pe);
  let ne = R(false);
  let [he, W] = y(false);
  if (!(me instanceof Promise)) {
    let Oe;
    if (D[10] !== onDone || D[11] !== me) {
      Oe = jsxProd_default(PluginOptionsLoader, {
        loaded: me,
        onDone,
      });
      D[10] = onDone;
      D[11] = me;
      D[12] = Oe;
    } else Oe = D[12];
    return Oe;
  }
  if (he) {
    return null;
  }
  let onCancel;
  if (D[13] !== onDone) {
    onCancel = () => {
      if (ne.current) {
        return;
      }
      ne.current = true;
      W(true);
      onDone("skipped", undefined, false);
    };
    D[13] = onDone;
    D[14] = onCancel;
  } else onCancel = D[14];
  let children;
  if (D[15] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(WorkerBadge, {
      message: "Loading\u2026",
      dimColor: true,
    });
    D[15] = children;
  } else children = D[15];
  let fallback;
  if (D[16] !== onCancel) {
    fallback = jsxProd_default(SettingsDialogCancelBinding, {
      onCancel,
      children,
    });
    D[16] = onCancel;
    D[17] = fallback;
  } else fallback = D[17];
  let children_2;
  if (D[18] !== onDone || D[19] !== me) {
    children_2 = jsxProd_default(PluginOptionsStepsLoader, {
      steps: me,
      onDone,
    });
    D[18] = onDone;
    D[19] = me;
    D[20] = children_2;
  } else children_2 = D[20];
  let ae;
  if (D[21] !== fallback || D[22] !== children_2) {
    ae = jsxProd_default(fo, {
      fallback,
      children: children_2,
    });
    D[21] = fallback;
    D[22] = children_2;
    D[23] = ae;
  } else ae = D[23];
  return ae;
}
//@ chunk-vrb44rx7.js:48783-48932 placement
function PluginOptionsStepsLoader(props) {
  let x = w(3);
  let { steps, onDone } = props;
  let loaded = Qr(steps);
  let T;
  if (x[0] !== loaded || x[1] !== onDone) {
    T = jsxProd_default(PluginOptionsLoader, {
      loaded,
      onDone,
    });
    x[0] = loaded;
    x[1] = onDone;
    x[2] = T;
  } else T = x[2];
  return T;
}
//@ chunk-vrb44rx7.js:48932-50819 placement
/**
 * 读取已保存的插件选项并决定配置步骤（读失败、跳过、已配置）。
 */
function PluginOptionsLoader(props) {
  let K = w(34);
  let { loaded, onDone } = props;
  let { steps, error } = loaded;
  let [T, D] = y(0);
  let U = R(false);
  let L = R(false);
  let A = R(false);
  let V;
  if (K[0] !== onDone) {
    V = function J(...B) {
      let _ = B;
      if (L.current) {
        return;
      }
      L.current = true;
      onDone(..._);
    };
    K[0] = onDone;
    K[1] = V;
  } else V = K[1];
  let J = V;
  let B;
  if (K[2] !== J || K[3] !== error) {
    B = () => {
      if (error !== undefined) J("read-error", error);
      else J("skipped");
    };
    K[2] = J;
    K[3] = error;
    K[4] = B;
  } else B = K[4];
  let pe = Oo(B);
  let fe;
  if (K[5] !== error || K[6] !== pe || K[7] !== steps.length) {
    fe = () => {
      if (error !== undefined || steps.length === 0) pe();
    };
    K[5] = error;
    K[6] = pe;
    K[7] = steps.length;
    K[8] = fe;
  } else fe = K[8];
  let me;
  if (K[9] !== error || K[10] !== steps.length) {
    me = [steps.length, error];
    K[9] = error;
    K[10] = steps.length;
    K[11] = me;
  } else me = K[11];
  P(fe, me);
  let [ne, he] = y(null);
  let W;
  if (K[12] !== J || K[13] !== steps.length) {
    W = (Oe, rt) => {
      A.current = false;
      he(null);
      if (rt !== undefined) {
        J("error", errorMessage(rt), U.current);
        return;
      }
      if (Object.keys(Oe.values).length > 0) U.current = true;
      let et = Oe.index + 1;
      if (et < steps.length) D(et);
      else J("configured", undefined, U.current);
    };
    K[12] = J;
    K[13] = steps.length;
    K[14] = W;
  } else W = K[14];
  let je = Oo(W);
  let ae;
  if (K[15] !== ne || K[16] !== je) {
    ae = () => {
      if (ne === null) {
        return;
      }
      let Se = ne;
      Se.saveOutcome.then((kt) => je(Se, kt));
    };
    K[15] = ne;
    K[16] = je;
    K[17] = ae;
  } else ae = K[17];
  let Tt;
  if (K[18] !== ne) {
    Tt = [ne];
    K[18] = ne;
    K[19] = Tt;
  } else Tt = K[19];
  P(ae, Tt);
  if (steps.length === 0) {
    return null;
  }
  let Ke = steps[T];
  let Et;
  if (K[20] !== Ke || K[21] !== T || K[22] !== ne) {
    Et = function ct(He) {
      if (L.current || A.current || ne !== null) {
        return;
      }
      A.current = true;
      he({
        index: T,
        values: He,
        saveOutcome: (async () => Ke.save(He))().then(noop, toPluginOptionsSaveError),
      });
    };
    K[20] = Ke;
    K[21] = T;
    K[22] = ne;
    K[23] = Et;
  } else Et = K[23];
  let onSave = Et;
  let onCancel;
  if (K[24] !== J) {
    onCancel = () => {
      if (A.current) {
        return;
      }
      J("skipped", undefined, U.current);
    };
    K[24] = J;
    K[25] = onCancel;
  } else onCancel = K[25];
  let oe;
  if (
    K[26] !== Ke.key ||
    K[27] !== Ke.load ||
    K[28] !== Ke.schema ||
    K[29] !== Ke.subtitle ||
    K[30] !== Ke.title ||
    K[31] !== onSave ||
    K[32] !== onCancel
  ) {
    oe = jsxProd_default(
      PluginOptionsDialogLoader,
      {
        title: Ke.title,
        subtitle: Ke.subtitle,
        configSchema: Ke.schema,
        load: Ke.load,
        onSave,
        onCancel,
      },
      Ke.key,
    );
    K[26] = Ke.key;
    K[27] = Ke.load;
    K[28] = Ke.schema;
    K[29] = Ke.subtitle;
    K[30] = Ke.title;
    K[31] = onSave;
    K[32] = onCancel;
    K[33] = oe;
  } else oe = K[33];
  return oe;
}
//@ chunk-vrb44rx7.js:50819-51351 placement
/**
 * 异步执行 load 取已保存的插件选项（失败时记日志），在 Suspense 下渲染选项对话框；加载期间只挂取消键绑定。
 */
function PluginOptionsDialogLoader(props) {
  let h = w(14);
  let dialogProps;
  let load;
  if (h[0] !== props) {
    ({ load, ...dialogProps } = props);
    h[0] = props;
    h[1] = dialogProps;
    h[2] = load;
  } else {
    dialogProps = h[1];
    load = h[2];
  }
  let x;
  if (h[3] !== dialogProps.title || h[4] !== load) {
    x = () =>
      Promise.resolve()
        .then(load)
        .catch((error) => {
          logOptionsReadFailure(dialogProps.title, error);
        });
    h[3] = dialogProps.title;
    h[4] = load;
    h[5] = x;
  } else x = h[5];
  let [savedPromise] = y(x);
  let fallback;
  if (h[6] !== dialogProps.onCancel) {
    fallback = jsxProd_default(SettingsDialogCancelBinding, {
      onCancel: dialogProps.onCancel,
    });
    h[6] = dialogProps.onCancel;
    h[7] = fallback;
  } else fallback = h[7];
  let children;
  if (h[8] !== dialogProps || h[9] !== savedPromise) {
    children = jsxProd_default(PluginOptionsDialogWithSaved, {
      dialog: dialogProps,
      saved: savedPromise,
    });
    h[8] = dialogProps;
    h[9] = savedPromise;
    h[10] = children;
  } else children = h[10];
  let A;
  if (h[11] !== fallback || h[12] !== children) {
    A = jsxProd_default(fo, {
      fallback,
      children,
    });
    h[11] = fallback;
    h[12] = children;
    h[13] = A;
  } else A = h[13];
  return A;
}
//@ chunk-vrb44rx7.js:51351-51441 placement
function logOptionsReadFailure(i, h) {
  logForDebugging(`Failed to read saved plugin options (${i}): ${errorMessage(h)}`, {
    level: "error",
  });
}
//@ chunk-vrb44rx7.js:51441-51594 placement
function PluginOptionsDialogWithSaved(props) {
  let x = w(3);
  let { dialog, saved } = props;
  let initialValues = Qr(saved);
  let T;
  if (x[0] !== dialog || x[1] !== initialValues) {
    T = jsxProd_default(PluginOptionsDialog, {
      ...dialog,
      initialValues,
    });
    x[0] = dialog;
    x[1] = initialValues;
    x[2] = T;
  } else T = x[2];
  return T;
}
//@ chunk-hwmsct5x.js:222410-222714 fingerprint = findPluginOptionsTarget (0.49)
function findPluginOptionsTarget(pluginId) {
  if (typeof pluginId.value !== "string") return null;
  let n = pluginId.value === "default" ? null : stripAnsi(pluginId.value);
  let displayName = typeof pluginId.displayName === "string" ? pluginId.displayName : "";
  let description = typeof pluginId.description === "string" ? pluginId.description : "";
  return {
    value: n,
    label: sanitizeTitle(displayName) || (n !== null ? sanitizeTitle(n) : ""),
    description: markdownSafeText(description),
    ...(pluginId.disabled === true && {
      disabled: true,
    }),
  };
}
export {
  findPluginOptionsTarget,
  PluginOptionsFlow,
  PluginOptionsDialogLoader,
  findMarketplaceOfAllPlugins,
  savePluginOptions,
  formatInstallOutcome,
};
