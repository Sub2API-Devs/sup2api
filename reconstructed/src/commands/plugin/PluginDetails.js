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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { fo, Qr, R, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { getCatalogEntry } from "../../utils/plugins/installCounts.js";
import {
  nullable,
  alwaysNull,
  COMPONENT_LABELS,
  renderComponentLine,
  alwaysNull_2,
  isPairNonEmpty,
  renderComponentLineAlt,
} from "./pluginDetailsHelpers.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import {
  describeCommandSourceMode,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  describeCommandOutputMode,
} from "../../utils/plugins/commandSource.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  commandPluginSourcesDisabledMessage,
} from "../../utils/plugins/marketplacePolicy.js";
import { getPlatform } from "../../utils/platform.js";
import { archiveFetchWarning } from "../../services/plugins/pluginOperations.js";
import { createSignal } from "../../utils/signal.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { installPluginFromMarketplace } from "../../utils/plugins/pluginInstallationHelpers.js";
import { normalizeRepoPath } from "../../utils/plugins/marketplaceSubmodules.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { formatFailureDetails } from "../../utils/plugins/marketplaceHelpers.js";
import { findMarketplaceOfAllPlugins } from "./PluginOptionsFlow.js";
import { NEEDS_CONFIG_NOTE } from "./activatePluginsAfterInstall.js";

//@ chunk-vrb44rx7.js:60011-60165 placement
/**
 * 在 Suspense 下渲染插件目录条目的"最后更新"信息（加载中不显示）。
 */
function PluginLastUpdated(props) {
  let C = w(2);
  let { pluginId } = props;
  let entryPromise = useCatalogEntryPromise(pluginId);
  let x;
  if (C[0] !== entryPromise) {
    x = jsxProd_default(fo, {
      fallback: null,
      children: jsxProd_default(renderLastUpdated, {
        entryPromise,
      }),
    });
    C[0] = entryPromise;
    C[1] = x;
  } else x = C[1];
  return x;
}
//@ chunk-vrb44rx7.js:60165-60481 placement
function renderLastUpdated(props) {
  let C = w(4);
  let { entryPromise } = props;
  let k = Qr(entryPromise);
  if (!k?.last_updated) {
    return null;
  }
  let x;
  if (C[0] !== k.last_updated) {
    x = formatPeakDay(k.last_updated);
    C[0] = k.last_updated;
    C[1] = x;
  } else x = C[1];
  let T = x;
  if (T === undefined) {
    return null;
  }
  let D;
  if (C[2] !== T) {
    D = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Last updated: ", T],
    });
    C[2] = T;
    C[3] = D;
  } else D = C[3];
  return D;
}
//@ chunk-vrb44rx7.js:60481-60622 placement
function useCatalogEntryPromise(pluginId) {
  let k = w(3);
  let { storageV5 } = useTheme_2();
  let C;
  if (k[0] !== pluginId || k[1] !== storageV5) {
    C = getCatalogEntry(pluginId, storageV5).then(nullable).catch(alwaysNull);
    k[0] = pluginId;
    k[1] = storageV5;
    k[2] = C;
  } else C = k[2];
  return C;
}
//@ chunk-vrb44rx7.js:60622-60772 placement = formatPeakDay (0.754)
function formatPeakDay(dateStr) {
  let date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
//@ chunk-vrb44rx7.js:60772-61607 placement
function renderInstallPreview(props) {
  let D = w(17);
  let { plugin, onEntryHelperShown, refreshKey } = props;
  let entryPromise = useCatalogEntryPromise(plugin.pluginId);
  const T = String(refreshKey ?? "");
  let U;
  if (D[0] !== onEntryHelperShown || D[1] !== plugin.entry || D[2] !== plugin.pluginId || D[3] !== T) {
    U = jsxProd_default(
      PluginHeadersHelperWarning,
      {
        pluginId: plugin.pluginId,
        entry: plugin.entry,
        verb: "Installing",
        onShown: onEntryHelperShown,
      },
      T,
    );
    D[0] = onEntryHelperShown;
    D[1] = plugin.entry;
    D[2] = plugin.pluginId;
    D[3] = T;
    D[4] = U;
  } else U = D[4];
  let L;
  if (D[5] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default(Text, {
      bold: true,
      children: "Will install:",
    });
    D[5] = L;
  } else L = D[5];
  let fallback;
  if (D[6] !== plugin.entry) {
    fallback = jsxProd_default(renderComponentSummary, {
      entry: plugin.entry,
    });
    D[6] = plugin.entry;
    D[7] = fallback;
  } else fallback = D[7];
  let children;
  if (D[8] !== entryPromise || D[9] !== plugin.entry) {
    children = jsxProd_default(PluginComponentSummary, {
      entryPromise,
      marketplaceEntry: plugin.entry,
    });
    D[8] = entryPromise;
    D[9] = plugin.entry;
    D[10] = children;
  } else children = D[10];
  let V;
  if (D[11] !== fallback || D[12] !== children) {
    V = jsxProd_default(fo, {
      fallback,
      children,
    });
    D[11] = fallback;
    D[12] = children;
    D[13] = V;
  } else V = D[13];
  let B;
  if (D[14] !== U || D[15] !== V) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [U, L, V],
    });
    D[14] = U;
    D[15] = V;
    D[16] = B;
  } else B = D[16];
  return B;
}
//@ chunk-vrb44rx7.js:61607-61996 placement
/**
 * 等待目录条目，有组件清单时逐项渲染，否则退回到市场条目里的组件摘要。
 */
