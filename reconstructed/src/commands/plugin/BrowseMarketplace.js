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
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { ii } from "./PluginDetails.js";
import { y, ce, P, R } from "../../../vendor/react/cjs/react.production.js";
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
import { U$, plural } from "../../utils/stringUtils.js";
import { installMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { savePluginOptions, formatInstallOutcome } from "./PluginOptionsFlow.js";
import { isPluginDirectorySource } from "../../utils/plugins/officialMarketplaceNames.js";
import { kk } from "../../utils/plugins/commandSourceErrors.js";
import { isPluginBlockedByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { getUniqueInstallCounts, formatInstallCount } from "../../utils/plugins/installCounts.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { QE } from "../../utils/plugins/pluginGates.js";
import { HintText } from "../../components/design-system/HintText.js";
import { SearchBox } from "../../components/SearchBox.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isNonInstallableClaudeAiPlugin } from "../../utils/plugins/claudeAiMarketplaces.js";
import { ParenHint } from "../../components/diff/DiffDetailView.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { truncateToWidth } from "../../utils/format.js";

//@ chunk-vrb44rx7.js:74454-74469 placement
function _h() {}
//@ chunk-vrb44rx7.js:74469-83483 fingerprint = BrowseMarketplace (0.468)
function BrowseMarketplace({
  screen: screen,
  onInstallComplete: onInstallComplete,
  onSearchModeChange: onSearchModeChange,
  targetMarketplace: targetMarketplace,
  targetPlugin: targetPlugin,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    U = useStoreSelector(screen, ii),
    { setError: setError, setResult: setResult } = screen,
    setViewState = screen.setViewState,
    [V, B] = y(null),
    [_, J] = y([]),
    [pe, fe] = y([]),
    [me, ne] = y(!1),
    [he, W] = y(!0),
    [Oe, rt] = y("Loading\u2026"),
    [et, je] = y(null),
    {
      viewState: viewState,
      setViewState: setViewState_2,
      selectedPlugin: selectedPlugin,
      openDetails: openDetails,
      closeDetails: closeDetails,
      recordEntryHelperShown: recordEntryHelperShown,
      isSearchMode: isSearchMode,
      setIsSearchMode: setIsSearchMode,
      searchQuery: searchQuery,
      setSearchQuery: setSearchQuery,
      searchBoxProps: searchBoxProps,
      keyHintProps: keyHintProps,
      filteredPlugins: filteredPlugins,
      selectedIndex: selectedIndex,
      setSelectedIndex: setSelectedIndex,
      selectedForInstall: selectedForInstall,
      setSelectedForInstall: setSelectedForInstall,
      installingPlugins: installingPlugins,
      pagination: pagination,
      installPlugin: installPlugin,
      isInstalling: isInstalling,
      installError: installError,
      handleListKeyDown: handleListKeyDown,
      handleListPaste: handleListPaste,
    } = DiscoverPlugins({
      screen: screen,
      surface: "browse",
      initialViewState: "marketplace-list",
      availablePlugins: pe,
      loading: he,
      searchMarketplaceName: !1,
      onInstallComplete: onInstallComplete,
      onSearchModeChange: onSearchModeChange,
    }),
    [on, rn] = y(null),
    [mn, xn] = y(null),
    Ln = ce(() => {
      if (viewState === "plugin-list")
        if (targetMarketplace)
          setViewState({ type: "manage-marketplaces", targetMarketplace: targetMarketplace });
        else if (_.length === 1) setViewState({ type: "menu" });
        else (setViewState_2("marketplace-list"), B(null), setSelectedForInstall(new Set()));
      else if (viewState === "plugin-details") closeDetails();
      else setViewState({ type: "menu" });
    }, [
      viewState,
      setViewState_2,
      closeDetails,
      targetMarketplace,
      setViewState,
      _.length,
      setSelectedForInstall,
    ]);
  (useKeybinding("confirm:no", Ln, {
    context: "Settings",
    isActive: typeof viewState === "string" && !(viewState === "plugin-list" && isSearchMode),
  }),
    P(() => {
      let Be = !1;
      async function loadMarketplaceData() {
        try {
          let le = await loadKnownMarketplacesWithDeclared(storageV5),
            Te;
          if (targetMarketplace && targetPlugin && !isOfficialMarketplace(targetMarketplace)) {
            rt(`Checking ${displayMarketplaceName(targetMarketplace)} for new plugins\u2026`);
            let Ce = await refreshBeforeScopedInstall(targetMarketplace, le[targetMarketplace], storageV5);
            if ((logInstallRefreshFirst(Ce.outcome), Be)) return;
            if ((rt("Loading\u2026"), Ce.outcome === "refresh-failed"))
              ((Te = Ce.errorMessage),
                xn(
                  `Couldn't refresh marketplace "${targetMarketplace}" (${Ce.errorMessage}) \u2014 showing the cached catalog.`,
                ));
          }
          let { marketplaces: marketplaces, failures: failures } = await loadMarketplacesWithErrors(
            le,
            storageV5,
          );
          if (Be) return;
          let Dt = [];
          for (let { name: name, config: marketplaceConfig, data: marketplace } of marketplaces)
            if (marketplace) {
              let installedFromThisMarketplace = count(marketplace.plugins, (plugin) =>
                isPluginInstalled(formatPluginId(plugin.name, name)),
              );
              Dt.push({
                name: name,
                totalPlugins: marketplace.plugins.length,
                installedCount: installedFromThisMarketplace,
                source: getMarketplaceSourceDisplay(marketplaceConfig.source),
              });
            }
          (Dt.sort((Ce, Ve) => {
            if (Ce.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
            if (Ve.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
            return 0;
          }),
            J(Dt));
          let successCount = count(marketplaces, (Ce) => Ce.data !== null),
            errorResult = formatMarketplaceLoadingErrors(failures, successCount);
          if (errorResult)
            if (errorResult.type === "warning")
              rn(
                filterSuccessfulMarketplaces(failures).length === 0
                  ? errorResult.message
                  : errorResult.message + ". Showing available marketplaces.",
              );
            else throw Error(errorResult.message);
          if (Dt.length === 1 && !targetMarketplace && !targetPlugin) {
            let Ce = Dt[0];
            if (Ce) (B(Ce.name), setViewState_2("plugin-list"));
          }
          if (targetMarketplace && !Dt.some((Ce) => Ce.name === targetMarketplace)) {
            let found = failures.find((Ve) => Ve.name === targetMarketplace);
            setError(
              found
                ? `Couldn't load marketplace "${U$(targetMarketplace)}": ${found.error}`
                : `Marketplace "${U$(targetMarketplace)}" not found`,
            );
          } else if (targetPlugin) {
            let foundPlugin = null;
            for (let { name: Ve, data: ke } of marketplaces) {
              if (targetMarketplace && Ve !== targetMarketplace) continue;
              let ht = ke?.plugins.find((xt) => xt.name === targetPlugin);
              if (!ht) continue;
              let pluginId = formatPluginId(ht.name, Ve),
                [qt] = await pluginInstallPath(Ve, [ht], le, storageV5);
              foundPlugin = {
                entry: qt ?? ht,
                marketplaceName: Ve,
                pluginId: pluginId,
                isInstalled: isPluginGloballyInstalled(pluginId),
              };
              break;
            }
            if (Be) return;
            if (foundPlugin) {
              let pluginId_0 = foundPlugin.pluginId;
              if (isPluginGloballyInstalled(pluginId_0)) {
                let ht = await installMissingDependencies(pluginId_0, storageV5),
                  Jt = await savePluginOptions(pluginId_0, ht, storageV5, credentials);
                if (Be) return;
                if (Jt) setViewState_2(Jt);
                else if (ht === null)
                  setError(
                    `Plugin '${pluginId_0}' is already installed globally. Use '/plugin' to manage existing plugins.`,
                  );
                else if (ht.changed) {
                  let qt = await onInstallComplete([pluginId_0]);
                  if (Be) return;
                  setResult(
                    `Plugin "${pluginId_0}" is already installed${ht.suffix}${qt === "load-failed" ? ". The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
                  );
                } else setResult(`Plugin "${pluginId_0}" is already installed${ht.suffix}`);
              } else (B(foundPlugin.marketplaceName), openDetails(foundPlugin));
            } else {
              let Ve = targetMarketplace ? `marketplace "${targetMarketplace}"` : "any marketplace",
                ke = Te
                  ? `. The marketplace couldn't be refreshed (${Te}), so its cached catalog may be out of date`
                  : "";
              setError(`Plugin "${targetPlugin}" not found in ${Ve}${ke}`);
            }
          } else if (targetMarketplace) (B(targetMarketplace), setViewState_2("plugin-list"));
        } catch (error) {
          if (Be) return;
          setError(error instanceof Error ? error.message : "Failed to load marketplaces");
        } finally {
          if (!Be) W(!1);
        }
      }
      return (
        loadMarketplaceData(),
        () => {
          Be = !0;
        }
      );
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
    ]));
  let globallyInstalled = R(0);
  if (
    (P(() => {
      if (!V) return;
      let Be = !1,
        jt = ++globallyInstalled.current;
      async function loadPluginsForMarketplace(marketplaceName) {
        (W(!0), rt("Loading\u2026"));
        try {
          let [Ue, dt] = await Promise.all([
            getMarketplace(marketplaceName, storageV5),
            loadKnownMarketplacesSafe(storageV5),
          ]);
          if (Be) return;
          if (!Ue) throw Error(`Failed to load marketplace: ${marketplaceName}`);
          let Dt = await pluginInstallPath(marketplaceName, Ue.plugins, dt, storageV5);
          if (Be) return;
          let wt = [],
            We = dt[marketplaceName]?.source,
            Ce =
              We !== void 0 &&
              isPluginDirectorySource(We) &&
              (kk().catalogEntryNames?.size ?? 0) > Ue.plugins.length;
          for (let Ve of Dt) {
            let pluginId_1 = formatPluginId(Ve.name, marketplaceName);
            if (isPluginBlockedByPolicy(pluginId_1)) {
              Ce = !0;
              continue;
            }
            wt.push({
              entry: Ve,
              marketplaceName: marketplaceName,
              pluginId: pluginId_1,
              isInstalled: isPluginGloballyInstalled(pluginId_1),
            });
          }
          try {
            let Ve = await getUniqueInstallCounts(storageV5);
            if (Be) return;
            if ((je(Ve), Ve))
              wt.sort((a_1, b_1) => {
                let Jt = Ve.get(a_1.pluginId) ?? 0,
                  qt = Ve.get(b_1.pluginId) ?? 0;
                if (Jt !== qt) return qt - Jt;
                return a_1.entry.name.localeCompare(b_1.entry.name);
              });
            else wt.sort((a_2, b_2) => a_2.entry.name.localeCompare(b_2.entry.name));
          } catch (error_0) {
            if (Be) return;
            (logForDebugging(`Failed to fetch install counts: ${errorMessage(error_0)}`),
              wt.sort((a_0, b_0) => a_0.entry.name.localeCompare(b_0.entry.name)));
          }
          (fe(wt),
            ne(Ce),
            setSelectedIndex(0),
            setSelectedForInstall(new Set()),
            setIsSearchMode(!1),
            setSearchQuery(""));
        } catch (err_0) {
          if (Be) return;
          setError(err_0 instanceof Error ? err_0.message : "Failed to load plugins");
        } finally {
          if (globallyInstalled.current === jt) W(!1);
        }
      }
      return (
        loadPluginsForMarketplace(V),
        () => {
          Be = !0;
        }
      );
    }, [V, setError, setSearchQuery, setSelectedIndex, setSelectedForInstall, setIsSearchMode, storageV5]),
    typeof viewState === "object" && viewState.type === "plugin-options")
  )
    return e(formatInstallOutcome, {
      viewState: viewState,
      onInstallComplete: onInstallComplete,
      onFinish: (p_0) => {
        (setResult(p_0), setViewState({ type: "menu" }));
      },
    });
  if (he) return e(WorkerBadge, { message: Oe });
  if (U) return e(ErrorText, { error: U });
  if (viewState === "marketplace-list") {
    if (_.length === 0)
      return r(Box, {
        flexDirection: "column",
        children: [
          e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Select marketplace" }) }),
          e(Text, { children: "No marketplaces configured." }),
          r(Text, { dimColor: !0, children: ["Add a marketplace first using ", "'Add marketplace'", "."] }),
          e(Box, {
            marginTop: 1,
            paddingLeft: 1,
            children: e(Text, {
              dimColor: !0,
              children: e(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Settings",
                fallback: "Esc",
                description: "go back",
              }),
            }),
          }),
        ],
      });
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Select marketplace" }) }),
        on &&
          e(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children: r(Text, {
              color: "warning",
              children: [e(StatusIcon, { status: "warning", withSpace: !0 }), on],
            }),
          }),
        e(OrderedListWithItem, {
          onSelect: (p_1) => {
            let jt = _[p_1];
            if (!jt) return;
            (B(jt.name), setViewState_2("plugin-list"));
          },
          children: _.map((msg) =>
            e(
              OrderedListWithItem.Item,
              {
                label: stripInvisibleKeepEmoji(displayMarketplaceName(msg.name)),
                meta: [
                  `${msg.totalPlugins} ${plural(msg.totalPlugins, "plugin")} available`,
                  msg.installedCount > 0 ? `${msg.installedCount} already installed` : "",
                ],
                description: msg.source ? stripInvisibleKeepEmoji(msg.source) : void 0,
              },
              msg.name,
            ),
          ),
        }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: r(Byline, {
              children: [
                e(ConfigurableShortcutHint, {
                  action: "select:accept",
                  context: "Select",
                  fallback: "Enter",
                  description: "select",
                }),
                e(ConfigurableShortcutHint, {
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
    return r(Box, {
      flexDirection: "column",
      children: [
        mn &&
          e(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children: r(Text, {
              color: "warning",
              children: [e(StatusIcon, { status: "warning", withSpace: !0 }), mn],
            }),
          }),
        e(PluginSelectionKeyHint, {
          onEntryHelperShown: recordEntryHelperShown,
          title: "Plugin Details",
          plugin: selectedPlugin,
          extraSection: e(renderContextCost, { pluginId: selectedPlugin.pluginId }),
          installError: installError,
          isInstalling: isInstalling,
          onInstall: installPlugin,
          onBack: closeDetails,
          bylinePaddingLeft: 1,
        }),
      ],
    });
  if (pe.length === 0)
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Install plugins" }) }),
        QE() && me
          ? e(Box, {
              marginBottom: 1,
              children: e(HintText, {
                children: "Your organization's policy hides every plugin in this marketplace.",
              }),
            })
          : e(HintText, {
              hint: "All plugins from this marketplace are already installed.",
              children: "No new plugins available to install.",
            }),
        e(Box, {
          marginLeft: 3,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: e(ConfigurableShortcutHint, {
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
  return r(Box, {
    flexDirection: "column",
    width: "100%",
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: handleListKeyDown,
    onPaste: handleListPaste,
    children: [
      r(Box, {
        children: [
          e(Text, { bold: !0, children: "Install Plugins" }),
          pagination.needsPagination &&
            r(Text, {
              dimColor: !0,
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
      e(Box, { marginBottom: 1, flexDirection: "column", children: e(SearchBox, { ...searchBoxProps }) }),
      filteredPlugins.length === 0 &&
        searchQuery &&
        e(Box, {
          marginBottom: 1,
          children: r(HintText, { children: ['No plugins match "', searchQuery, '"'] }),
        }),
      pagination.scrollPosition.canScrollUp &&
        e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowUp, " more above"] }) }),
      visiblePlugins.map((plugin_6, visibleIndex) => {
        let actualIndex = pagination.toActualIndex(visibleIndex),
          Te = selectedIndex === actualIndex,
          isSelectedForInstall = selectedForInstall.has(plugin_6.pluginId),
          isInstalling_0 = installingPlugins.has(plugin_6.pluginId),
          Dt = visibleIndex === visiblePlugins.length - 1,
          wt = et?.get(plugin_6.pluginId);
        return r(
          TwoColumnRow,
          {
            active: Te && !isSearchMode,
            flexDirection: "column",
            marginBottom: Dt && !U ? 0 : 1,
            children: [
              r(Box, {
                children: [
                  r(Text, {
                    "aria-hidden": !0,
                    color: Te && !isSearchMode ? "suggestion" : void 0,
                    children: [Te && !isSearchMode ? re.pointer : " ", " "],
                  }),
                  r(Text, {
                    color: plugin_6.isInstalled ? "success" : void 0,
                    children: [
                      plugin_6.isInstalled
                        ? re.tick
                        : isInstalling_0
                          ? re.ellipsis
                          : isSelectedForInstall
                            ? re.radioOn
                            : re.radioOff,
                      " ",
                      getPluginDisplayName(plugin_6.entry),
                      plugin_6.entry.category &&
                        r(Text, {
                          dimColor: !0,
                          children: [" ", "[", stripInvisibleKeepEmoji(plugin_6.entry.category), "]"],
                        }),
                      plugin_6.entry.tags?.includes("community-managed") &&
                        e(Text, { dimColor: !0, children: " [Community Managed]" }),
                      isNonInstallableClaudeAiPlugin(plugin_6.entry) &&
                        e(Text, { dimColor: !0, children: " [not installable on claude.ai yet]" }),
                      e(ParenHint, { when: plugin_6.isInstalled, children: "installed" }),
                      wt !== void 0 &&
                        V === CLAUDE_PLUGINS_OFFICIAL &&
                        r(Text, { dimColor: !0, children: [" \xB7 ", formatInstallCount(wt), " installs"] }),
                    ],
                  }),
                ],
              }),
              plugin_6.entry.description &&
                r(Box, {
                  marginLeft: 4,
                  children: [
                    e(Text, {
                      dimColor: !0,
                      children: truncateToWidth(stripInvisibleKeepEmoji(plugin_6.entry.description), 60),
                    }),
                    plugin_6.entry.version &&
                      r(Text, {
                        dimColor: !0,
                        children: [" ", "\xB7 v", stripInvisibleKeepEmoji(plugin_6.entry.version)],
                      }),
                  ],
                }),
            ],
          },
          plugin_6.pluginId,
        );
      }),
      pagination.scrollPosition.canScrollDown &&
        e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowDown, " more below"] }) }),
      U &&
        e(Box, {
          marginTop: 1,
          children: r(Text, {
            color: "error",
            children: [e(StatusIcon, { status: "error", withSpace: !0 }), U],
          }),
        }),
      e(DiscoverPluginsKeyHint, { ...keyHintProps }),
    ],
  });
}

export { BrowseMarketplace, _h };
