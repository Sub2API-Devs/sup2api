/**
 * commands/plugin/PluginDetails.tsx
 *
 * 2.1.316 新增：插件详情视图：安装预览、组件摘要、headersHelper 等"在本机运行命令"的警告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (20)
 * attribution: placement 20
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  suspenseTypeExport,
  use,
  useRef,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
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
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { installPluginFromMarketplace } from "../../utils/plugins/pluginInstallationHelpers.js";
import { normalizeRepoPath } from "../../utils/plugins/marketplaceSubmodules.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { formatFailureDetails } from "../../utils/plugins/marketplaceHelpers.js";
import { findMarketplaceOfAllPlugins } from "./PluginOptionsFlow.js";
import { NEEDS_CONFIG_NOTE } from "./activatePluginsAfterInstall.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:60163-60317 placement
/**
 * 在 Suspense 下渲染插件目录条目的"最后更新"信息（加载中不显示）。
 */
function PluginLastUpdated(props) {
  let $ = useMemoCache(2);
  let { pluginId } = props;
  let entryPromise = useCatalogEntryPromise(pluginId);
  let content;
  if ($[0] !== entryPromise) {
    content = jsxProd_default(suspenseTypeExport, {
      fallback: null,
      children: jsxProd_default(renderLastUpdated, {
        entryPromise,
      }),
    });
    $[0] = entryPromise;
    $[1] = content;
  } else content = $[1];
  return content;
}
//@ chunk-wb51jffc.js:60317-60633 placement
function renderLastUpdated(props) {
  let $ = useMemoCache(4);
  let { entryPromise } = props;
  let entry = use(entryPromise);
  if (!entry?.last_updated) {
    return null;
  }
  let content;
  if ($[0] !== entry.last_updated) {
    content = formatPeakDay(entry.last_updated);
    $[0] = entry.last_updated;
    $[1] = content;
  } else content = $[1];
  let rendered = content;
  if (rendered === undefined) {
    return null;
  }
  let footer;
  if ($[2] !== rendered) {
    footer = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Last updated: ", rendered],
    });
    $[2] = rendered;
    $[3] = footer;
  } else footer = $[3];
  return footer;
}
//@ chunk-wb51jffc.js:60633-60774 placement
function useCatalogEntryPromise(pluginId) {
  let $ = useMemoCache(3);
  let { storageV5 } = useTheme_2();
  let content;
  if ($[0] !== pluginId || $[1] !== storageV5) {
    content = getCatalogEntry(pluginId, storageV5).then(nullable).catch(alwaysNull);
    $[0] = pluginId;
    $[1] = storageV5;
    $[2] = content;
  } else content = $[2];
  return content;
}
//@ chunk-wb51jffc.js:60774-60924 placement (2.1.88 match: formatPeakDay, 0.756)
function formatPeakDay(dateStr) {
  let date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
//@ chunk-wb51jffc.js:60924-61759 placement
function renderInstallPreview(props) {
  let $ = useMemoCache(17);
  let { plugin, onEntryHelperShown, refreshKey } = props;
  let entryPromise = useCatalogEntryPromise(plugin.pluginId);
  const refreshKeyText = String(refreshKey ?? "");
  let content;
  if (
    $[0] !== onEntryHelperShown ||
    $[1] !== plugin.entry ||
    $[2] !== plugin.pluginId ||
    $[3] !== refreshKeyText
  ) {
    content = jsxProd_default(
      PluginHeadersHelperWarning,
      {
        pluginId: plugin.pluginId,
        entry: plugin.entry,
        verb: "Installing",
        onShown: onEntryHelperShown,
      },
      refreshKeyText,
    );
    $[0] = onEntryHelperShown;
    $[1] = plugin.entry;
    $[2] = plugin.pluginId;
    $[3] = refreshKeyText;
    $[4] = content;
  } else content = $[4];
  let statusLine;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    statusLine = jsxProd_default(Text, {
      bold: true,
      children: "Will install:",
    });
    $[5] = statusLine;
  } else statusLine = $[5];
  let fallback;
  if ($[6] !== plugin.entry) {
    fallback = jsxProd_default(renderComponentSummary, {
      entry: plugin.entry,
    });
    $[6] = plugin.entry;
    $[7] = fallback;
  } else fallback = $[7];
  let children;
  if ($[8] !== entryPromise || $[9] !== plugin.entry) {
    children = jsxProd_default(PluginComponentSummary, {
      entryPromise,
      marketplaceEntry: plugin.entry,
    });
    $[8] = entryPromise;
    $[9] = plugin.entry;
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
  let details;
  if ($[14] !== content || $[15] !== footer) {
    details = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [content, statusLine, footer],
    });
    $[14] = content;
    $[15] = footer;
    $[16] = details;
  } else details = $[16];
  return details;
}
//@ chunk-wb51jffc.js:61759-62149 placement
/**
 * 等待目录条目，有组件清单时逐项渲染，否则退回到市场条目里的组件摘要。
 */
