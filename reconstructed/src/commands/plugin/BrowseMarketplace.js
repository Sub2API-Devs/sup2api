/**
 * commands/plugin/BrowseMarketplace.tsx
 *
 * 浏览市场插件列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/BrowseMarketplace.tsx
 * pieces: chunk-vrb44rx7.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { errorOf } from "./PluginDetails.js";
import { useState, useCallback, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
import { DiscoverPlugins, DiscoverPluginsKeyHint } from "./DiscoverPlugins.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  loadKnownMarketplacesWithDeclared,
  getMarketplace,
  loadKnownMarketplacesSafe,
} from "../../utils/plugins/marketplaceManager.js";
import { isOfficialMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import { displayMarketplaceName, pluginInstallPath } from "../../utils/plugins/pluginDisplayMetadata.js";
import {
  refreshBeforeScopedInstall,
  logInstallRefreshFirst,
} from "../../services/plugins/pluginOperations.js";
import {
  loadMarketplacesWithErrors,
  formatPluginId,
  getMarketplaceSourceDisplay,
  formatMarketplaceLoadingErrors,
  filterSuccessfulMarketplaces,
} from "../../utils/plugins/marketplaceHelpers.js";
import { count } from "../../utils/collections.js";
import { isPluginInstalled, isPluginGloballyInstalled } from "../../utils/plugins/installedPluginsManager.js";
import { ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";
import { oneLineClipped, plural } from "../../utils/stringUtils.js";
import { installMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { savePluginOptions, formatInstallOutcome } from "./PluginOptionsFlow.js";
import { isPluginDirectorySource } from "../../utils/plugins/officialMarketplaceNames.js";
import { commandSourceSession } from "../../utils/plugins/commandSourceErrors.js";
import { isPluginBlockedByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { getUniqueInstallCounts, formatInstallCount } from "../../utils/plugins/installCounts.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { ErrorText } from "../../components/ErrorText.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { Byline } from "../../components/design-system/Byline.js";
import { PluginSelectionKeyHint } from "./pluginDetailsHelpers.js";
import { renderContextCost } from "./DiscoverPluginsScreen.js";
import { isPluginDirectoryModeOn } from "../../utils/plugins/pluginGates.js";
import { HintText } from "../../components/design-system/HintText.js";
import { SearchBox } from "../../components/SearchBox.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isNonInstallableClaudeAiPlugin } from "../../utils/plugins/claudeAiMarketplaces.js";
import { ParenHint } from "../../components/diff/DiffDetailView.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { truncateToWidth } from "../../utils/format.js";

//@ chunk-vrb44rx7.js:74454-74469 placement
function noopBrowseMarketplaceHandler() {}
//@ chunk-vrb44rx7.js:74469-83483 fingerprint = BrowseMarketplace (0.468)
function BrowseMarketplace({
  screen,
  onInstallComplete,
  onSearchModeChange,
  targetMarketplace,
  targetPlugin,
}) {
  let { storageV5, credentials } = useTheme_2();
  let storeSelector = useStoreSelector(screen, errorOf);
  let { setError, setResult } = screen;
  let setViewState = screen.setViewState;
  let [marketplaceName, setMarketplaceName] = useState(null);
  let [plugins, setPlugins] = useState([]);
  let [marketplaces, setMarketplaces] = useState([]);
  let [loading, setLoading] = useState(false);
  let [searching, setSearching] = useState(true);
  let [statusText, setStatusText] = useState("Loading\u2026");
  let [error, setLoadError] = useState(null);
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
    setSelectedIndex,
    selectedForInstall,
    setSelectedForInstall,
    installingPlugins,
    pagination,
    installPlugin,
    isInstalling,
    installError,
    handleListKeyDown,
    handleListPaste,
  } = DiscoverPlugins({
    screen,
    surface: "browse",
    initialViewState: "marketplace-list",
    availablePlugins: marketplaces,
    loading: searching,
    searchMarketplaceName: false,
    onInstallComplete,
    onSearchModeChange,
  });
  let [focusedPlugin, setSelectedPlugin] = useState(null);
  let [pendingInstall, setPendingInstall] = useState(null);
  let handleBack = useCallback(() => {
    if (viewState === "plugin-list") {
      if (targetMarketplace)
        setViewState({
          type: "manage-marketplaces",
          targetMarketplace,
        });
      else if (plugins.length === 1)
        setViewState({
          type: "menu",
        });
      else {
        setViewState_2("marketplace-list");
        setMarketplaceName(null);
        setSelectedForInstall(new Set());
      }
    } else if (viewState === "plugin-details") closeDetails();
    else
      setViewState({
        type: "menu",
      });
  }, [
    viewState,
    setViewState_2,
    closeDetails,
    targetMarketplace,
    setViewState,
    plugins.length,
    setSelectedForInstall,
  ]);
  useKeybinding("confirm:no", handleBack, {
    context: "Settings",
    isActive: typeof viewState === "string" && !(viewState === "plugin-list" && isSearchMode),
  });
  useEffect(() => {
    let cancelled = false;
    async function loadMarketplaceData() {
      try {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let loadedData;
        if (targetMarketplace && targetPlugin && !isOfficialMarketplace(targetMarketplace)) {
          setStatusText(`Checking ${displayMarketplaceName(targetMarketplace)} for new plugins\u2026`);
          let refreshed = await refreshBeforeScopedInstall(
            targetMarketplace,
            knownMarketplacesWithDeclared[targetMarketplace],
            storageV5,
          );
          logInstallRefreshFirst(refreshed.outcome);
          if (cancelled) return;
          setStatusText("Loading\u2026");
          if (refreshed.outcome === "refresh-failed") {
            loadedData = refreshed.errorMessage;
            setPendingInstall(
              `Couldn't refresh marketplace "${targetMarketplace}" (${refreshed.errorMessage}) \u2014 showing the cached catalog.`,
            );
          }
        }
        let { marketplaces, failures } = await loadMarketplacesWithErrors(
          knownMarketplacesWithDeclared,
          storageV5,
        );
        if (cancelled) return;
        let marketplaceInfos = [];
        for (let { name, config: marketplaceConfig, data: marketplace } of marketplaces)
          if (marketplace) {
            let installedFromThisMarketplace = count(marketplace.plugins, (plugin) =>
              isPluginInstalled(formatPluginId(plugin.name, name)),
            );
            marketplaceInfos.push({
              name,
              totalPlugins: marketplace.plugins.length,
              installedCount: installedFromThisMarketplace,
              source: getMarketplaceSourceDisplay(marketplaceConfig.source),
            });
          }
        marketplaceInfos.sort((a, b) => {
          if (a.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
          if (b.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
          return 0;
        });
        setPlugins(marketplaceInfos);
        let successCount = count(marketplaces, (m) => m.data !== null);
        let errorResult = formatMarketplaceLoadingErrors(failures, successCount);
        if (errorResult)
          if (errorResult.type === "warning")
            setSelectedPlugin(
              filterSuccessfulMarketplaces(failures).length === 0
                ? errorResult.message
                : errorResult.message + ". Showing available marketplaces.",
            );
          else throw Error(errorResult.message);
        if (marketplaceInfos.length === 1 && !targetMarketplace && !targetPlugin) {
          let singleMarketplace = marketplaceInfos[0];
          if (singleMarketplace) {
            setMarketplaceName(singleMarketplace.name);
            setViewState_2("plugin-list");
          }
        }
        if (targetMarketplace && !marketplaceInfos.some((m_0) => m_0.name === targetMarketplace)) {
          let found = failures.find((failure) => failure.name === targetMarketplace);
          setError(
            found
              ? `Couldn't load marketplace "${oneLineClipped(targetMarketplace)}": ${found.error}`
              : `Marketplace "${oneLineClipped(targetMarketplace)}" not found`,
          );
        } else if (targetPlugin) {
          let foundPlugin = null;
          for (let { name, data } of marketplaces) {
            if (targetMarketplace && name !== targetMarketplace) continue;
            let found = data?.plugins.find((plugin) => plugin.name === targetPlugin);
            if (!found) continue;
            let pluginId = formatPluginId(found.name, name);
            let [installPath] = await pluginInstallPath(
              name,
              [found],
              knownMarketplacesWithDeclared,
              storageV5,
            );
            foundPlugin = {
              entry: installPath ?? found,
              marketplaceName: name,
              pluginId,
              isInstalled: isPluginGloballyInstalled(pluginId),
            };
            break;
          }
          if (cancelled) return;
          if (foundPlugin) {
            let pluginId_0 = foundPlugin.pluginId;
            if (isPluginGloballyInstalled(pluginId_0)) {
              let deps = await installMissingDependencies(pluginId_0, storageV5);
              let savedOptions = await savePluginOptions(pluginId_0, deps, storageV5, credentials);
              if (cancelled) return;
              if (savedOptions) setViewState_2(savedOptions);
              else if (deps === null)
                setError(
                  `Plugin '${pluginId_0}' is already installed globally. Use '/plugin' to manage existing plugins.`,
                );
              else if (deps.changed) {
                let completion = await onInstallComplete([pluginId_0]);
                if (cancelled) return;
                setResult(
                  `Plugin "${pluginId_0}" is already installed${deps.suffix}${completion === "load-failed" ? ". The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
                );
              } else setResult(`Plugin "${pluginId_0}" is already installed${deps.suffix}`);
            } else {
              setMarketplaceName(foundPlugin.marketplaceName);
              openDetails(foundPlugin);
            }
          } else {
            let whereLabel = targetMarketplace ? `marketplace "${targetMarketplace}"` : "any marketplace";
            let loadedForPlugins = loadedData
              ? `. The marketplace couldn't be refreshed (${loadedData}), so its cached catalog may be out of date`
              : "";
            setError(`Plugin "${targetPlugin}" not found in ${whereLabel}${loadedForPlugins}`);
          }
        } else if (targetMarketplace) {
          setMarketplaceName(targetMarketplace);
          setViewState_2("plugin-list");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load marketplaces");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    loadMarketplaceData();
    return () => {
      cancelled = true;
    };
  }, [
    setError,
    setResult,
    setViewState_2,
    openDetails,
    onInstallComplete,
    targetMarketplace,
    targetPlugin,
    storageV5,
    credentials,
  ]);
  let globallyInstalled = useRef(0);
  useEffect(() => {
    if (!marketplaceName) return;
    let cancelled = false;
    let installTicket = ++globallyInstalled.current;
    async function loadPluginsForMarketplace(marketplaceName) {
      setSearching(true);
      setStatusText("Loading\u2026");
      try {
        let [marketplace, knownMarketplaces] = await Promise.all([
          getMarketplace(marketplaceName, storageV5),
          loadKnownMarketplacesSafe(storageV5),
        ]);
        if (cancelled) return;
        if (!marketplace) throw Error(`Failed to load marketplace: ${marketplaceName}`);
        let installPath = await pluginInstallPath(
          marketplaceName,
          marketplace.plugins,
          knownMarketplaces,
          storageV5,
        );
        if (cancelled) return;
        let installablePlugins = [];
        let source = knownMarketplaces[marketplaceName]?.source;
        let found =
          source !== undefined &&
          isPluginDirectorySource(source) &&
          (commandSourceSession().catalogEntryNames?.size ?? 0) > marketplace.plugins.length;
        for (let entry of installPath) {
          let pluginId = formatPluginId(entry.name, marketplaceName);
          if (isPluginBlockedByPolicy(pluginId)) {
            found = true;
            continue;
          }
          installablePlugins.push({
            entry,
            marketplaceName,
            pluginId,
            isInstalled: isPluginGloballyInstalled(pluginId),
          });
        }
        try {
          let counts = await getUniqueInstallCounts(storageV5);
          if (cancelled) return;
          setLoadError(counts);
          if (counts)
            installablePlugins.sort((a_1, b_1) => {
              let countA = counts.get(a_1.pluginId) ?? 0;
              let countB = counts.get(b_1.pluginId) ?? 0;
              if (countA !== countB) return countB - countA;
              return a_1.entry.name.localeCompare(b_1.entry.name);
            });
          else installablePlugins.sort((a_2, b_2) => a_2.entry.name.localeCompare(b_2.entry.name));
        } catch (error) {
          if (cancelled) return;
          logForDebugging(`Failed to fetch install counts: ${errorMessage(error)}`);
          installablePlugins.sort((a_0, b_0) => a_0.entry.name.localeCompare(b_0.entry.name));
        }
        setMarketplaces(installablePlugins);
        setLoading(found);
        setSelectedIndex(0);
        setSelectedForInstall(new Set());
        setIsSearchMode(false);
        setSearchQuery("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load plugins");
      } finally {
        if (globallyInstalled.current === installTicket) setSearching(false);
      }
    }
    loadPluginsForMarketplace(marketplaceName);
    return () => {
      cancelled = true;
    };
  }, [
    marketplaceName,
    setError,
    setSearchQuery,
    setSelectedIndex,
    setSelectedForInstall,
    setIsSearchMode,
    storageV5,
  ]);
  if (typeof viewState === "object" && viewState.type === "plugin-options")
    return jsxProd_default(formatInstallOutcome, {
      viewState,
      onInstallComplete,
      onFinish: (msg) => {
        setResult(msg);
        setViewState({
          type: "menu",
        });
      },
    });
  if (searching)
    return jsxProd_default(WorkerBadge, {
      message: statusText,
    });
  if (storeSelector)
    return jsxProd_default(ErrorText, {
      error: storeSelector,
    });
  if (viewState === "marketplace-list") {
    if (plugins.length === 0)
      return jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              bold: true,
              children: "Select marketplace",
            }),
          }),
          jsxProd_default(Text, {
            children: "No marketplaces configured.",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Add a marketplace first using ", "'Add marketplace'", "."],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            paddingLeft: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
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
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Select marketplace",
          }),
        }),
        focusedPlugin &&
          jsxProd_default(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children: jsxProd_default_2(Text, {
              color: "warning",
              children: [
                jsxProd_default(StatusIcon, {
                  status: "warning",
                  withSpace: true,
                }),
                focusedPlugin,
              ],
            }),
          }),
        jsxProd_default(OrderedListWithItem, {
          onSelect: (p_1) => {
            let marketplace = plugins[p_1];
            if (!marketplace) return;
            setMarketplaceName(marketplace.name);
            setViewState_2("plugin-list");
          },
          children: plugins.map((msg) =>
            jsxProd_default(
              OrderedListWithItem.Item,
              {
                label: stripInvisibleKeepEmoji(displayMarketplaceName(msg.name)),
                meta: [
                  `${msg.totalPlugins} ${plural(msg.totalPlugins, "plugin")} available`,
                  msg.installedCount > 0 ? `${msg.installedCount} already installed` : "",
                ],
                description: msg.source ? stripInvisibleKeepEmoji(msg.source) : undefined,
              },
              msg.name,
            ),
          ),
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "select:accept",
                  context: "Select",
                  fallback: "Enter",
                  description: "select",
                }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Settings",
                  fallback: "Esc",
                  description: "go back",
                }),
              ],
            }),
          }),
        }),
      ],
    });
  }
  if (viewState === "plugin-details" && selectedPlugin)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        pendingInstall &&
          jsxProd_default(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children: jsxProd_default_2(Text, {
              color: "warning",
              children: [
                jsxProd_default(StatusIcon, {
                  status: "warning",
                  withSpace: true,
                }),
                pendingInstall,
              ],
            }),
          }),
        jsxProd_default(PluginSelectionKeyHint, {
          onEntryHelperShown: recordEntryHelperShown,
          title: "Plugin Details",
          plugin: selectedPlugin,
          extraSection: jsxProd_default(renderContextCost, {
            pluginId: selectedPlugin.pluginId,
          }),
          installError,
          isInstalling,
          onInstall: installPlugin,
          onBack: closeDetails,
          bylinePaddingLeft: 1,
        }),
      ],
    });
  if (marketplaces.length === 0)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Install plugins",
          }),
        }),
        isPluginDirectoryModeOn() && loading
          ? jsxProd_default(Box, {
              marginBottom: 1,
              children: jsxProd_default(HintText, {
                children: "Your organization's policy hides every plugin in this marketplace.",
              }),
            })
          : jsxProd_default(HintText, {
              hint: "All plugins from this marketplace are already installed.",
              children: "No new plugins available to install.",
            }),
        jsxProd_default(Box, {
          marginLeft: 3,
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
  let visiblePlugins = pagination.getVisibleItems(filteredPlugins);
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
            children: "Install Plugins",
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
        marginBottom: 1,
        flexDirection: "column",
        children: jsxProd_default(SearchBox, {
          ...searchBoxProps,
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
      pagination.scrollPosition.canScrollUp &&
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", figures_default.arrowUp, " more above"],
          }),
        }),
      visiblePlugins.map((plugin, visibleIndex) => {
        let actualIndex = pagination.toActualIndex(visibleIndex);
        let isSelected = selectedIndex === actualIndex;
        let isSelectedForInstall = selectedForInstall.has(plugin.pluginId);
        let isInstalling = installingPlugins.has(plugin.pluginId);
        let isLast = visibleIndex === visiblePlugins.length - 1;
        let installCounts = error?.get(plugin.pluginId);
        return jsxProd_default_2(
          TwoColumnRow,
          {
            active: isSelected && !isSearchMode,
            flexDirection: "column",
            marginBottom: isLast && !storeSelector ? 0 : 1,
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    "aria-hidden": true,
                    color: isSelected && !isSearchMode ? "suggestion" : undefined,
                    children: [isSelected && !isSearchMode ? figures_default.pointer : " ", " "],
                  }),
                  jsxProd_default_2(Text, {
                    color: plugin.isInstalled ? "success" : undefined,
                    children: [
                      plugin.isInstalled
                        ? figures_default.tick
                        : isInstalling
                          ? figures_default.ellipsis
                          : isSelectedForInstall
                            ? figures_default.radioOn
                            : figures_default.radioOff,
                      " ",
                      getPluginDisplayName(plugin.entry),
                      plugin.entry.category &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" ", "[", stripInvisibleKeepEmoji(plugin.entry.category), "]"],
                        }),
                      plugin.entry.tags?.includes("community-managed") &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [Community Managed]",
                        }),
                      isNonInstallableClaudeAiPlugin(plugin.entry) &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [not installable on claude.ai yet]",
                        }),
                      jsxProd_default(ParenHint, {
                        when: plugin.isInstalled,
                        children: "installed",
                      }),
                      installCounts !== undefined &&
                        marketplaceName === CLAUDE_PLUGINS_OFFICIAL &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" \xB7 ", formatInstallCount(installCounts), " installs"],
                        }),
                    ],
                  }),
                ],
              }),
              plugin.entry.description &&
                jsxProd_default_2(Box, {
                  marginLeft: 4,
                  children: [
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: truncateToWidth(stripInvisibleKeepEmoji(plugin.entry.description), 60),
                    }),
                    plugin.entry.version &&
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [" ", "\xB7 v", stripInvisibleKeepEmoji(plugin.entry.version)],
                      }),
                  ],
                }),
            ],
          },
          plugin.pluginId,
        );
      }),
      pagination.scrollPosition.canScrollDown &&
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", figures_default.arrowDown, " more below"],
          }),
        }),
      storeSelector &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default_2(Text, {
            color: "error",
            children: [
              jsxProd_default(StatusIcon, {
                status: "error",
                withSpace: true,
              }),
              storeSelector,
            ],
          }),
        }),
      jsxProd_default(DiscoverPluginsKeyHint, {
        ...keyHintProps,
      }),
    ],
  });
}
export { BrowseMarketplace, noopBrowseMarketplaceHandler };
