/**
 * commands/plugin/PluginDetails.tsx
 *
 * 2.1.316 新增：插件详情视图：安装预览、组件摘要、headersHelper 等"在本机运行命令"的警告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (20)
 * attribution: placement 20
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { fo, Qr, R, P, j } from "../../../vendor/react/cjs/react.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { getCatalogEntry } from "../../utils/plugins/installCounts.js";
import {
  Rh,
  Th,
  COMPONENT_LABELS,
  renderComponentLine,
  Dh,
  Mh,
  renderComponentLineAlt,
} from "./pluginDetailsHelpers.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import {
  describeCommandSourceMode,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  o1,
} from "../../utils/plugins/commandSource.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  commandPluginSourcesDisabledMessage,
} from "../../utils/plugins/marketplacePolicy.js";
import { getPlatform } from "../../utils/platform.js";
import { archiveFetchWarning } from "../../services/plugins/pluginOperations.js";
import { createSignal } from "../../utils/signal.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { installPluginFromMarketplace } from "../../utils/plugins/pluginInstallationHelpers.js";
import { normalizeRepoPath } from "../../utils/plugins/marketplaceSubmodules.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { formatFailureDetails } from "../../utils/plugins/marketplaceHelpers.js";
import { ul } from "./PluginOptionsFlow.js";
import { NEEDS_CONFIG_NOTE } from "./activatePluginsAfterInstall.js";

/**
 * 在 Suspense 下渲染插件目录条目的"最后更新"信息（加载中不显示）。
 */
//@ chunk-vrb44rx7.js:60011-60165 placement
function PluginLastUpdated(i) {
  let C = w(2),
    { pluginId: pluginId } = i,
    k = useCatalogEntryPromise(pluginId),
    x;
  if (C[0] !== k)
    ((x = e(fo, { fallback: null, children: e(renderLastUpdated, { entryPromise: k }) })),
      (C[0] = k),
      (C[1] = x));
  else x = C[1];
  return x;
}
//@ chunk-vrb44rx7.js:60165-60481 placement
function renderLastUpdated(i) {
  let C = w(4),
    { entryPromise: entryPromise } = i,
    k = Qr(entryPromise);
  if (!k?.last_updated) {
    return null;
  }
  let x;
  if (C[0] !== k.last_updated) ((x = formatPeakDay(k.last_updated)), (C[0] = k.last_updated), (C[1] = x));
  else x = C[1];
  let T = x;
  if (T === void 0) {
    return null;
  }
  let D;
  if (C[2] !== T) ((D = r(Text, { dimColor: !0, children: ["Last updated: ", T] })), (C[2] = T), (C[3] = D));
  else D = C[3];
  return D;
}
//@ chunk-vrb44rx7.js:60481-60622 placement
function useCatalogEntryPromise(i) {
  let k = w(3),
    { storageV5: storageV5 } = Me(),
    C;
  if (k[0] !== i || k[1] !== storageV5)
    ((C = getCatalogEntry(i, storageV5).then(Rh).catch(Th)), (k[0] = i), (k[1] = storageV5), (k[2] = C));
  else C = k[2];
  return C;
}
//@ chunk-vrb44rx7.js:60622-60772 placement = formatPeakDay (0.754)
function formatPeakDay(dateStr) {
  let date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return;
  return date.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
}
//@ chunk-vrb44rx7.js:60772-61607 placement
function renderInstallPreview(i) {
  let D = w(17),
    { plugin: plugin, onEntryHelperShown: onEntryHelperShown, refreshKey: refreshKey } = i,
    x = useCatalogEntryPromise(plugin.pluginId);
  const T = String(refreshKey ?? "");
  let U;
  if (D[0] !== onEntryHelperShown || D[1] !== plugin.entry || D[2] !== plugin.pluginId || D[3] !== T)
    ((U = e(
      PluginHeadersHelperWarning,
      { pluginId: plugin.pluginId, entry: plugin.entry, verb: "Installing", onShown: onEntryHelperShown },
      T,
    )),
      (D[0] = onEntryHelperShown),
      (D[1] = plugin.entry),
      (D[2] = plugin.pluginId),
      (D[3] = T),
      (D[4] = U));
  else U = D[4];
  let L;
  if (D[5] === MEMO_CACHE_SENTINEL) ((L = e(Text, { bold: !0, children: "Will install:" })), (D[5] = L));
  else L = D[5];
  let A;
  if (D[6] !== plugin.entry)
    ((A = e(renderComponentSummary, { entry: plugin.entry })), (D[6] = plugin.entry), (D[7] = A));
  else A = D[7];
  let K;
  if (D[8] !== x || D[9] !== plugin.entry)
    ((K = e(PluginComponentSummary, { entryPromise: x, marketplaceEntry: plugin.entry })),
      (D[8] = x),
      (D[9] = plugin.entry),
      (D[10] = K));
  else K = D[10];
  let V;
  if (D[11] !== A || D[12] !== K)
    ((V = e(fo, { fallback: A, children: K })), (D[11] = A), (D[12] = K), (D[13] = V));
  else V = D[13];
  let B;
  if (D[14] !== U || D[15] !== V)
    ((B = r(Box, { flexDirection: "column", marginBottom: 1, children: [U, L, V] })),
      (D[14] = U),
      (D[15] = V),
      (D[16] = B));
  else B = D[16];
  return B;
}
/**
 * 等待目录条目，有组件清单时逐项渲染，否则退回到市场条目里的组件摘要。
 */