function PluginComponentSummary(props) {
  let $ = useMemoCache(8);
  let { entryPromise, marketplaceEntry } = props;
  let entry = use(entryPromise);
  let children;
  let content;
  if ($[0] !== entry || $[1] !== marketplaceEntry) {
    content = EARLY_RETURN_SENTINEL;
    A: {
      let labels = entry?.components ? COMPONENT_LABELS(entry.components) : [];
      if (labels.length === 0) {
        let footer;
        if ($[4] !== marketplaceEntry) {
          footer = jsxProd_default(renderComponentSummary, {
            entry: marketplaceEntry,
          });
          $[4] = marketplaceEntry;
          $[5] = footer;
        } else footer = $[5];
        content = footer;
        break A;
      }
      children = labels.map(renderComponentLine);
    }
    $[0] = entry;
    $[1] = marketplaceEntry;
    $[2] = children;
    $[3] = content;
  } else {
    children = $[2];
    content = $[3];
  }
  if (content !== EARLY_RETURN_SENTINEL) return content;
  let footerRows;
  if ($[6] !== children) {
    footerRows = jsxProd_default(Fragment, {
      children,
    });
    $[6] = children;
    $[7] = footerRows;
  } else footerRows = $[7];
  return footerRows;
}
//@ chunk-wb51jffc.js:62149-63189 placement
/**
 * 警告插件会在本机运行命令并把输出作为请求头发送到指定地址。
 */
function renderHeadersHelperWarning(props) {
  let $ = useMemoCache(17);
  let { consent, verb } = props;
  let verbLabel = verb === undefined ? "Installing" : verb;
  if (consent === null) {
    return null;
  }
  let fetchInfo;
  if ($[0] !== consent) {
    fetchInfo = describeArchiveFetchCommand(consent);
    $[0] = consent;
    $[1] = fetchInfo;
  } else fetchInfo = $[1];
  let info = fetchInfo;
  let warningIcon;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    warningIcon = jsxProd_default(StatusIcon, {
      status: "warning",
      withSpace: true,
    });
    $[2] = warningIcon;
  } else warningIcon = $[2];
  let leadLine;
  if ($[3] !== verbLabel) {
    leadLine = jsxProd_default_2(Text, {
      color: "warning",
      children: [warningIcon, verbLabel, " runs a local command and sends its output as headers to:"],
    });
    $[3] = verbLabel;
    $[4] = leadLine;
  } else leadLine = $[4];
  let destinationLine;
  if ($[5] !== info.destination) {
    destinationLine = jsxProd_default_2(Text, {
      children: ["  ", info.destination],
    });
    $[5] = info.destination;
    $[6] = destinationLine;
  } else destinationLine = $[6];
  let hiddenCharsLine;
  if ($[7] !== info.hiddenCharactersWarning) {
    hiddenCharsLine =
      info.hiddenCharactersWarning &&
      jsxProd_default_2(Text, {
        color: "error",
        children: ["  ", info.hiddenCharactersWarning],
      });
    $[7] = info.hiddenCharactersWarning;
    $[8] = hiddenCharsLine;
  } else hiddenCharsLine = $[8];
  let commandLine;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    commandLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["  ", "The command:"],
    });
    $[9] = commandLine;
  } else commandLine = $[9];
  let modeLine;
  if ($[10] !== info.command) {
    modeLine = jsxProd_default_2(Text, {
      children: ["  ", info.command],
    });
    $[10] = info.command;
    $[11] = modeLine;
  } else modeLine = $[11];
  let policyNote;
  if ($[12] !== leadLine || $[13] !== destinationLine || $[14] !== hiddenCharsLine || $[15] !== modeLine) {
    policyNote = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [leadLine, destinationLine, hiddenCharsLine, commandLine, modeLine],
    });
    $[12] = leadLine;
    $[13] = destinationLine;
    $[14] = hiddenCharsLine;
    $[15] = modeLine;
    $[16] = policyNote;
  } else policyNote = $[16];
  return policyNote;
}
//@ chunk-wb51jffc.js:63189-64099 placement
function renderCommandInstallSource(props) {
  let $ = useMemoCache(14);
  let { entry } = props;
  if (typeof entry.source !== "object" || entry.source.source !== "command") {
    return null;
  }
  let leadLine;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    leadLine = jsxProd_default(Text, {
      dimColor: true,
      children: "Installed by running a command on this machine:",
    });
    $[0] = leadLine;
  } else leadLine = $[0];
  let commandLine;
  if ($[1] !== entry.source.command) {
    commandLine = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        children: entry.source.command,
      }),
    });
    $[1] = entry.source.command;
    $[2] = commandLine;
  } else commandLine = $[2];
  let children;
  if ($[3] !== entry.source) {
    children = describeCommandSourceMode(entry.source);
    $[3] = entry.source;
    $[4] = children;
  } else children = $[4];
  let modeLine;
  if ($[5] !== children) {
    modeLine = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[5] = children;
    $[6] = modeLine;
  } else modeLine = $[6];
  let policyNote;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    policyNote =
      areCommandPluginSourcesDisabledByPolicy() &&
      jsxProd_default(Text, {
        color: "warning",
        children: commandPluginSourcesDisabledMessage(),
      });
    $[7] = policyNote;
  } else policyNote = $[7];
  let footer;
  if ($[8] !== entry.source.mode) {
    footer =
      entry.source.mode === "link" &&
      getPlatform() === "windows" &&
      jsxProd_default(Text, {
        color: "warning",
        children: LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
      });
    $[8] = entry.source.mode;
    $[9] = footer;
  } else footer = $[9];
  let footer2;
  if ($[10] !== commandLine || $[11] !== modeLine || $[12] !== footer) {
    footer2 = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [leadLine, commandLine, modeLine, policyNote, footer],
    });
    $[10] = commandLine;
    $[11] = modeLine;
    $[12] = footer;
    $[13] = footer2;
  } else footer2 = $[13];
  return footer2;
}
//@ chunk-wb51jffc.js:64099-64409 placement
/**
 * 返回 {record, pinned}：record 记录最近一次展示的同意状态，pinned 读取它；依赖变化时清空。
 */
