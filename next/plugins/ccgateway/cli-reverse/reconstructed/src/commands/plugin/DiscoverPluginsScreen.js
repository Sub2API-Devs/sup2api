/**
 * commands/plugin/DiscoverPluginsScreen.tsx
 *
 * 2.1.316 新增：/plugin 的"发现"页：插件列表、上下文成本估计、按目录推荐、策略屏蔽与目录加载失败处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  useState,
  useEffect,
  init_react_production,
  useMemo,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import {
  estimatePluginTokenCost,
  ESTIMATED_TOKENS_PER_COMPONENT,
  getUniqueInstallCounts,
  formatInstallCount,
} from "../../utils/plugins/installCounts.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { noopBrowseMarketplaceHandler } from "./BrowseMarketplace.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  formatTokenEstimate,
  formatRelativeTimeAgo,
  truncateToWidth,
  truncatePathMiddle,
} from "../../utils/format.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { errorOf } from "./PluginDetails.js";
import { ALL_TAB_LABEL } from "../../components/TagTabs.js";
import { DiscoverPlugins, DiscoverPluginsKeyHint } from "./DiscoverPlugins.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import {
  loadKnownMarketplacesWithDeclared,
  getPluginDirectoryState,
  getMarketplace,
} from "../../utils/plugins/marketplaceManager.js";
import {
  loadMarketplacesWithErrors,
  formatPluginId,
  detectEmptyMarketplaceReason,
  filterSuccessfulMarketplaces,
  onlyPluginDirectoryFailed,
  formatMarketplaceLoadingErrors,
} from "../../utils/plugins/marketplaceHelpers.js";
import { commandSourceSession } from "../../utils/plugins/commandSourceErrors.js";
import {
  pluginInstallPath,
  allowlistedInstalledPlugins,
  dedupeListedPlugins,
  groupBySource,
  markFromPluginDirectory,
  sortPluginsByPopularity,
  displayTextOrRaw,
  getPluginInstallCount,
  pluginSourceLink,
  marketplaceLabel as marketplaceLabel_2,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { isPluginInstalled, isPluginGloballyInstalled } from "../../utils/plugins/installedPluginsManager.js";
import {
  isPluginBlockedByPolicy,
  getPluginSuggestionMarketplaces,
  pluginDirectoryPolicyBlockHint,
} from "../../utils/plugins/marketplacePolicy.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  isListedInKnownMarketplace,
  pickShownMarketplaces,
  MAX_SHOWN_MARKETPLACES,
} from "../../services/plugins/pluginTag.js";
import { hasRelevanceSignals, matchRelevanceSignal } from "../../utils/plugins/pluginRelevance.js";
import {
  pluginSuggestionDiscoverShownCount,
  recordPluginSuggestionShown,
} from "../../services/tips/tipIds.js";
import { countWhere } from "../../utils/collections.js";
import { logDiscoverShown } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { refreshMarketplaceOnCatalogMiss } from "../../services/plugins/pluginOperations.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { installMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { savePluginOptions, formatInstallOutcome } from "./PluginOptionsFlow.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { ErrorText } from "../../components/ErrorText.js";
import { PluginSelectionKeyHint } from "./pluginDetailsHelpers.js";
import { StatusRow } from "../../components/Settings/Status.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { SearchBox } from "../../components/SearchBox.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { HintText } from "../../components/design-system/HintText.js";
import { MoreItemsIndicator, TwoColumnRow } from "../../components/CustomSelect/select.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isNonInstallableClaudeAiPlugin } from "../../utils/plugins/claudeAiMarketplaces.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getDisplayPath } from "../../utils/file.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:83416-84592 placement
/**
 * 显示插件的上下文成本估计（每轮、调用时的 token）。
 */