//@ chunk-vrb44rx7.js:61607-61996 placement
function PluginComponentSummary(i) {
  let x = w(8),
    { entryPromise: entryPromise, marketplaceEntry: marketplaceEntry } = i,
    C = Qr(entryPromise),
    T,
    D;
  if (x[0] !== C || x[1] !== marketplaceEntry) {
    D = EARLY_RETURN_SENTINEL;
    A: {
      let U = C?.components ? COMPONENT_LABELS(C.components) : [];
      if (U.length === 0) {
        let L;
        if (x[4] !== marketplaceEntry)
          ((L = e(renderComponentSummary, { entry: marketplaceEntry })),
            (x[4] = marketplaceEntry),
            (x[5] = L));
        else L = x[5];
        D = L;
        break A;
      }
      T = U.map(renderComponentLine);
    }
    ((x[0] = C), (x[1] = marketplaceEntry), (x[2] = T), (x[3] = D));
  } else ((T = x[2]), (D = x[3]));
  if (D !== EARLY_RETURN_SENTINEL) return D;
  let L;
  if (x[6] !== T) ((L = e(Fragment, { children: T })), (x[6] = T), (x[7] = L));
  else L = x[7];
  return L;
}
/**
 * 警告插件会在本机运行命令并把输出作为请求头发送到指定地址。
 */