function PluginComponentSummary(props) {
  let x = w(8);
  let { entryPromise, marketplaceEntry } = props;
  let C = Qr(entryPromise);
  let children;
  let D;
  if (x[0] !== C || x[1] !== marketplaceEntry) {
    D = EARLY_RETURN_SENTINEL;
    A: {
      let U = C?.components ? COMPONENT_LABELS(C.components) : [];
      if (U.length === 0) {
        let L;
        if (x[4] !== marketplaceEntry) {
          L = jsxProd_default(renderComponentSummary, {
            entry: marketplaceEntry,
          });
          x[4] = marketplaceEntry;
          x[5] = L;
        } else L = x[5];
        D = L;
        break A;
      }
      children = U.map(renderComponentLine);
    }
    x[0] = C;
    x[1] = marketplaceEntry;
    x[2] = children;
    x[3] = D;
  } else {
    children = x[2];
    D = x[3];
  }
  if (D !== EARLY_RETURN_SENTINEL) return D;
  let L;
  if (x[6] !== children) {
    L = jsxProd_default(Fragment, {
      children,
    });
    x[6] = children;
    x[7] = L;
  } else L = x[7];
  return L;
}
//@ chunk-vrb44rx7.js:61996-63036 placement
/**
 * 警告插件会在本机运行命令并把输出作为请求头发送到指定地址。
 */