function usePinnedConsentRecord(consentKey) {
  let $ = useMemoCache(5);
  let recordRef = useRef(undefined);
  let resetRecord;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    resetRecord = () => {
      recordRef.current = undefined;
    };
    $[0] = resetRecord;
  } else resetRecord = $[0];
  let deps;
  if ($[1] !== consentKey) {
    deps = [consentKey];
    $[1] = consentKey;
    $[2] = deps;
  } else deps = $[2];
  useEffect(resetRecord, deps);
  let record;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    record = (value) => {
      recordRef.current = value;
    };
    $[3] = record;
  } else record = $[3];
  let record_2 = record;
  let result;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    let pinned = () => recordRef.current ?? null;
    result = {
      record: record_2,
      pinned,
    };
    $[4] = result;
  } else result = $[4];
  return result;
}
//@ chunk-wb51jffc.js:64409-64757 placement
/**
 * 拉取插件归档时的"会在本机运行命令"（headersHelper 等）同意信息，在 Suspense 下渲染警告并回调 onShown。
 */
function PluginHeadersHelperWarning(props) {
  let $ = useMemoCache(8);
  let { pluginId, entry, verb, onShown } = props;
  let { storageV5 } = useTheme_2();
  let content;
  if ($[0] !== entry || $[1] !== pluginId || $[2] !== storageV5) {
    content = archiveFetchWarning(pluginId, entry, storageV5).catch(alwaysNull_2);
    $[0] = entry;
    $[1] = pluginId;
    $[2] = storageV5;
    $[3] = content;
  } else content = $[3];
  let consentPromise = content;
  let footer;
  if ($[4] !== consentPromise || $[5] !== onShown || $[6] !== verb) {
    footer = jsxProd_default(suspenseTypeExport, {
      fallback: null,
      children: jsxProd_default(HeadersHelperWarningView, {
        consentPromise,
        verb,
        onShown,
      }),
    });
    $[4] = consentPromise;
    $[5] = onShown;
    $[6] = verb;
    $[7] = footer;
  } else footer = $[7];
  return footer;
}
//@ chunk-wb51jffc.js:64757-65027 placement
function HeadersHelperWarningView(props) {
  let $ = useMemoCache(7);
  let { consentPromise, verb, onShown } = props;
  let consent = use(consentPromise);
  let content;
  let footer;
  if ($[0] !== consent || $[1] !== onShown) {
    content = () => {
      onShown(consent);
    };
    footer = [onShown, consent];
    $[0] = consent;
    $[1] = onShown;
    $[2] = content;
    $[3] = footer;
  } else {
    content = $[2];
    footer = $[3];
  }
  useEffect(content, footer);
  let statusLine;
  if ($[4] !== consent || $[5] !== verb) {
    statusLine = jsxProd_default(renderHeadersHelperWarning, {
      consent,
      verb,
    });
    $[4] = consent;
    $[5] = verb;
    $[6] = statusLine;
  } else statusLine = $[6];
  return statusLine;
}
//@ chunk-wb51jffc.js:65027-65849 placement
function renderComponentSummary(props) {
  let $ = useMemoCache(11);
  let { entry } = props;
  let content;
  let footer;
  if (
    $[0] !== entry.agents ||
    $[1] !== entry.commands ||
    $[2] !== entry.hooks ||
    $[3] !== entry.lspServers ||
    $[4] !== entry.mcpServers ||
    $[5] !== entry.skills ||
    $[6] !== entry.source
  ) {
    footer = EARLY_RETURN_SENTINEL;
    A: {
      let groups = [
        ["Commands", getDeclaredNames(entry.commands)],
        ["Agents", getDeclaredNames(entry.agents)],
        ["Skills", getDeclaredNames(entry.skills)],
        ["Hooks", getDeclaredNames(entry.hooks)],
        ["MCP Servers", getDeclaredNames(entry.mcpServers)],
        ["LSP Servers", getDeclaredNames(entry.lspServers)],
      ];
      let filtered = groups.filter(isPairNonEmpty);
      if (filtered.length === 0) {
        const children =
          typeof entry.source === "object"
            ? "\xB7 Component summary not available for remote plugin"
            : "\xB7 Components will be discovered at installation";
        let details;
        if ($[9] !== children) {
          details = jsxProd_default(Text, {
            dimColor: true,
            children,
          });
          $[9] = children;
          $[10] = details;
        } else details = $[10];
        footer = details;
        break A;
      }
      content = jsxProd_default(Fragment, {
        children: filtered.map(renderComponentLineAlt),
      });
    }
    $[0] = entry.agents;
    $[1] = entry.commands;
    $[2] = entry.hooks;
    $[3] = entry.lspServers;
    $[4] = entry.mcpServers;
    $[5] = entry.skills;
    $[6] = entry.source;
    $[7] = content;
    $[8] = footer;
  } else {
    content = $[7];
    footer = $[8];
  }
  if (footer !== EARLY_RETURN_SENTINEL) return footer;
  return content;
}
//@ chunk-wb51jffc.js:65849-66062 placement
function getDeclaredNames(groups) {
  if (typeof groups === "string") return [groups];
  if (Array.isArray(groups))
    return groups.flatMap((group) =>
      typeof group === "string" ? [group] : group && typeof group === "object" ? Object.keys(group) : [],
    );
  if (groups && typeof groups === "object") return Object.keys(groups);
  return [];
}
//@ chunk-wb51jffc.js:66062-66082 placement
var errorOf = (result) => result.error;
//@ chunk-wb51jffc.js:66082-66656 placement
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
  subscribe = (listener) => this.#n.subscribe(listener);
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
    let previous = this.#o;
    this.#o = true;
    return previous;
  };
  #t(patch) {
    let current = this.#e;
    let next = {
      ...current,
      ...patch,
    };
    if (
      Object.is(next.viewState, current.viewState) &&
      next.result === current.result &&
      next.error === current.error
    )
      return;
    this.#e = next;
    this.#n.emit();
  }
}
//@ chunk-wb51jffc.js:66656-66660 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:66656", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:66660-66805 placement
var BUNDLED_MCP_NEEDS_CONFIG_HINT =
  " A bundled MCP server needs configuration before it can start \u2014 select its plugin in /plugin's Installed tab and choose Configure.";