//@ chunk-vrb44rx7.js:61996-63036 placement
function renderHeadersHelperWarning(i) {
  let x = w(17),
    { consent: consent, verb: verb } = i,
    C = verb === void 0 ? "Installing" : verb;
  if (consent === null) {
    return null;
  }
  let T;
  if (x[0] !== consent) ((T = describeArchiveFetchCommand(consent)), (x[0] = consent), (x[1] = T));
  else T = x[1];
  let D = T,
    U;
  if (x[2] === MEMO_CACHE_SENTINEL) ((U = e(StatusIcon, { status: "warning", withSpace: !0 })), (x[2] = U));
  else U = x[2];
  let L;
  if (x[3] !== C)
    ((L = r(Text, {
      color: "warning",
      children: [U, C, " runs a local command and sends its output as headers to:"],
    })),
      (x[3] = C),
      (x[4] = L));
  else L = x[4];
  let A;
  if (x[5] !== D.destination)
    ((A = r(Text, { children: ["  ", D.destination] })), (x[5] = D.destination), (x[6] = A));
  else A = x[6];
  let K;
  if (x[7] !== D.hiddenCharactersWarning)
    ((K =
      D.hiddenCharactersWarning && r(Text, { color: "error", children: ["  ", D.hiddenCharactersWarning] })),
      (x[7] = D.hiddenCharactersWarning),
      (x[8] = K));
  else K = x[8];
  let V;
  if (x[9] === MEMO_CACHE_SENTINEL)
    ((V = r(Text, { dimColor: !0, children: ["  ", "The command:"] })), (x[9] = V));
  else V = x[9];
  let B;
  if (x[10] !== D.command) ((B = r(Text, { children: ["  ", D.command] })), (x[10] = D.command), (x[11] = B));
  else B = x[11];
  let _;
  if (x[12] !== L || x[13] !== A || x[14] !== K || x[15] !== B)
    ((_ = r(Box, { flexDirection: "column", marginBottom: 1, children: [L, A, K, V, B] })),
      (x[12] = L),
      (x[13] = A),
      (x[14] = K),
      (x[15] = B),
      (x[16] = _));
  else _ = x[16];
  return _;
}
//@ chunk-vrb44rx7.js:63036-63946 placement
function renderCommandInstallSource(i) {
  let k = w(14),
    { entry: entry } = i;
  if (typeof entry.source !== "object" || entry.source.source !== "command") {
    return null;
  }
  let C;
  if (k[0] === MEMO_CACHE_SENTINEL)
    ((C = e(Text, { dimColor: !0, children: "Installed by running a command on this machine:" })),
      (k[0] = C));
  else C = k[0];
  let x;
  if (k[1] !== entry.source.command)
    ((x = e(Box, { paddingLeft: 2, children: e(Text, { children: entry.source.command }) })),
      (k[1] = entry.source.command),
      (k[2] = x));
  else x = k[2];
  let T;
  if (k[3] !== entry.source)
    ((T = describeCommandSourceMode(entry.source)), (k[3] = entry.source), (k[4] = T));
  else T = k[4];
  let D;
  if (k[5] !== T) ((D = e(Text, { dimColor: !0, children: T })), (k[5] = T), (k[6] = D));
  else D = k[6];
  let U;
  if (k[7] === MEMO_CACHE_SENTINEL)
    ((U =
      areCommandPluginSourcesDisabledByPolicy() &&
      e(Text, { color: "warning", children: commandPluginSourcesDisabledMessage() })),
      (k[7] = U));
  else U = k[7];
  let L;
  if (k[8] !== entry.source.mode)
    ((L =
      entry.source.mode === "link" &&
      getPlatform() === "windows" &&
      e(Text, { color: "warning", children: LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE })),
      (k[8] = entry.source.mode),
      (k[9] = L));
  else L = k[9];
  let A;
  if (k[10] !== x || k[11] !== D || k[12] !== L)
    ((A = r(Box, { marginBottom: 1, flexDirection: "column", children: [C, x, D, U, L] })),
      (k[10] = x),
      (k[11] = D),
      (k[12] = L),
      (k[13] = A));
  else A = k[13];
  return A;
}
/**
 * 返回 {record, pinned}：record 记录最近一次展示的同意状态，pinned 读取它；依赖变化时清空。
 */
//@ chunk-vrb44rx7.js:63946-64256 placement
function usePinnedConsentRecord(i) {
  let k = w(5),
    h = R(void 0),
    C;
  if (k[0] === MEMO_CACHE_SENTINEL)
    ((C = () => {
      h.current = void 0;
    }),
      (k[0] = C));
  else C = k[0];
  let x;
  if (k[1] !== i) ((x = [i]), (k[1] = i), (k[2] = x));
  else x = k[2];
  P(C, x);
  let T;
  if (k[3] === MEMO_CACHE_SENTINEL)
    ((T = (D) => {
      h.current = D;
    }),
      (k[3] = T));
  else T = k[3];
  let U = T,
    L;
  if (k[4] === MEMO_CACHE_SENTINEL) {
    let A = () => h.current ?? null;
    L = { record: U, pinned: A };
    k[4] = L;
  } else L = k[4];
  return L;
}
/**
 * 拉取插件归档时的"会在本机运行命令"（headersHelper 等）同意信息，在 Suspense 下渲染警告并回调 onShown。
 */