function renderHeadersHelperWarning(props) {
  let x = w(17);
  let { consent, verb } = props;
  let C = verb === undefined ? "Installing" : verb;
  if (consent === null) {
    return null;
  }
  let T;
  if (x[0] !== consent) {
    T = describeArchiveFetchCommand(consent);
    x[0] = consent;
    x[1] = T;
  } else T = x[1];
  let D = T;
  let U;
  if (x[2] === MEMO_CACHE_SENTINEL) {
    U = jsxProd_default(StatusIcon, {
      status: "warning",
      withSpace: true,
    });
    x[2] = U;
  } else U = x[2];
  let L;
  if (x[3] !== C) {
    L = jsxProd_default_2(Text, {
      color: "warning",
      children: [U, C, " runs a local command and sends its output as headers to:"],
    });
    x[3] = C;
    x[4] = L;
  } else L = x[4];
  let A;
  if (x[5] !== D.destination) {
    A = jsxProd_default_2(Text, {
      children: ["  ", D.destination],
    });
    x[5] = D.destination;
    x[6] = A;
  } else A = x[6];
  let K;
  if (x[7] !== D.hiddenCharactersWarning) {
    K =
      D.hiddenCharactersWarning &&
      jsxProd_default_2(Text, {
        color: "error",
        children: ["  ", D.hiddenCharactersWarning],
      });
    x[7] = D.hiddenCharactersWarning;
    x[8] = K;
  } else K = x[8];
  let V;
  if (x[9] === MEMO_CACHE_SENTINEL) {
    V = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["  ", "The command:"],
    });
    x[9] = V;
  } else V = x[9];
  let B;
  if (x[10] !== D.command) {
    B = jsxProd_default_2(Text, {
      children: ["  ", D.command],
    });
    x[10] = D.command;
    x[11] = B;
  } else B = x[11];
  let _;
  if (x[12] !== L || x[13] !== A || x[14] !== K || x[15] !== B) {
    _ = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [L, A, K, V, B],
    });
    x[12] = L;
    x[13] = A;
    x[14] = K;
    x[15] = B;
    x[16] = _;
  } else _ = x[16];
  return _;
}
//@ chunk-vrb44rx7.js:63036-63946 placement
function renderCommandInstallSource(props) {
  let k = w(14);
  let { entry } = props;
  if (typeof entry.source !== "object" || entry.source.source !== "command") {
    return null;
  }
  let C;
  if (k[0] === MEMO_CACHE_SENTINEL) {
    C = jsxProd_default(Text, {
      dimColor: true,
      children: "Installed by running a command on this machine:",
    });
    k[0] = C;
  } else C = k[0];
  let x;
  if (k[1] !== entry.source.command) {
    x = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        children: entry.source.command,
      }),
    });
    k[1] = entry.source.command;
    k[2] = x;
  } else x = k[2];
  let children;
  if (k[3] !== entry.source) {
    children = describeCommandSourceMode(entry.source);
    k[3] = entry.source;
    k[4] = children;
  } else children = k[4];
  let D;
  if (k[5] !== children) {
    D = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    k[5] = children;
    k[6] = D;
  } else D = k[6];
  let U;
  if (k[7] === MEMO_CACHE_SENTINEL) {
    U =
      areCommandPluginSourcesDisabledByPolicy() &&
      jsxProd_default(Text, {
        color: "warning",
        children: commandPluginSourcesDisabledMessage(),
      });
    k[7] = U;
  } else U = k[7];
  let L;
  if (k[8] !== entry.source.mode) {
    L =
      entry.source.mode === "link" &&
      getPlatform() === "windows" &&
      jsxProd_default(Text, {
        color: "warning",
        children: LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
      });
    k[8] = entry.source.mode;
    k[9] = L;
  } else L = k[9];
  let A;
  if (k[10] !== x || k[11] !== D || k[12] !== L) {
    A = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [C, x, D, U, L],
    });
    k[10] = x;
    k[11] = D;
    k[12] = L;
    k[13] = A;
  } else A = k[13];
  return A;
}
//@ chunk-vrb44rx7.js:63946-64256 placement
/**
 * 返回 {record, pinned}：record 记录最近一次展示的同意状态，pinned 读取它；依赖变化时清空。
 */
function usePinnedConsentRecord(i) {
  let k = w(5);
  let h = R(undefined);
  let C;
  if (k[0] === MEMO_CACHE_SENTINEL) {
    C = () => {
      h.current = undefined;
    };
    k[0] = C;
  } else C = k[0];
  let x;
  if (k[1] !== i) {
    x = [i];
    k[1] = i;
    k[2] = x;
  } else x = k[2];
  P(C, x);
  let T;
  if (k[3] === MEMO_CACHE_SENTINEL) {
    T = (D) => {
      h.current = D;
    };
    k[3] = T;
  } else T = k[3];
  let record = T;
  let L;
  if (k[4] === MEMO_CACHE_SENTINEL) {
    let pinned = () => h.current ?? null;
    L = {
      record,
      pinned,
    };
    k[4] = L;
  } else L = k[4];
  return L;
}
//@ chunk-vrb44rx7.js:64256-64604 placement
/**
 * 拉取插件归档时的"会在本机运行命令"（headersHelper 等）同意信息，在 Suspense 下渲染警告并回调 onShown。
 */