function renderContextCost(props) {
  let $ = useMemoCache(22);
  let { pluginId } = props;
  let { storageV5 } = useTheme_2();
  let [details, setDetails] = useState(null);
  let content;
  let footer;
  if ($[0] !== pluginId || $[1] !== storageV5) {
    content = () => {
      setDetails(null);
      let loading = false;
      estimatePluginTokenCost(pluginId, getCanonicalName(getMainLoopModel()), storageV5)
        .then((loaded) => {
          if (!loading) setDetails(loaded);
        })
        .catch(noopBrowseMarketplaceHandler);
      return () => {
        loading = true;
      };
    };
    footer = [pluginId, storageV5];
    $[0] = pluginId;
    $[1] = storageV5;
    $[2] = content;
    $[3] = footer;
  } else {
    content = $[2];
    footer = $[3];
  }
  useEffect(content, footer);
  if (details === null) {
    return null;
  }
  let isHeavy = details.alwaysOn >= ESTIMATED_TOKENS_PER_COMPONENT;
  let detailsBox;
  if ($[4] !== details.isEstimate) {
    detailsBox =
      details.isEstimate &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (estimated)",
      });
    $[4] = details.isEstimate;
    $[5] = detailsBox;
  } else detailsBox = $[5];
  let contentBox;
  if ($[6] !== detailsBox) {
    contentBox = jsxProd_default_2(Text, {
      bold: true,
      children: ["Context cost", detailsBox, ":"],
    });
    $[6] = detailsBox;
    $[7] = contentBox;
  } else contentBox = $[7];
  const color = isHeavy ? "warning" : undefined;
  const dimColor = !isHeavy;
  let statusLine;
  if ($[8] !== details.alwaysOn) {
    statusLine = formatTokenEstimate(details.alwaysOn);
    $[8] = details.alwaysOn;
    $[9] = statusLine;
  } else statusLine = $[9];
  let hintLine;
  if ($[10] !== color || $[11] !== dimColor || $[12] !== statusLine) {
    hintLine = jsxProd_default_2(Text, {
      color,
      dimColor,
      children: ["\xB7 Every turn: ", statusLine, " tokens"],
    });
    $[10] = color;
    $[11] = dimColor;
    $[12] = statusLine;
    $[13] = hintLine;
  } else hintLine = $[13];
  let footerBox;
  if ($[14] !== details.onInvoke) {
    footerBox = formatTokenEstimate(details.onInvoke);
    $[14] = details.onInvoke;
    $[15] = footerBox;
  } else footerBox = $[15];
  let panelFooter;
  if ($[16] !== footerBox) {
    panelFooter = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["\xB7 When invoked: ", footerBox, " tokens"],
    });
    $[16] = footerBox;
    $[17] = panelFooter;
  } else panelFooter = $[17];
  let detailRows;
  if ($[18] !== panelFooter || $[19] !== contentBox || $[20] !== hintLine) {
    detailRows = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [contentBox, hintLine, panelFooter],
    });
    $[18] = panelFooter;
    $[19] = contentBox;
    $[20] = hintLine;
    $[21] = detailRows;
  } else detailRows = $[21];
  return detailRows;
}
//@ chunk-wb51jffc.js:84592-84596 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:84592", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:84596-84617 placement
var selectResult = (entry) => entry.result;
//@ chunk-wb51jffc.js:84617-94377 placement
/**
 * 发现页主组件：加载市场与安装量、计算推荐、搜索与安装（约 10 KB）。
 */