//@ chunk-vrb44rx7.js:64256-64604 placement
function PluginHeadersHelperWarning(i) {
  let D = w(8),
    { pluginId: pluginId, entry: entry, verb: verb, onShown: onShown } = i,
    { storageV5: storageV5 } = Me(),
    U;
  if (D[0] !== entry || D[1] !== pluginId || D[2] !== storageV5)
    ((U = archiveFetchWarning(pluginId, entry, storageV5).catch(Dh)),
      (D[0] = entry),
      (D[1] = pluginId),
      (D[2] = storageV5),
      (D[3] = U));
  else U = D[3];
  let L = U,
    A;
  if (D[4] !== L || D[5] !== onShown || D[6] !== verb)
    ((A = e(fo, {
      fallback: null,
      children: e(HeadersHelperWarningView, { consentPromise: L, verb: verb, onShown: onShown }),
    })),
      (D[4] = L),
      (D[5] = onShown),
      (D[6] = verb),
      (D[7] = A));
  else A = D[7];
  return A;
}
//@ chunk-vrb44rx7.js:64604-64874 placement
function HeadersHelperWarningView(i) {
  let T = w(7),
    { consentPromise: consentPromise, verb: verb, onShown: onShown } = i,
    x = Qr(consentPromise),
    D,
    U;
  if (T[0] !== x || T[1] !== onShown)
    ((D = () => {
      onShown(x);
    }),
      (U = [onShown, x]),
      (T[0] = x),
      (T[1] = onShown),
      (T[2] = D),
      (T[3] = U));
  else ((D = T[2]), (U = T[3]));
  P(D, U);
  let L;
  if (T[4] !== x || T[5] !== verb)
    ((L = e(renderHeadersHelperWarning, { consent: x, verb: verb })), (T[4] = x), (T[5] = verb), (T[6] = L));
  else L = T[6];
  return L;
}
//@ chunk-vrb44rx7.js:64874-65695 placement
function renderComponentSummary(i) {
  let k = w(11),
    { entry: entry } = i,
    C,
    x;
  if (
    k[0] !== entry.agents ||
    k[1] !== entry.commands ||
    k[2] !== entry.hooks ||
    k[3] !== entry.lspServers ||
    k[4] !== entry.mcpServers ||
    k[5] !== entry.skills ||
    k[6] !== entry.source
  ) {
    x = EARLY_RETURN_SENTINEL;
    A: {
      let T = [
        ["Commands", getDeclaredNames(entry.commands)],
        ["Agents", getDeclaredNames(entry.agents)],
        ["Skills", getDeclaredNames(entry.skills)],
        ["Hooks", getDeclaredNames(entry.hooks)],
        ["MCP Servers", getDeclaredNames(entry.mcpServers)],
        ["LSP Servers", getDeclaredNames(entry.lspServers)],
      ];
      let filtered = T.filter(Mh);
      if (filtered.length === 0) {
        const U =
          typeof entry.source === "object"
            ? "\xB7 Component summary not available for remote plugin"
            : "\xB7 Components will be discovered at installation";
        let L;
        if (k[9] !== U) ((L = e(Text, { dimColor: !0, children: U })), (k[9] = U), (k[10] = L));
        else L = k[10];
        x = L;
        break A;
      }
      C = e(Fragment, { children: filtered.map(renderComponentLineAlt) });
    }
    ((k[0] = entry.agents),
      (k[1] = entry.commands),
      (k[2] = entry.hooks),
      (k[3] = entry.lspServers),
      (k[4] = entry.mcpServers),
      (k[5] = entry.skills),
      (k[6] = entry.source),
      (k[7] = C),
      (k[8] = x));
  } else ((C = k[7]), (x = k[8]));
  if (x !== EARLY_RETURN_SENTINEL) return x;
  return C;
}
//@ chunk-vrb44rx7.js:65695-65908 placement
function getDeclaredNames(i) {
  if (typeof i === "string") return [i];
  if (Array.isArray(i))
    return i.flatMap((h) => (typeof h === "string" ? [h] : h && typeof h === "object" ? Object.keys(h) : []));
  if (i && typeof i === "object") return Object.keys(i);
  return [];
}
//@ chunk-vrb44rx7.js:65908-65928 placement
var ii = (i) => i.error;
//@ chunk-vrb44rx7.js:65928-66502 placement
class PluginDetailsStore {
  #n = createSignal();
  #e;
  #o = !1;
  constructor(i) {
    this.#e = { viewState: i, result: null, error: null };
  }
  subscribe = (i) => this.#n.subscribe(i);
  getSnapshot = () => this.#e;
  get viewState() {
    return this.#e.viewState;
  }
  get result() {
    return this.#e.result;
  }
  get error() {
    return this.#e.error;
  }
  setViewState = (i) => {
    this.#t({ viewState: i });
  };
  setResult = (i) => {
    this.#t({ result: i });
  };
  setError = (i) => {
    this.#t({ error: i });
  };
  markDiscoverLoaded = () => {
    let i = this.#o;
    return ((this.#o = !0), i);
  };
  #t(i) {
    let h = this.#e,
      k = { ...h, ...i };
    if (Object.is(k.viewState, h.viewState) && k.result === h.result && k.error === h.error) return;
    ((this.#e = k), this.#n.emit());
  }
}
//@ chunk-vrb44rx7.js:66502-66506 placement
j();
//@ chunk-vrb44rx7.js:66506-66651 placement
var BUNDLED_MCP_NEEDS_CONFIG_HINT =
  " A bundled MCP server needs configuration before it can start \u2014 select its plugin in /plugin's Installed tab and choose Configure.";
/**
 * 描述市场条目的风险（通过本机命令安装、headersHelper 等）。
 */
//@ chunk-vrb44rx7.js:66651-68678 placement
async function describeMarketplaceEntryRisks({
  selectedForInstall: selectedForInstall,
  availablePlugins: availablePlugins,
  setInstallingPlugins: setInstallingPlugins,
  setSelectedForInstall: setSelectedForInstall,
  setResult: setResult,
  setError: setError,
  setParentViewState: setParentViewState,
  onInstallComplete: onInstallComplete,
  surface: surface,
  storageV5: storageV5,
}) {
  if (selectedForInstall.size === 0) return;
  let filtered = availablePlugins.filter((W) => selectedForInstall.has(W.pluginId));
  setInstallingPlugins(new Set(filtered.map((W) => W.pluginId)));
  let V = 0,
    B = 0,
    _ = [],
    J = [],
    pe = [],
    fe = [];
  for (let W of filtered) {
    if (typeof W.entry.source === "object" && W.entry.source.source === "command") {
      (B++,
        _.push({
          name: W.entry.name,
          reason:
            "installed by running a command on this machine \u2014 open its details (Enter) to review the command and install it from there",
          reasonIsOurs: !0,
        }));
      continue;
    }
    let Oe = await installPluginFromMarketplace({
      pluginId: W.pluginId,
      entry: W.entry,
      marketplaceName: W.marketplaceName,
      scope: "user",
      trigger: "bulk",
      surface: surface,
      storageV5: storageV5,
    });
    if (Oe.success) {
      if ((V++, fe.push(W.pluginId), Oe.installedDisabled))
        (Oe.installedDisabledByDefault ? J : pe).push(normalizeRepoPath(W.entry.name));
    } else (B++, _.push({ name: W.entry.name, reason: Oe.error, reasonIsOurs: Oe.errorIsOurs === !0 }));
  }
  ic(storageV5);
  let me = V > 0 && onInstallComplete ? await onInstallComplete(fe) : "reload-required";
  (setInstallingPlugins(new Set()), setSelectedForInstall(new Set()));
  let ne =
      (J.length > 0 ? ` Disabled by default \u2014 enable in /plugin: ${J.join(", ")}.` : "") +
      (pe.length > 0 ? ` Disabled in your settings: ${pe.join(", ")}.` : ""),
    he = V - J.length - pe.length;
  if (B === 0) {
    let W =
      me === "load-failed"
        ? " Some plugins couldn't be loaded \u2014 see /plugin for details."
        : he === 0
          ? ""
          : me === "activated" || me === "needs-config"
            ? ` ${he === 1 ? "Plugin is" : "Plugins are"} now active.` +
              (me === "needs-config" ? BUNDLED_MCP_NEEDS_CONFIG_HINT : "")
            : " Run /reload-plugins to activate.";
    setResult(`\u2713 Installed ${V} ${plural(V, "plugin")}.${W}${ne}`);
  } else if (V === 0) setError(`Failed to install: ${formatFailureDetails(_, !0)}`);
  else {
    let W =
      me === "load-failed"
        ? " Some installed plugins couldn't be loaded \u2014 see /plugin for details."
        : he === 0
          ? ""
          : me === "activated" || me === "needs-config"
            ? (he === 1
                ? " The successfully installed plugin is now active."
                : " Successfully installed plugins are now active.") +
              (me === "needs-config" ? BUNDLED_MCP_NEEDS_CONFIG_HINT : "")
            : " Run /reload-plugins to activate successfully installed plugins.";
    setResult(`\u2713 Installed ${V} of ${V + B} plugins. Failed: ${formatFailureDetails(_, !1)}.${W}${ne}`);
  }
  setParentViewState({ type: "menu" });
}
//@ chunk-vrb44rx7.js:68678-69902 placement
async function describeInstallScopeRisks({
  plugin: plugin,
  scope: scope = "user",
  setIsInstalling: setIsInstalling,
  setInstallError: setInstallError,
  setViewState: setViewState,
  setResult: setResult,
  setParentViewState: setParentViewState,
  onInstallComplete: onInstallComplete,
  consentedEntryHelper: consentedEntryHelper,
  surface: surface,
  storageV5: storageV5,
}) {
  (setIsInstalling(!0), setInstallError(null));
  let V = await installPluginFromMarketplace({
    pluginId: plugin.pluginId,
    entry: plugin.entry,
    marketplaceName: plugin.marketplaceName,
    scope: scope,
    trigger: "user",
    surface: surface,
    consentedEntryHelper: consentedEntryHelper,
    commandSourceConsent:
      typeof plugin.entry.source === "object" && plugin.entry.source.source === "command"
        ? { kind: "shown", command: o1(plugin.entry.source), pluginId: plugin.pluginId }
        : void 0,
    storageV5: storageV5,
  });
  if (V.success) {
    let B = await ul(plugin.pluginId, storageV5);
    if (B) {
      (setIsInstalling(!1),
        setViewState({
          type: "plugin-options",
          plugin: B,
          pluginId: plugin.pluginId,
          depNote: V.depNote,
          installedDisabled: V.installedDisabled,
          installedDisabledByDefault: V.installedDisabledByDefault,
        }));
      return;
    }
    let _ = onInstallComplete ? await onInstallComplete([plugin.pluginId]) : "reload-required";
    (setResult(
      V.installedDisabled
        ? _ === "load-failed"
          ? `${V.message}. The plugin couldn't be loaded \u2014 see /plugin for details.`
          : V.message
        : _ === "activated"
          ? `${V.message} Plugin is now active.`
          : _ === "needs-config"
            ? `${V.message} Plugin is now active.${NEEDS_CONFIG_NOTE}`
            : _ === "load-failed"
              ? `${V.message} The plugin couldn't be loaded \u2014 see /plugin for details.`
              : `${V.message} Run /reload-plugins to activate.`,
    ),
      setParentViewState({ type: "menu" }));
  } else (setIsInstalling(!1), setInstallError(V.error));
}
//@ chunk-vrb44rx7.js:69902-69906 placement
j();

export {
  usePinnedConsentRecord,
  PluginHeadersHelperWarning,
  PluginDetailsStore,
  PluginLastUpdated,
  renderInstallPreview,
  renderCommandInstallSource,
  ii,
  describeMarketplaceEntryRisks,
  describeInstallScopeRisks,
};