function PluginHeadersHelperWarning(props) {
  let D = w(8);
  let { pluginId, entry, verb, onShown } = props;
  let { storageV5 } = useTheme_2();
  let U;
  if (D[0] !== entry || D[1] !== pluginId || D[2] !== storageV5) {
    U = archiveFetchWarning(pluginId, entry, storageV5).catch(alwaysNull_2);
    D[0] = entry;
    D[1] = pluginId;
    D[2] = storageV5;
    D[3] = U;
  } else U = D[3];
  let consentPromise = U;
  let A;
  if (D[4] !== consentPromise || D[5] !== onShown || D[6] !== verb) {
    A = jsxProd_default(fo, {
      fallback: null,
      children: jsxProd_default(HeadersHelperWarningView, {
        consentPromise,
        verb,
        onShown,
      }),
    });
    D[4] = consentPromise;
    D[5] = onShown;
    D[6] = verb;
    D[7] = A;
  } else A = D[7];
  return A;
}
//@ chunk-vrb44rx7.js:64604-64874 placement
function HeadersHelperWarningView(props) {
  let T = w(7);
  let { consentPromise, verb, onShown } = props;
  let x = Qr(consentPromise);
  let D;
  let U;
  if (T[0] !== x || T[1] !== onShown) {
    D = () => {
      onShown(x);
    };
    U = [onShown, x];
    T[0] = x;
    T[1] = onShown;
    T[2] = D;
    T[3] = U;
  } else {
    D = T[2];
    U = T[3];
  }
  P(D, U);
  let L;
  if (T[4] !== x || T[5] !== verb) {
    L = jsxProd_default(renderHeadersHelperWarning, {
      consent: x,
      verb,
    });
    T[4] = x;
    T[5] = verb;
    T[6] = L;
  } else L = T[6];
  return L;
}
//@ chunk-vrb44rx7.js:64874-65695 placement
function renderComponentSummary(props) {
  let k = w(11);
  let { entry } = props;
  let C;
  let x;
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
      let filtered = T.filter(isPairNonEmpty);
      if (filtered.length === 0) {
        const children =
          typeof entry.source === "object"
            ? "\xB7 Component summary not available for remote plugin"
            : "\xB7 Components will be discovered at installation";
        let L;
        if (k[9] !== children) {
          L = jsxProd_default(Text, {
            dimColor: true,
            children,
          });
          k[9] = children;
          k[10] = L;
        } else L = k[10];
        x = L;
        break A;
      }
      C = jsxProd_default(Fragment, {
        children: filtered.map(renderComponentLineAlt),
      });
    }
    k[0] = entry.agents;
    k[1] = entry.commands;
    k[2] = entry.hooks;
    k[3] = entry.lspServers;
    k[4] = entry.mcpServers;
    k[5] = entry.skills;
    k[6] = entry.source;
    k[7] = C;
    k[8] = x;
  } else {
    C = k[7];
    x = k[8];
  }
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
var errorOf = (i) => i.error;
//@ chunk-vrb44rx7.js:65928-66502 placement
class PluginDetailsStore {
  #n = createSignal();
  #e;
  #o = false;
  constructor(viewState) {
    this.#e = {
      viewState,
      result: null,
      error: null,
    };
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
  setViewState = (viewState) => {
    this.#t({
      viewState,
    });
  };
  setResult = (result) => {
    this.#t({
      result,
    });
  };
  setError = (error) => {
    this.#t({
      error,
    });
  };
  markDiscoverLoaded = () => {
    let i = this.#o;
    this.#o = true;
    return i;
  };
  #t(i) {
    let h = this.#e;
    let k = {
      ...h,
      ...i,
    };
    if (Object.is(k.viewState, h.viewState) && k.result === h.result && k.error === h.error) return;
    this.#e = k;
    this.#n.emit();
  }
}
//@ chunk-vrb44rx7.js:66502-66506 placement
init_react_production();
//@ chunk-vrb44rx7.js:66506-66651 placement
var BUNDLED_MCP_NEEDS_CONFIG_HINT =
  " A bundled MCP server needs configuration before it can start \u2014 select its plugin in /plugin's Installed tab and choose Configure.";
//@ chunk-vrb44rx7.js:66651-68678 placement
/**
 * 描述市场条目的风险（通过本机命令安装、headersHelper 等）。
 */