//@ chunk-wb51jffc.js:66805-68832 placement
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
  setInstallingPlugins(new Set(filtered.map((row) => row.pluginId)));
  let installedCount = 0;
  let failedCount = 0;
  let failures = [];
  let disabledByDefault = [];
  let disabledInSettings = [];
  let installedIds = [];
  for (let row of filtered) {
    if (typeof row.entry.source === "object" && row.entry.source.source === "command") {
      failedCount++;
      failures.push({
        name: row.entry.name,
        reason:
          "installed by running a command on this machine \u2014 open its details (Enter) to review the command and install it from there",
        reasonIsOurs: true,
      });
      continue;
    }
    let installOutcome = await installPluginFromMarketplace({
      pluginId: row.pluginId,
      entry: row.entry,
      marketplaceName: row.marketplaceName,
      scope: "user",
      trigger: "bulk",
      surface,
      storageV5,
    });
    if (installOutcome.success) {
      installedCount++;
      installedIds.push(row.pluginId);
      if (installOutcome.installedDisabled)
        (installOutcome.installedDisabledByDefault ? disabledByDefault : disabledInSettings).push(
          normalizeRepoPath(row.entry.name),
        );
    } else {
      failedCount++;
      failures.push({
        name: row.entry.name,
        reason: installOutcome.error,
        reasonIsOurs: installOutcome.errorIsOurs === true,
      });
    }
  }
  refreshPluginCaches(storageV5);
  let reloadState =
    installedCount > 0 && onInstallComplete ? await onInstallComplete(installedIds) : "reload-required";
  setInstallingPlugins(new Set());
  setSelectedForInstall(new Set());
  let notes =
    (disabledByDefault.length > 0
      ? ` Disabled by default \u2014 enable in /plugin: ${disabledByDefault.join(", ")}.`
      : "") +
    (disabledInSettings.length > 0 ? ` Disabled in your settings: ${disabledInSettings.join(", ")}.` : "");
  let activeCount = installedCount - disabledByDefault.length - disabledInSettings.length;
  if (failedCount === 0) {
    let reloadSuffix =
      reloadState === "load-failed"
        ? " Some plugins couldn't be loaded \u2014 see /plugin for details."
        : activeCount === 0
          ? ""
          : reloadState === "activated" || reloadState === "needs-config"
            ? ` ${activeCount === 1 ? "Plugin is" : "Plugins are"} now active.` +
              (reloadState === "needs-config" ? BUNDLED_MCP_NEEDS_CONFIG_HINT : "")
            : " Run /reload-plugins to activate.";
    setResult(
      `\u2713 Installed ${installedCount} ${plural(installedCount, "plugin")}.${reloadSuffix}${notes}`,
    );
  } else if (installedCount === 0) setError(`Failed to install: ${formatFailureDetails(failures, true)}`);
  else {
    let partialSuffix =
      reloadState === "load-failed"
        ? " Some installed plugins couldn't be loaded \u2014 see /plugin for details."
        : activeCount === 0
          ? ""
          : reloadState === "activated" || reloadState === "needs-config"
            ? (activeCount === 1
                ? " The successfully installed plugin is now active."
                : " Successfully installed plugins are now active.") +
              (reloadState === "needs-config" ? BUNDLED_MCP_NEEDS_CONFIG_HINT : "")
            : " Run /reload-plugins to activate successfully installed plugins.";
    setResult(
      `\u2713 Installed ${installedCount} of ${installedCount + failedCount} plugins. Failed: ${formatFailureDetails(failures, false)}.${partialSuffix}${notes}`,
    );
  }
  setParentViewState({
    type: "menu",
  });
}
//@ chunk-wb51jffc.js:68832-70056 placement
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
  let installed = await installPluginFromMarketplace({
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
  if (installed.success) {
    let marketplaceOfAllPlugins = await findMarketplaceOfAllPlugins(plugin.pluginId, storageV5);
    if (marketplaceOfAllPlugins) {
      setIsInstalling(false);
      setViewState({
        type: "plugin-options",
        plugin: marketplaceOfAllPlugins,
        pluginId: plugin.pluginId,
        depNote: installed.depNote,
        installedDisabled: installed.installedDisabled,
        installedDisabledByDefault: installed.installedDisabledByDefault,
      });
      return;
    }
    let installOutcome = onInstallComplete ? await onInstallComplete([plugin.pluginId]) : "reload-required";
    setResult(
      installed.installedDisabled
        ? installOutcome === "load-failed"
          ? `${installed.message}. The plugin couldn't be loaded \u2014 see /plugin for details.`
          : installed.message
        : installOutcome === "activated"
          ? `${installed.message} Plugin is now active.`
          : installOutcome === "needs-config"
            ? `${installed.message} Plugin is now active.${NEEDS_CONFIG_NOTE}`
            : installOutcome === "load-failed"
              ? `${installed.message} The plugin couldn't be loaded \u2014 see /plugin for details.`
              : `${installed.message} Run /reload-plugins to activate.`,
    );
    setParentViewState({
      type: "menu",
    });
  } else {
    setIsInstalling(false);
    setInstallError(installed.error);
  }
}
//@ chunk-wb51jffc.js:70056-70060 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:70056", () => {
  init_react_production();
});
export {
  PluginDetailsStore,
  PluginLastUpdated,
  renderInstallPreview,
  renderCommandInstallSource,
  errorOf,
  describeMarketplaceEntryRisks,
  usePinnedConsentRecord,
  describeInstallScopeRisks,
  PluginHeadersHelperWarning,
};
