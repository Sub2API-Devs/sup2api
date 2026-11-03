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
import { j, y, R, P, fo, Qr, Oo } from "../../../vendor/react/cjs/react.production.js";
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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { loadMcpServerUserConfig, saveMcpServerUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { SettingsDialogCancelBinding } from "../../utils/settings/mdm/constants.js";
import { PluginOptionsDialog } from "./PluginOptionsDialog.js";
import { Yn } from "../../utils/stripAnsi.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";

//@ chunk-vrb44rx7.js:43972-43976 placement
j();
//@ chunk-vrb44rx7.js:43976-43980 placement
j();
//@ chunk-vrb44rx7.js:43980-44043 placement
function Lf(Se) {
  return Object.keys(Se.userConfig ?? {}).length > 0;
}
//@ chunk-vrb44rx7.js:44043-44076 placement
function Uf(kt) {
  return { steps: kt };
}
//@ chunk-vrb44rx7.js:44076-44091 placement
function jf() {}
//@ chunk-vrb44rx7.js:44091-44200 placement
function toPluginOptionsSaveError(ft) {
  return (
    logForDebugging(`Failed to save plugin options: ${errorMessage(ft)}`, { level: "error" }),
    ft ?? Error("save failed")
  );
}
//@ chunk-vrb44rx7.js:44200-44291 placement
async function ul(i, h, k) {
  let { enabled: enabled, disabled: disabled } = await loadAllPlugins(h, k);
  return findMarketplace([...enabled, ...disabled], i);
}
//@ chunk-vrb44rx7.js:44291-44385 placement
async function Qg(i, h) {
  return (
    Object.keys(await getUnconfiguredOptions(i, h)).length > 0 ||
    (await getUnconfiguredChannels(i, h)).length > 0
  );
}
//@ chunk-vrb44rx7.js:44385-44810 placement
async function savePluginOptions(i, h, k, C) {
  let x = await ul(i, k, C);
  if (!x || !(await Qg(x, C))) return null;
  let T;
  for (let U of getEnabledSettingSources()) {
    let L = lookupByPluginAliases(getSettingsForSource(U)?.enabledPlugins, i);
    if (L !== void 0) T = L;
  }
  let D = T !== void 0 ? T === !1 : x.manifest.defaultEnabled === !1;
  return {
    type: "plugin-options",
    plugin: x,
    pluginId: i,
    depNote: h?.suffix ?? "",
    alreadyInstalled: !0,
    depsResolved: h?.changed ?? !1,
    installedDisabled: D,
    installedDisabledByDefault: T === void 0 && x.manifest.defaultEnabled === !1,
  };
}
/**
 * 生成安装/配置结果提示（已安装、需重载、加载失败、默认禁用、已激活等）。
 */
//@ chunk-vrb44rx7.js:44810-47061 placement
function formatInstallOutcome(i) {
  let pe = w(22),
    { viewState: viewState, onInstallComplete: onInstallComplete, onFinish: onFinish } = i,
    {
      plugin: plugin,
      pluginId: pluginId,
      depNote: depNote,
      alreadyInstalled: alreadyInstalled,
      depsResolved: depsResolved,
      installedDisabled: installedDisabled,
      installedDisabledByDefault: installedDisabledByDefault,
    } = viewState,
    V = alreadyInstalled ? "Already installed" : "Installed",
    [B, _] = y(!1),
    J = R(!1),
    fe,
    me;
  if (pe[0] === MEMO_CACHE_SENTINEL)
    ((fe = () => () => {
      J.current = !0;
    }),
      (me = []),
      (pe[0] = fe),
      (pe[1] = me));
  else ((fe = pe[0]), (me = pe[1]));
  P(fe, me);
  let ne = !alreadyInstalled || Boolean(depsResolved),
    he;
  if (
    pe[2] !== installedDisabled ||
    pe[3] !== installedDisabledByDefault ||
    pe[4] !== onInstallComplete ||
    pe[5] !== pluginId
  )
    ((he = async function ae(W) {
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
    }),
      (pe[2] = installedDisabled),
      (pe[3] = installedDisabledByDefault),
      (pe[4] = onInstallComplete),
      (pe[5] = pluginId),
      (pe[6] = he));
  else he = pe[6];
  let ae = he;
  if (B) {
    let Se;
    if (pe[7] === MEMO_CACHE_SENTINEL)
      ((Se = e(WorkerBadge, { message: "Activating plugin\u2026" })), (pe[7] = Se));
    else Se = pe[7];
    return Se;
  }
  let Se;
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
  )
    ((Se = (kt, Tt, Ke) => {
      (async () => {
        _(!0);
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
            let at = !1;
            if (ne || Boolean(Ke)) at = (await onInstallComplete?.([pluginId])) === "load-failed";
            He(
              `${V} but failed to save config: ${Tt}${at ? " The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
            );
          }
        }
      })();
    }),
      (pe[8] = ae),
      (pe[9] = alreadyInstalled),
      (pe[10] = ne),
      (pe[11] = depNote),
      (pe[12] = onFinish),
      (pe[13] = onInstallComplete),
      (pe[14] = plugin),
      (pe[15] = pluginId),
      (pe[16] = V),
      (pe[17] = Se));
  else Se = pe[17];
  let Ot;
  if (pe[18] !== plugin || pe[19] !== pluginId || pe[20] !== Se)
    ((Ot = e(PluginOptionsFlow, { plugin: plugin, pluginId: pluginId, onDone: Se })),
      (pe[18] = plugin),
      (pe[19] = pluginId),
      (pe[20] = Se),
      (pe[21] = Ot));
  else Ot = pe[21];
  return Ot;
}
//@ chunk-vrb44rx7.js:47061-48783 fingerprint = PluginOptionsFlow (0.768)
function PluginOptionsFlow(i) {
  let D = w(24),
    { plugin: plugin, pluginId: pluginId, onDone: onDone } = i,
    { storageV5: storageV5, credentials: credentials } = Me(),
    U;
  if (D[0] !== credentials || D[1] !== plugin || D[2] !== pluginId || D[3] !== storageV5)
    ((U = async function J() {
      let result = [];
      let A = await getUnconfiguredOptions(plugin, credentials);
      if (Object.keys(A).length > 0)
        result.push({
          key: "top-level",
          title: `Configure ${getPluginDisplayName(plugin)}`,
          subtitle: "Plugin options",
          schema: A,
          load: () => loadPluginOptions(pluginId, credentials),
          save: (values) => savePluginOptions_2(pluginId, values, plugin.manifest.userConfig, storageV5),
        });
      let V = await getUnconfiguredChannels(plugin, credentials);
      for (const channel of V)
        result.push({
          key: `channel:${channel.server}`,
          title: `Configure ${channel.displayName}`,
          subtitle: `Plugin: ${getPluginDisplayName(plugin)}`,
          schema: channel.configSchema,
          load: async () => (await loadMcpServerUserConfig(pluginId, channel.server, credentials)) ?? void 0,
          save: (values_0) =>
            saveMcpServerUserConfig(pluginId, channel.server, values_0, channel.configSchema, storageV5),
        });
      return result;
    }),
      (D[0] = credentials),
      (D[1] = plugin),
      (D[2] = pluginId),
      (D[3] = storageV5),
      (D[4] = U));
  else U = D[4];
  let J = U,
    pe;
  if (
    D[5] !== J ||
    D[6] !== plugin.manifest.channels ||
    D[7] !== plugin.manifest.userConfig ||
    D[8] !== pluginId
  )
    ((pe = () =>
      Object.keys(plugin.manifest.userConfig ?? {}).length > 0 || (plugin.manifest.channels ?? []).some(Lf)
        ? J().then(Uf, (values_1) => (Ar(pluginId, values_1), { steps: [], error: errorMessage(values_1) }))
        : { steps: [] }),
      (D[5] = J),
      (D[6] = plugin.manifest.channels),
      (D[7] = plugin.manifest.userConfig),
      (D[8] = pluginId),
      (D[9] = pe));
  else pe = D[9];
  let [me] = y(pe),
    ne = R(!1),
    [he, W] = y(!1);
  if (!(me instanceof Promise)) {
    let Oe;
    if (D[10] !== onDone || D[11] !== me)
      ((Oe = e(PluginOptionsLoader, { loaded: me, onDone: onDone })),
        (D[10] = onDone),
        (D[11] = me),
        (D[12] = Oe));
    else Oe = D[12];
    return Oe;
  }
  if (he) {
    return null;
  }
  let Oe;
  if (D[13] !== onDone)
    ((Oe = () => {
      if (ne.current) {
        return;
      }
      ((ne.current = !0), W(!0), onDone("skipped", void 0, !1));
    }),
      (D[13] = onDone),
      (D[14] = Oe));
  else Oe = D[14];
  let rt;
  if (D[15] === MEMO_CACHE_SENTINEL)
    ((rt = e(WorkerBadge, { message: "Loading\u2026", dimColor: !0 })), (D[15] = rt));
  else rt = D[15];
  let et;
  if (D[16] !== Oe)
    ((et = e(SettingsDialogCancelBinding, { onCancel: Oe, children: rt })), (D[16] = Oe), (D[17] = et));
  else et = D[17];
  let je;
  if (D[18] !== onDone || D[19] !== me)
    ((je = e(PluginOptionsStepsLoader, { steps: me, onDone: onDone })),
      (D[18] = onDone),
      (D[19] = me),
      (D[20] = je));
  else je = D[20];
  let ae;
  if (D[21] !== et || D[22] !== je)
    ((ae = e(fo, { fallback: et, children: je })), (D[21] = et), (D[22] = je), (D[23] = ae));
  else ae = D[23];
  return ae;
}
//@ chunk-vrb44rx7.js:48783-48932 placement
function PluginOptionsStepsLoader(i) {
  let x = w(3),
    { steps: steps, onDone: onDone } = i,
    C = Qr(steps),
    T;
  if (x[0] !== C || x[1] !== onDone)
    ((T = e(PluginOptionsLoader, { loaded: C, onDone: onDone })), (x[0] = C), (x[1] = onDone), (x[2] = T));
  else T = x[2];
  return T;
}
/**
 * 读取已保存的插件选项并决定配置步骤（读失败、跳过、已配置）。
 */
//@ chunk-vrb44rx7.js:48932-50819 placement
function PluginOptionsLoader(i) {
  let K = w(34),
    { loaded: loaded, onDone: onDone } = i,
    { steps: steps, error: error } = loaded,
    [T, D] = y(0),
    U = R(!1),
    L = R(!1),
    A = R(!1),
    V;
  if (K[0] !== onDone)
    ((V = function J(...B) {
      let _ = B;
      if (L.current) {
        return;
      }
      ((L.current = !0), onDone(..._));
    }),
      (K[0] = onDone),
      (K[1] = V));
  else V = K[1];
  let J = V,
    B;
  if (K[2] !== J || K[3] !== error)
    ((B = () => {
      if (error !== void 0) J("read-error", error);
      else J("skipped");
    }),
      (K[2] = J),
      (K[3] = error),
      (K[4] = B));
  else B = K[4];
  let pe = Oo(B),
    fe;
  if (K[5] !== error || K[6] !== pe || K[7] !== steps.length)
    ((fe = () => {
      if (error !== void 0 || steps.length === 0) pe();
    }),
      (K[5] = error),
      (K[6] = pe),
      (K[7] = steps.length),
      (K[8] = fe));
  else fe = K[8];
  let me;
  if (K[9] !== error || K[10] !== steps.length)
    ((me = [steps.length, error]), (K[9] = error), (K[10] = steps.length), (K[11] = me));
  else me = K[11];
  P(fe, me);
  let [ne, he] = y(null),
    W;
  if (K[12] !== J || K[13] !== steps.length)
    ((W = (Oe, rt) => {
      if (((A.current = !1), he(null), rt !== void 0)) {
        J("error", errorMessage(rt), U.current);
        return;
      }
      if (Object.keys(Oe.values).length > 0) U.current = !0;
      let et = Oe.index + 1;
      if (et < steps.length) D(et);
      else J("configured", void 0, U.current);
    }),
      (K[12] = J),
      (K[13] = steps.length),
      (K[14] = W));
  else W = K[14];
  let je = Oo(W),
    ae;
  if (K[15] !== ne || K[16] !== je)
    ((ae = () => {
      if (ne === null) {
        return;
      }
      let Se = ne;
      Se.saveOutcome.then((kt) => je(Se, kt));
    }),
      (K[15] = ne),
      (K[16] = je),
      (K[17] = ae));
  else ae = K[17];
  let Tt;
  if (K[18] !== ne) ((Tt = [ne]), (K[18] = ne), (K[19] = Tt));
  else Tt = K[19];
  if ((P(ae, Tt), steps.length === 0)) {
    return null;
  }
  let Ke = steps[T],
    Et;
  if (K[20] !== Ke || K[21] !== T || K[22] !== ne)
    ((Et = function ct(He) {
      if (L.current || A.current || ne !== null) {
        return;
      }
      ((A.current = !0),
        he({
          index: T,
          values: He,
          saveOutcome: (async () => Ke.save(He))().then(jf, toPluginOptionsSaveError),
        }));
    }),
      (K[20] = Ke),
      (K[21] = T),
      (K[22] = ne),
      (K[23] = Et));
  else Et = K[23];
  let ct = Et,
    Ct;
  if (K[24] !== J)
    ((Ct = () => {
      if (A.current) {
        return;
      }
      J("skipped", void 0, U.current);
    }),
      (K[24] = J),
      (K[25] = Ct));
  else Ct = K[25];
  let oe;
  if (
    K[26] !== Ke.key ||
    K[27] !== Ke.load ||
    K[28] !== Ke.schema ||
    K[29] !== Ke.subtitle ||
    K[30] !== Ke.title ||
    K[31] !== ct ||
    K[32] !== Ct
  )
    ((oe = e(
      PluginOptionsDialogLoader,
      {
        title: Ke.title,
        subtitle: Ke.subtitle,
        configSchema: Ke.schema,
        load: Ke.load,
        onSave: ct,
        onCancel: Ct,
      },
      Ke.key,
    )),
      (K[26] = Ke.key),
      (K[27] = Ke.load),
      (K[28] = Ke.schema),
      (K[29] = Ke.subtitle),
      (K[30] = Ke.title),
      (K[31] = ct),
      (K[32] = Ct),
      (K[33] = oe));
  else oe = K[33];
  return oe;
}
/**
 * 异步执行 load 取已保存的插件选项（失败时记日志），在 Suspense 下渲染选项对话框；加载期间只挂取消键绑定。
 */
//@ chunk-vrb44rx7.js:50819-51351 placement
function PluginOptionsDialogLoader(props) {
  let h = w(14),
    dialogProps,
    load;
  if (h[0] !== props)
    (({ load: load, ...dialogProps } = props), (h[0] = props), (h[1] = dialogProps), (h[2] = load));
  else ((dialogProps = h[1]), (load = h[2]));
  let x;
  if (h[3] !== dialogProps.title || h[4] !== load)
    ((x = () =>
      Promise.resolve()
        .then(load)
        .catch((T) => {
          Ar(dialogProps.title, T);
        })),
      (h[3] = dialogProps.title),
      (h[4] = load),
      (h[5] = x));
  else x = h[5];
  let [savedPromise] = y(x),
    U;
  if (h[6] !== dialogProps.onCancel)
    ((U = e(SettingsDialogCancelBinding, { onCancel: dialogProps.onCancel })),
      (h[6] = dialogProps.onCancel),
      (h[7] = U));
  else U = h[7];
  let L;
  if (h[8] !== dialogProps || h[9] !== savedPromise)
    ((L = e(PluginOptionsDialogWithSaved, { dialog: dialogProps, saved: savedPromise })),
      (h[8] = dialogProps),
      (h[9] = savedPromise),
      (h[10] = L));
  else L = h[10];
  let A;
  if (h[11] !== U || h[12] !== L)
    ((A = e(fo, { fallback: U, children: L })), (h[11] = U), (h[12] = L), (h[13] = A));
  else A = h[13];
  return A;
}
//@ chunk-vrb44rx7.js:51351-51441 placement
function Ar(i, h) {
  logForDebugging(`Failed to read saved plugin options (${i}): ${errorMessage(h)}`, { level: "error" });
}
//@ chunk-vrb44rx7.js:51441-51594 placement
function PluginOptionsDialogWithSaved(i) {
  let x = w(3),
    { dialog: dialog, saved: saved } = i,
    C = Qr(saved),
    T;
  if (x[0] !== dialog || x[1] !== C)
    ((T = e(PluginOptionsDialog, { ...dialog, initialValues: C })), (x[0] = dialog), (x[1] = C), (x[2] = T));
  else T = x[2];
  return T;
}
//@ chunk-hwmsct5x.js:222410-222714 fingerprint = findPluginOptionsTarget (0.49)
function findPluginOptionsTarget(pluginId) {
  if (typeof pluginId.value !== "string") return null;
  let n = pluginId.value === "default" ? null : Yn(pluginId.value),
    r = typeof pluginId.displayName === "string" ? pluginId.displayName : "",
    s = typeof pluginId.description === "string" ? pluginId.description : "";
  return {
    value: n,
    label: sanitizeTitle(r) || (n !== null ? sanitizeTitle(n) : ""),
    description: markdownSafeText(s),
    ...(pluginId.disabled === !0 && { disabled: !0 }),
  };
}

export {
  findPluginOptionsTarget,
  PluginOptionsFlow,
  PluginOptionsDialogLoader,
  ul,
  savePluginOptions,
  formatInstallOutcome,
};