function DiscoverPluginsScreen({
  screen,
  onInstallComplete,
  onSearchModeChange,
  getSessionContext,
  grantedSuggestions,
  targetPlugin,
  initialMarketplace,
  initialSearchQuery,
}) {
  let { storageV5, credentials } = useTheme_2();
  let storeSelector = useStoreSelector(screen, errorOf);
  let storeSelector_2 = useStoreSelector(screen, selectResult);
  let { setError, setResult, markDiscoverLoaded } = screen;
  let setViewState = screen.setViewState;
  let [allItems, setAllItems] = useState([]);
  let [loading, setLoading] = useState(true);
  let [statusText, setStatusText] = useState("Loading\u2026");
  let [error, setLoadError] = useState(null);
  let [suggestionLog, setSuggestionLog] = useState(new Map());
  let [activeMarketplace, setActiveMarketplace] = useState(initialMarketplace ?? null);
  let marketplaceTabs = useMemo(() => ALL_TAB_LABEL(allItems), [allItems]);
  let {
    viewState,
    setViewState: setViewState_2,
    selectedPlugin,
    openDetails,
    closeDetails,
    recordEntryHelperShown,
    isSearchMode,
    setIsSearchMode,
    searchQuery,
    setSearchQuery,
    searchBoxProps,
    keyHintProps,
    filteredPlugins,
    selectedIndex,
    selectedForInstall,
    installingPlugins,
    pagination,
    installPlugin,
    isInstalling,
    installError,
    handleListKeyDown,
    handleListPaste,
  } = DiscoverPlugins({
    screen,
    surface: "discover",
    initialViewState: "plugin-list",
    availablePlugins: allItems,
    loading,
    searchMarketplaceName: true,
    marketplaceFilter: activeMarketplace,
    onInstallComplete,
    onSearchModeChange,
  });
  let showSourceLink = useRef(false);
  useEffect(() => {
    if (loading || showSourceLink.current || !initialSearchQuery || allItems.length === 0) return;
    showSourceLink.current = true;
    setSearchQuery(initialSearchQuery);
    setIsSearchMode(true);
  }, [loading, initialSearchQuery, allItems.length, setSearchQuery, setIsSearchMode]);
  useEffect(() => {
    if (
      !loading &&
      activeMarketplace !== null &&
      !marketplaceTabs.some((tab) => tab.marketplace === activeMarketplace)
    )
      setActiveMarketplace(null);
  }, [loading, activeMarketplace, marketplaceTabs]);
  let [showSources, setShowSources] = useState(false);
  let showTabBar = showSources && marketplaceTabs.length > 2;
  MessageActionsKeybindings(
    {
      "plugin:cycleMarketplace": () => {
        setActiveMarketplace((marketplace) => {
          let index = marketplaceTabs.findIndex((tab) => tab.marketplace === marketplace);
          return marketplaceTabs[(index + 1) % marketplaceTabs.length]?.marketplace ?? null;
        });
      },
    },
    {
      context: "Plugin",
      isActive: viewState === "plugin-list" && !loading && showTabBar,
    },
  );
  let [pendingInstall, setPendingInstall] = useState(null);
  let [installFailure, setInstallError] = useState(null);
  let [installing, setInstalling] = useState(false);
  let [installResult, setInstallResult] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    async function loadPlugins() {
      let now = Date.now();
      try {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let { marketplaces, failures } = await loadMarketplacesWithErrors(
          knownMarketplacesWithDeclared,
          storageV5,
          "discover",
        );
        let pluginDirectoryState = await getPluginDirectoryState();
        let directoryBlocked = pluginDirectoryState === "blocked";
        if (cancelled) return;
        setInstalling(directoryBlocked);
        setShowSources(pluginDirectoryState !== "unavailable");
        setInstallResult(
          pluginDirectoryState === "on" ? commandSourceSession().staleCatalogFetchedAt : undefined,
        );
        let rows = [];
        let results = await Promise.all(
          marketplaces.map(async ({ name, data }) => ({
            name,
            entries: data
              ? await pluginInstallPath(name, data.plugins, knownMarketplacesWithDeclared, storageV5)
              : [],
          })),
        );
        if (cancelled) return;
        for (let { name, entries } of results)
          for (let entry of entries) {
            let pluginId = formatPluginId(entry.name, name);
            rows.push({
              entry,
              marketplaceName: name,
              pluginId,
              isInstalled: isPluginInstalled(pluginId),
            });
          }
        let allRows = rows;
        if (pluginDirectoryState !== "unavailable") {
          let allowlisted = await allowlistedInstalledPlugins(knownMarketplacesWithDeclared, storageV5);
          if (cancelled) return;
          allRows = dedupeListedPlugins(
            groupBySource(
              markFromPluginDirectory(rows, knownMarketplacesWithDeclared),
              knownMarketplacesWithDeclared,
              allowlisted,
            ),
            knownMarketplacesWithDeclared,
          );
        }
        let filtered = allRows.filter((row) => !row.isInstalled);
        let filtered_2 = filtered.filter(
          (row) =>
            !isPluginBlockedByPolicy(row.pluginId) &&
            !(row.installCountIds ?? []).some(isPluginBlockedByPolicy),
        );
        let found = marketplaces.find(
          (marketplace) =>
            marketplace.name === OFFICIAL_MARKETPLACE_NAME &&
            marketplace.config.source !== undefined &&
            isPluginDirectorySource(marketplace.config.source),
        );
        let installedCount =
          filtered.length -
          filtered_2.length +
          (found?.data
            ? Math.max(0, (commandSourceSession().catalogEntryNames?.size ?? 0) - found.data.plugins.length)
            : 0);
        try {
          let uniqueInstallCounts = await getUniqueInstallCounts(storageV5);
          if (cancelled) return;
          setLoadError(uniqueInstallCounts);
          sortPluginsByPopularity(filtered_2, uniqueInstallCounts);
        } catch (error) {
          logForDebugging(`Failed to fetch install counts: ${errorMessage(error)}`);
          sortPluginsByPopularity(filtered_2, null);
        }
        let relevanceByPlugin = new Map();
        try {
          let sessionContext = getSessionContext?.();
          let suggestionMarketplaces = new Set(getPluginSuggestionMarketplaces());
          for (let row of filtered_2) {
            if (!isListedInKnownMarketplace(row, suggestionMarketplaces, knownMarketplacesWithDeclared))
              continue;
            let signalResult = hasRelevanceSignals(row.entry.name, row.entry.relevance);
            if (!signalResult) continue;
            if (
              [row.pluginId, ...(row.installCountIds ?? [])].some(
                (pluginId) => pluginSuggestionDiscoverShownCount(pluginId) > 0,
              ) &&
              !grantedSuggestions?.has(row.pluginId)
            )
              continue;
            let matched = await matchRelevanceSignal(signalResult, sessionContext);
            if (matched) relevanceByPlugin.set(row.pluginId, matched);
          }
        } catch (error) {
          logForDebugging(`Failed to compute plugin suggestions: ${errorMessage(error)}`);
        }
        if (cancelled) return;
        setSuggestionLog(relevanceByPlugin);
        let sortedRows =
          relevanceByPlugin.size > 0
            ? [
                ...filtered_2.filter((row) => relevanceByPlugin.has(row.pluginId)),
                ...filtered_2.filter((row) => !relevanceByPlugin.has(row.pluginId)),
              ]
            : filtered_2;
        setAllItems(sortedRows);
        let configuredMarketplaceCount = countWhere(
          Object.values(knownMarketplacesWithDeclared),
          (row) => !(directoryBlocked && row.source !== undefined && isPluginDirectorySource(row.source)),
        );
        if (filtered_2.length === 0) {
          let emptyMarketplaceReason = await detectEmptyMarketplaceReason({
            configuredMarketplaceCount,
            failedMarketplaceCount: filterSuccessfulMarketplaces(failures).length,
          });
          if (cancelled) return;
          if (
            emptyMarketplaceReason === "all-plugins-installed" &&
            rows.length > 0 &&
            rows.every((row) => row.isInstalled && !isPluginGloballyInstalled(row.pluginId)) &&
            !rows.some((row) => isPluginBlockedByPolicy(row.pluginId))
          )
            emptyMarketplaceReason = "all-plugins-project-installed";
          setInstallError(
            pluginDirectoryState !== "unavailable" &&
              emptyMarketplaceReason === "all-plugins-installed" &&
              installedCount > 0
              ? "all-hidden-by-policy"
              : emptyMarketplaceReason === "all-marketplaces-failed" && onlyPluginDirectoryFailed(failures)
                ? "directory-failed"
                : emptyMarketplaceReason,
          );
        }
        let successCount = countWhere(marketplaces, (marketplace) => marketplace.data !== null);
        let loadError = formatMarketplaceLoadingErrors(failures, successCount);
        if (loadError)
          if (loadError.type === "warning")
            setPendingInstall(
              filterSuccessfulMarketplaces(failures).length === 0
                ? loadError.message
                : loadError.message + (filtered_2.length > 0 ? ". Showing available plugins." : "."),
            );
          else throw Error(loadError.message);
        if (targetPlugin === undefined) {
          let stamp = markDiscoverLoaded();
          logDiscoverShown({
            directoryRows: countWhere(filtered_2, (row) => row.fromPluginDirectory === true),
            totalRows: filtered_2.length,
            foldedRows: countWhere(filtered_2, (row) => row.installCountIds !== undefined),
            loadMs: Date.now() - now,
            entry: stamp ? "tab_return" : initialMarketplace === undefined ? "menu" : "directory_command",
            directoryState:
              pluginDirectoryState === "on" && !found?.data ? "unavailable" : pluginDirectoryState,
            knownMarketplaceCount: countWhere(
              Object.values(knownMarketplacesWithDeclared),
              (entry) => entry.source === undefined || !isPluginDirectorySource(entry.source),
            ),
          });
        }
        if (targetPlugin) {
          let targetRow =
            allRows.find((row) => row.entry.name === targetPlugin) ??
            rows.find((row) => row.entry.name === targetPlugin);
          let failed = false;
          let skipped = false;
          let depsFailed = false;
          let optionsFailed = false;
          if (!targetRow) {
            for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
              setStatusText(`Checking ${displayTextOrRaw(key)} for new plugins\u2026`);
              let refreshed = await refreshMarketplaceOnCatalogMiss(key, value, storageV5);
              if (cancelled) return;
              if (refreshed === "refresh-failed") skipped = true;
              else if (refreshed === "refreshed") optionsFailed = true;
              if (refreshed !== "refreshed") continue;
              try {
                let found = (await getMarketplace(key, storageV5)).plugins.find(
                  (plugin) => plugin.name === targetPlugin,
                );
                if (found) {
                  let targetId = formatPluginId(found.name, key);
                  let [installedEntry] = await pluginInstallPath(
                    key,
                    [found],
                    knownMarketplacesWithDeclared,
                    storageV5,
                  );
                  targetRow = {
                    entry: installedEntry ?? found,
                    marketplaceName: key,
                    pluginId: targetId,
                    isInstalled: isPluginInstalled(targetId),
                  };
                  failed = true;
                  logFeatureOk("plugin_install_catalog_refresh");
                  break;
                }
              } catch (error) {
                depsFailed = true;
                logForDebugging(
                  `Post-refresh reload of marketplace '${key}' failed: ${errorMessage(error)}`,
                  {
                    level: "warn",
                  },
                );
              }
              if (cancelled) return;
            }
            if (!failed)
              if (skipped) logFeatureBad("plugin_install_catalog_refresh", "refresh_failed");
              else if (depsFailed) logFeatureBad("plugin_install_catalog_refresh", "reload_failed");
              else if (optionsFailed)
                logFeatureSad("plugin_install_catalog_refresh", "not_found_after_refresh");
              else logFeatureSad("plugin_install_catalog_refresh", "ineligible");
          }
          if (cancelled) return;
          if (targetRow && pluginDirectoryState !== "unavailable")
            targetRow = markFromPluginDirectory([targetRow], knownMarketplacesWithDeclared)[0] ?? targetRow;
          if (failed && targetRow && !targetRow.isInstalled && !isPluginBlockedByPolicy(targetRow.pluginId)) {
            let target = targetRow;
            setAllItems((rows) =>
              rows.some((row) => row.pluginId === target.pluginId) ? rows : [...rows, target],
            );
          }
          if (targetRow) {
            if (isPluginGloballyInstalled(targetRow.pluginId)) {
              let deps = await installMissingDependencies(targetRow.pluginId, storageV5);
              let saved = await savePluginOptions(targetRow.pluginId, deps, storageV5, credentials);
              if (cancelled) return;
              if (saved) setViewState_2(saved);
              else if (deps === null)
                setError(
                  `Plugin '${targetRow.pluginId}' is already installed. Use '/plugin' to manage existing plugins.`,
                );
              else if (deps.changed) {
                let completion = await onInstallComplete?.([targetRow.pluginId]);
                if (cancelled) return;
                setResult(
                  `Plugin "${targetRow.pluginId}" is already installed${deps.suffix}${completion === "load-failed" ? ". The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
                );
              } else setResult(`Plugin "${targetRow.pluginId}" is already installed${deps.suffix}`);
            } else openDetails(targetRow);
          } else setError(`Plugin "${targetPlugin}" not found in any marketplace`);
        }
      } catch (error) {
        if (cancelled) return;
        setError(error instanceof Error ? error.message : "Failed to load plugins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPlugins();
    return () => {
      cancelled = true;
    };
  }, [
    setError,
    setResult,
    setViewState_2,
    openDetails,
    onInstallComplete,
    getSessionContext,
    grantedSuggestions,
    targetPlugin,
    initialMarketplace,
    storageV5,
    credentials,
    markDiscoverLoaded,
  ]);
  let granting = useRef(false);
  useEffect(() => {
    if (
      granting.current ||
      loading ||
      storeSelector !== null ||
      storeSelector_2 !== null ||
      viewState !== "plugin-list" ||
      suggestionLog.size === 0
    )
      return;
    granting.current = true;
    let grantIds = [...suggestionLog.keys()];
    for (let pluginId of grantIds) grantedSuggestions?.add(pluginId);
    recordPluginSuggestionShown(
      grantIds.flatMap((pluginId) => [
        pluginId,
        ...(allItems.find((row) => row.pluginId === pluginId)?.installCountIds ?? []),
      ]),
      storageV5,
    );
  }, [
    allItems,
    loading,
    storeSelector,
    storeSelector_2,
    viewState,
    suggestionLog,
    grantedSuggestions,
    storageV5,
  ]);
  useKeybinding("confirm:no", closeDetails, {
    context: "Settings",
    isActive: viewState === "plugin-details",
  });
  useKeybinding(
    "confirm:no",
    () => {
      setViewState({
        type: "menu",
      });
    },
    {
      context: "Settings",
      isActive: viewState === "plugin-list" && !isSearchMode,
    },
  );
  if (typeof viewState === "object" && viewState.type === "plugin-options")
    return jsxProd_default(formatInstallOutcome, {
      viewState,
      onInstallComplete,
      onFinish: (result) => {
        setResult(result);
        setViewState({
          type: "menu",
        });
      },
    });
  if (loading)
    return jsxProd_default(WorkerBadge, {
      message: statusText,
    });
  if (storeSelector)
    return jsxProd_default(ErrorText, {
      error: storeSelector,
    });
  if (viewState === "plugin-details" && selectedPlugin)
    return jsxProd_default(PluginSelectionKeyHint, {
      onEntryHelperShown: recordEntryHelperShown,
      title: "Plugin details",
      plugin: selectedPlugin,
      showMarketplace: true,
      installError,
      isInstalling,
      onInstall: installPlugin,
      onBack: closeDetails,
    });
  if (allItems.length === 0)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Discover plugins",
          }),
        }),
        pendingInstall &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(StatusRow, {
              status: "warning",
              children: pendingInstall,
            }),
          }),
        jsxProd_default(renderEmptyDiscoverState, {
          reason: installFailure,
        }),
        installing
          ? jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(formatBlockedByOrg, {}),
            })
          : null,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "go back",
            }),
          }),
        }),
      ],
    });
  let visibleItems = pagination.getVisibleItems(filteredPlugins);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: handleListKeyDown,
    onPaste: handleListPaste,
    children: [
      jsxProd_default_2(Box, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Discover plugins",
          }),
          pagination.needsPagination &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " ",
                "(",
                pagination.scrollPosition.current,
                "/",
                pagination.scrollPosition.total,
                ")",
              ],
            }),
        ],
      }),
      jsxProd_default(Box, {
        marginBottom: showTabBar || installing ? 0 : 1,
        flexDirection: "column",
        children: jsxProd_default(SearchBox, {
          ...searchBoxProps,
        }),
      }),
      showTabBar
        ? jsxProd_default(Box, {
            marginBottom: installing ? 0 : 1,
            marginLeft: 1,
            children: jsxProd_default_2(Text, {
              children: [
                pickShownMarketplaces(marketplaceTabs, activeMarketplace).map((tab, tabIndex) => {
                  let isActiveTab = tab.marketplace === activeMarketplace;
                  return jsxProd_default_2(
                    Text,
                    {
                      children: [
                        tabIndex > 0 &&
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: " \xB7 ",
                          }),
                        jsxProd_default_2(Text, {
                          bold: isActiveTab,
                          color: isActiveTab ? "suggestion" : undefined,
                          dimColor: !isActiveTab,
                          children: [stripInvisibleKeepEmoji(tab.label), " ", tab.count],
                        }),
                      ],
                    },
                    tab.marketplace ?? "",
                  );
                }),
                marketplaceTabs.length > MAX_SHOWN_MARKETPLACES &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" ", "\xB7 +", marketplaceTabs.length - MAX_SHOWN_MARKETPLACES, " more"],
                  }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "  ",
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "plugin:cycleMarketplace",
                      context: "Plugin",
                      fallback: "ctrl+s",
                      description: "filter by marketplace",
                      parens: true,
                    }),
                  ],
                }),
              ],
            }),
          })
        : null,
      installing
        ? jsxProd_default(Box, {
            marginBottom: 1,
            marginLeft: 1,
            children: jsxProd_default(formatBlockedByOrg, {}),
          })
        : null,
      installResult !== undefined
        ? jsxProd_default(Box, {
            marginBottom: 1,
            marginLeft: 1,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "The ",
                OFFICIAL_MARKETPLACE_DISPLAY,
                " could not be reached; showing the list from",
                " ",
                Number.isNaN(Date.parse(installResult))
                  ? "an earlier session"
                  : formatRelativeTimeAgo(new Date(installResult), {
                      style: "long",
                    }),
                ".",
              ],
            }),
          })
        : null,
      pendingInstall &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(StatusRow, {
            status: "warning",
            children: pendingInstall,
          }),
        }),
      filteredPlugins.length === 0 &&
        searchQuery &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default_2(HintText, {
            children: ['No plugins match "', searchQuery, '"'],
          }),
        }),
      jsxProd_default(MoreItemsIndicator, {
        direction: "above",
        count: pagination.startIndex,
      }),
      visibleItems.map((row, visibleIndex) => {
        let actualIndex = pagination.toActualIndex(visibleIndex);
        let isSelected = selectedIndex === actualIndex;
        let markedForInstall = selectedForInstall.has(row.pluginId);
        let isInstalling = installingPlugins.has(row.pluginId);
        let count = getPluginInstallCount(row, error);
        let description = row.entry.description || (showSources ? pluginSourceLink(row) : undefined);
        let suggestionEntry = suggestionLog.get(row.pluginId);
        let isLast = visibleIndex === visibleItems.length - 1;
        return jsxProd_default_2(
          TwoColumnRow,
          {
            active: isSelected && !isSearchMode,
            flexDirection: "column",
            marginBottom: isLast ? 0 : 1,
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    "aria-hidden": true,
                    color: isSelected && !isSearchMode ? "suggestion" : undefined,
                    children: [isSelected && !isSearchMode ? figures_default.pointer : " ", " "],
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      isInstalling
                        ? figures_default.ellipsis
                        : markedForInstall
                          ? figures_default.radioOn
                          : figures_default.radioOff,
                      " ",
                      getPluginDisplayName(row.entry),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [" ", "\xB7 ", stripInvisibleKeepEmoji(marketplaceLabel_2(row))],
                      }),
                      suggestionEntry &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" ", "\xB7 ", formatSuggestedFor(suggestionEntry)],
                        }),
                      row.entry.tags?.includes("community-managed") &&
                        row.marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [Community Managed]",
                        }),
                      isNonInstallableClaudeAiPlugin(row.entry) &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [not installable on claude.ai yet]",
                        }),
                      count !== undefined &&
                        (row.marketplaceName === CLAUDE_PLUGINS_OFFICIAL ||
                          row.alsoListedIn?.includes(CLAUDE_PLUGINS_OFFICIAL)) &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" \xB7 ", formatInstallCount(count), " installs"],
                        }),
                    ],
                  }),
                ],
              }),
              description &&
                jsxProd_default(Box, {
                  marginLeft: 4,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: truncateToWidth(stripInvisibleKeepEmoji(description), 60),
                  }),
                }),
            ],
          },
          `${pagination.startIndex}-${row.pluginId}`,
        );
      }),
      jsxProd_default(MoreItemsIndicator, {
        direction: "below",
        count: filteredPlugins.length - pagination.endIndex,
      }),
      jsxProd_default(DiscoverPluginsKeyHint, {
        ...keyHintProps,
      }),
    ],
  });
}
//@ chunk-wb51jffc.js:94377-94581 placement
function formatBlockedByOrg() {
  let $ = useMemoCache(2);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = pluginDirectoryPolicyBlockHint();
    $[0] = content;
  } else content = $[0];
  let memoContent = content;
  let footer;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        OFFICIAL_MARKETPLACE_DISPLAY,
        " is blocked by your organization.",
        memoContent === "" ? "" : ` ${memoContent}`,
      ],
    });
    $[1] = footer;
  } else footer = $[1];
  return footer;
}
//@ chunk-wb51jffc.js:94581-96655 placement
/**
 * 发现页空状态（目录未加载、全部已安装、被策略隐藏、市场加载失败）。
 */
function renderEmptyDiscoverState(props) {
  let $ = useMemoCache(9);
  let { reason } = props;
  switch (reason) {
    case "directory-failed": {
      let content;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        content = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["No plugins to show until the", " ", OFFICIAL_MARKETPLACE_DISPLAY, " loads."],
        });
        $[0] = content;
      } else content = $[0];
      return content;
    }
    case "all-hidden-by-policy": {
      let reasonLine;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        reasonLine = jsxProd_default(Text, {
          dimColor: true,
          children: "Your organization's policy hides every plugin that would be listed here.",
        });
        $[1] = reasonLine;
      } else reasonLine = $[1];
      return reasonLine;
    }
    case "git-not-installed": {
      let hintLine;
      if ($[2] === MEMO_CACHE_SENTINEL) {
        hintLine = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Git is required to install marketplaces.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Please install git and restart Claude Code.",
            }),
          ],
        });
        $[2] = hintLine;
      } else hintLine = $[2];
      return hintLine;
    }
    case "all-blocked-by-policy": {
      let footerLine;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        footerLine = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Your organization policy does not allow any external marketplaces.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Contact your administrator.",
            }),
          ],
        });
        $[3] = footerLine;
      } else footerLine = $[3];
      return footerLine;
    }
    case "policy-restricts-sources": {
      let statusLine;
      if ($[4] === MEMO_CACHE_SENTINEL) {
        statusLine = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Your organization restricts which marketplaces can be added.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Switch to the Marketplaces tab to view allowed sources.",
            }),
          ],
        });
        $[4] = statusLine;
      } else statusLine = $[4];
      return statusLine;
    }
    case "all-marketplaces-failed": {
      let actionLine;
      if ($[5] === MEMO_CACHE_SENTINEL) {
        actionLine = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Failed to load marketplace data.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Check your network connection.",
            }),
          ],
        });
        $[5] = actionLine;
      } else actionLine = $[5];
      return actionLine;
    }
    case "all-plugins-installed": {
      let detailLine;
      if ($[6] === MEMO_CACHE_SENTINEL) {
        detailLine = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "All available plugins are already installed.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Check for new plugins later or add more marketplaces.",
            }),
          ],
        });
        $[6] = detailLine;
      } else detailLine = $[6];
      return detailLine;
    }
    case "all-plugins-project-installed": {
      let detailRows;
      if ($[7] === MEMO_CACHE_SENTINEL) {
        detailRows = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "All available plugins are installed for this project.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Use the Browse tab to install at user scope.",
            }),
          ],
        });
        $[7] = detailRows;
      } else detailRows = $[7];
      return detailRows;
    }
    case "no-marketplaces-configured":
    default: {
      let footer;
      if ($[8] === MEMO_CACHE_SENTINEL) {
        footer = jsxProd_default(HintText, {
          hint: "Add a marketplace first using the Marketplaces tab.",
          children: "No plugins available.",
        });
        $[8] = footer;
      } else footer = $[8];
      return footer;
    }
  }
}
//@ chunk-wb51jffc.js:96655-96665 placement
var MAX_SUGGESTION_LABEL_WIDTH = 32;
//@ chunk-wb51jffc.js:96665-96964 placement
function formatSuggestedFor(entry) {
  switch (entry.signal) {
    case "cwd":
      return "suggested for this directory";
    case "cli":
      return `suggested for ${truncateToWidth(entry.command, MAX_SUGGESTION_LABEL_WIDTH)} commands`;
    case "hosts":
      return `suggested for ${truncateToWidth(entry.host, MAX_SUGGESTION_LABEL_WIDTH)}`;
    case "filesRead":
      return `suggested for ${displayPathForSuggestion(entry.file)}`;
    case "manifestDep":
      return `suggested from ${displayPathForSuggestion(entry.file)}`;
  }
}
//@ chunk-wb51jffc.js:96964-97020 placement
function displayPathForSuggestion(file) {
  return truncatePathMiddle(getDisplayPath(file).replaceAll("\\", "/"), MAX_SUGGESTION_LABEL_WIDTH);
}
//@ chunk-wb51jffc.js:97020-97024 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:97020", () => {
  init_react_production();
});
export { DiscoverPluginsScreen, renderContextCost };