async function describeMarketplaceEntryRisks({
  selectedForInstall,
  availablePlugins,
  setInstallingPlugins,
  setSelectedForInstall,
  setResult,
  setError,
  setParentViewState,
  onInstallComplete,
  surface,
  storageV5,
}) {
  if (selectedForInstall.size === 0) return;
  let filtered = availablePlugins.filter((availablePlugin) =>
    selectedForInstall.has(availablePlugin.pluginId),
  );
  setInstallingPlugins(new Set(filtered.map((W) => W.pluginId)));
  let V = 0;
  let B = 0;
  let failures = [];
  let J = [];
  let pe = [];
  let fe = [];
  for (let W of filtered) {
    if (typeof W.entry.source === "object" && W.entry.source.source === "command") {
      B++;
      failures.push({
        name: W.entry.name,
        reason:
          "installed by running a command on this machine \u2014 open its details (Enter) to review the command and install it from there",
        reasonIsOurs: true,
      });
      continue;
    }
    let Oe = await installPluginFromMarketplace({
      pluginId: W.pluginId,
      entry: W.entry,
      marketplaceName: W.marketplaceName,
      scope: "user",
      trigger: "bulk",
      surface,
      storageV5,
    });
    if (Oe.success) {
      V++;
      fe.push(W.pluginId);
      if (Oe.installedDisabled)
        (Oe.installedDisabledByDefault ? J : pe).push(normalizeRepoPath(W.entry.name));
    } else {
      B++;
      failures.push({
        name: W.entry.name,
        reason: Oe.error,
        reasonIsOurs: Oe.errorIsOurs === true,
      });
    }
  }
  refreshPluginCaches(storageV5);
  let me = V > 0 && onInstallComplete ? await onInstallComplete(fe) : "reload-required";
  setInstallingPlugins(new Set());
  setSelectedForInstall(new Set());
  let ne =
    (J.length > 0 ? ` Disabled by default \u2014 enable in /plugin: ${J.join(", ")}.` : "") +
    (pe.length > 0 ? ` Disabled in your settings: ${pe.join(", ")}.` : "");
  let he = V - J.length - pe.length;
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
  } else if (V === 0) setError(`Failed to install: ${formatFailureDetails(failures, true)}`);
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
    setResult(
      `\u2713 Installed ${V} of ${V + B} plugins. Failed: ${formatFailureDetails(failures, false)}.${W}${ne}`,
    );
  }
  setParentViewState({
    type: "menu",
  });
}
//@ chunk-vrb44rx7.js:68678-69902 placement
async function describeInstallScopeRisks({
  plugin,
  scope = "user",
  setIsInstalling,
  setInstallError,
  setViewState,
  setResult,
  setParentViewState,
  onInstallComplete,
  consentedEntryHelper,
  surface,
  storageV5,
}) {
  setIsInstalling(true);
  setInstallError(null);
  let V = await installPluginFromMarketplace({
    pluginId: plugin.pluginId,
    entry: plugin.entry,
    marketplaceName: plugin.marketplaceName,
    scope,
    trigger: "user",
    surface,
    consentedEntryHelper,
    commandSourceConsent:
      typeof plugin.entry.source === "object" && plugin.entry.source.source === "command"
        ? {
            kind: "shown",
            command: describeCommandOutputMode(plugin.entry.source),
            pluginId: plugin.pluginId,
          }
        : undefined,
    storageV5,
  });
  if (V.success) {
    let marketplaceOfAllPlugins = await findMarketplaceOfAllPlugins(plugin.pluginId, storageV5);
    if (marketplaceOfAllPlugins) {
      setIsInstalling(false);
      setViewState({
        type: "plugin-options",
        plugin: marketplaceOfAllPlugins,
        pluginId: plugin.pluginId,
        depNote: V.depNote,
        installedDisabled: V.installedDisabled,
        installedDisabledByDefault: V.installedDisabledByDefault,
      });
      return;
    }
    let _ = onInstallComplete ? await onInstallComplete([plugin.pluginId]) : "reload-required";
    setResult(
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
    );
    setParentViewState({
      type: "menu",
    });
  } else {
    setIsInstalling(false);
    setInstallError(V.error);
  }
}
//@ chunk-vrb44rx7.js:69902-69906 placement
init_react_production();
export {
  usePinnedConsentRecord,
  PluginHeadersHelperWarning,
  PluginDetailsStore,
  PluginLastUpdated,
  renderInstallPreview,
  renderCommandInstallSource,
  errorOf,
  describeMarketplaceEntryRisks,
  describeInstallScopeRisks,
};
