/**
 * commands/plugin/DiscoverPluginsScreen.tsx
 *
 * 2.1.316 新增：/plugin 的"发现"页：插件列表、上下文成本估计、按目录推荐、策略屏蔽与目录加载失败处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (10)
 * attribution: placement 10
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { y, P, init_react_production, Q, R } from "../../../vendor/react/cjs/react.production.js";
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
import { count } from "../../utils/collections.js";
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
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isNonInstallableClaudeAiPlugin } from "../../utils/plugins/claudeAiMarketplaces.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getDisplayPath } from "../../utils/file.js";

//@ chunk-vrb44rx7.js:83483-84659 placement
/**
 * 显示插件的上下文成本估计（每轮、调用时的 token）。
 */
function renderContextCost(props) {
  let T = w(22);
  let { pluginId } = props;
  let { storageV5 } = useTheme_2();
  let [C, x] = y(null);
  let D;
  let U;
  if (T[0] !== pluginId || T[1] !== storageV5) {
    D = () => {
      x(null);
      let L = false;
      estimatePluginTokenCost(pluginId, getCanonicalName(getMainLoopModel()), storageV5)
        .then((A) => {
          if (!L) x(A);
        })
        .catch(noopBrowseMarketplaceHandler);
      return () => {
        L = true;
      };
    };
    U = [pluginId, storageV5];
    T[0] = pluginId;
    T[1] = storageV5;
    T[2] = D;
    T[3] = U;
  } else {
    D = T[2];
    U = T[3];
  }
  P(D, U);
  if (C === null) {
    return null;
  }
  let K = C.alwaysOn >= ESTIMATED_TOKENS_PER_COMPONENT;
  let V;
  if (T[4] !== C.isEstimate) {
    V =
      C.isEstimate &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (estimated)",
      });
    T[4] = C.isEstimate;
    T[5] = V;
  } else V = T[5];
  let B;
  if (T[6] !== V) {
    B = jsxProd_default_2(Text, {
      bold: true,
      children: ["Context cost", V, ":"],
    });
    T[6] = V;
    T[7] = B;
  } else B = T[7];
  const color = K ? "warning" : undefined;
  const dimColor = !K;
  let pe;
  if (T[8] !== C.alwaysOn) {
    pe = formatTokenEstimate(C.alwaysOn);
    T[8] = C.alwaysOn;
    T[9] = pe;
  } else pe = T[9];
  let fe;
  if (T[10] !== color || T[11] !== dimColor || T[12] !== pe) {
    fe = jsxProd_default_2(Text, {
      color,
      dimColor,
      children: ["\xB7 Every turn: ", pe, " tokens"],
    });
    T[10] = color;
    T[11] = dimColor;
    T[12] = pe;
    T[13] = fe;
  } else fe = T[13];
  let me;
  if (T[14] !== C.onInvoke) {
    me = formatTokenEstimate(C.onInvoke);
    T[14] = C.onInvoke;
    T[15] = me;
  } else me = T[15];
  let ne;
  if (T[16] !== me) {
    ne = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["\xB7 When invoked: ", me, " tokens"],
    });
    T[16] = me;
    T[17] = ne;
  } else ne = T[17];
  let he;
  if (T[18] !== ne || T[19] !== B || T[20] !== fe) {
    he = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [B, fe, ne],
    });
    T[18] = ne;
    T[19] = B;
    T[20] = fe;
    T[21] = he;
  } else he = T[21];
  return he;
}
//@ chunk-vrb44rx7.js:84659-84663 placement
init_react_production();
//@ chunk-vrb44rx7.js:84663-84684 placement
var selectResult = (i) => i.result;
//@ chunk-vrb44rx7.js:84684-94560 placement
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
  let [fe, me] = y([]);
  let [ne, he] = y(true);
  let [W, Oe] = y("Loading\u2026");
  let [rt, et] = y(null);
  let [je, ae] = y(new Map());
  let [Se, kt] = y(initialMarketplace ?? null);
  let Tt = Q(() => ALL_TAB_LABEL(fe), [fe]);
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
    availablePlugins: fe,
    loading: ne,
    searchMarketplaceName: true,
    marketplaceFilter: Se,
    onInstallComplete,
    onSearchModeChange,
  });
  let mn = R(false);
  P(() => {
    if (ne || mn.current || !initialSearchQuery || fe.length === 0) return;
    mn.current = true;
    setSearchQuery(initialSearchQuery);
    setIsSearchMode(true);
  }, [ne, initialSearchQuery, fe.length, setSearchQuery, setIsSearchMode]);
  P(() => {
    if (!ne && Se !== null && !Tt.some((Ce) => Ce.marketplace === Se)) kt(null);
  }, [ne, Se, Tt]);
  let [xn, Ln] = y(false);
  let Mn = xn && Tt.length > 2;
  MessageActionsKeybindings(
    {
      "plugin:cycleMarketplace": () => {
        kt((Ce) => {
          let index = Tt.findIndex((ke) => ke.marketplace === Ce);
          return Tt[(index + 1) % Tt.length]?.marketplace ?? null;
        });
      },
    },
    {
      context: "Plugin",
      isActive: viewState === "plugin-list" && !ne && Mn,
    },
  );
  let [fn, Be] = y(null);
  let [jt, le] = y(null);
  let [Te, Ue] = y(false);
  let [dt, Dt] = y(undefined);
  P(() => {
    let Ce = false;
    async function Ve() {
      let now = Date.now();
      try {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let { marketplaces, failures } = await loadMarketplacesWithErrors(
          knownMarketplacesWithDeclared,
          storageV5,
          "discover",
        );
        let pluginDirectoryState = await getPluginDirectoryState();
        let _t = pluginDirectoryState === "blocked";
        if (Ce) return;
        Ue(_t);
        Ln(pluginDirectoryState !== "unavailable");
        Dt(pluginDirectoryState === "on" ? commandSourceSession().staleCatalogFetchedAt : undefined);
        let Mt = [];
        let results = await Promise.all(
          marketplaces.map(async ({ name: de, data: Ge }) => ({
            name: de,
            entries: Ge
              ? await pluginInstallPath(de, Ge.plugins, knownMarketplacesWithDeclared, storageV5)
              : [],
          })),
        );
        if (Ce) return;
        for (let { name: de, entries } of results)
          for (let entry of entries) {
            let mt = formatPluginId(entry.name, de);
            Mt.push({
              entry,
              marketplaceName: de,
              pluginId: mt,
              isInstalled: isPluginInstalled(mt),
            });
          }
        let Nt = Mt;
        if (pluginDirectoryState !== "unavailable") {
          let de = await allowlistedInstalledPlugins(knownMarketplacesWithDeclared, storageV5);
          if (Ce) return;
          Nt = dedupeListedPlugins(
            groupBySource(
              markFromPluginDirectory(Mt, knownMarketplacesWithDeclared),
              knownMarketplacesWithDeclared,
              de,
            ),
            knownMarketplacesWithDeclared,
          );
        }
        let filtered = Nt.filter((de) => !de.isInstalled);
        let filtered_2 = filtered.filter(
          (de) =>
            !isPluginBlockedByPolicy(de.pluginId) &&
            !(de.installCountIds ?? []).some(isPluginBlockedByPolicy),
        );
        let found = marketplaces.find(
          (marketplace) =>
            marketplace.name === OFFICIAL_MARKETPLACE_NAME &&
            marketplace.config.source !== undefined &&
            isPluginDirectorySource(marketplace.config.source),
        );
        let Un =
          filtered.length -
          filtered_2.length +
          (found?.data
            ? Math.max(0, (commandSourceSession().catalogEntryNames?.size ?? 0) - found.data.plugins.length)
            : 0);
        try {
          let uniqueInstallCounts = await getUniqueInstallCounts(storageV5);
          if (Ce) return;
          et(uniqueInstallCounts);
          sortPluginsByPopularity(filtered_2, uniqueInstallCounts);
        } catch (error) {
          logForDebugging(`Failed to fetch install counts: ${errorMessage(error)}`);
          sortPluginsByPopularity(filtered_2, null);
        }
        let An = new Map();
        try {
          let de = getSessionContext?.();
          let Ge = new Set(getPluginSuggestionMarketplaces());
          for (let Ne of filtered_2) {
            if (!isListedInKnownMarketplace(Ne, Ge, knownMarketplacesWithDeclared)) continue;
            let mt = hasRelevanceSignals(Ne.entry.name, Ne.entry.relevance);
            if (!mt) continue;
            if (
              [Ne.pluginId, ...(Ne.installCountIds ?? [])].some(
                (Pt) => pluginSuggestionDiscoverShownCount(Pt) > 0,
              ) &&
              !grantedSuggestions?.has(Ne.pluginId)
            )
              continue;
            let en = await matchRelevanceSignal(mt, de);
            if (en) An.set(Ne.pluginId, en);
          }
        } catch (error) {
          logForDebugging(`Failed to compute plugin suggestions: ${errorMessage(error)}`);
        }
        if (Ce) return;
        ae(An);
        let Bn =
          An.size > 0
            ? [
                ...filtered_2.filter((de) => An.has(de.pluginId)),
                ...filtered_2.filter((de) => !An.has(de.pluginId)),
              ]
            : filtered_2;
        me(Bn);
        let configuredMarketplaceCount = count(
          Object.values(knownMarketplacesWithDeclared),
          (de) => !(_t && de.source !== undefined && isPluginDirectorySource(de.source)),
        );
        if (filtered_2.length === 0) {
          let emptyMarketplaceReason = await detectEmptyMarketplaceReason({
            configuredMarketplaceCount,
            failedMarketplaceCount: filterSuccessfulMarketplaces(failures).length,
          });
          if (Ce) return;
          if (
            emptyMarketplaceReason === "all-plugins-installed" &&
            Mt.length > 0 &&
            Mt.every((Ge) => Ge.isInstalled && !isPluginGloballyInstalled(Ge.pluginId)) &&
            !Mt.some((Ge) => isPluginBlockedByPolicy(Ge.pluginId))
          )
            emptyMarketplaceReason = "all-plugins-project-installed";
          le(
            pluginDirectoryState !== "unavailable" &&
              emptyMarketplaceReason === "all-plugins-installed" &&
              Un > 0
              ? "all-hidden-by-policy"
              : emptyMarketplaceReason === "all-marketplaces-failed" && onlyPluginDirectoryFailed(failures)
                ? "directory-failed"
                : emptyMarketplaceReason,
          );
        }
        let successCount = count(marketplaces, (de) => de.data !== null);
        let At = formatMarketplaceLoadingErrors(failures, successCount);
        if (At)
          if (At.type === "warning")
            Be(
              filterSuccessfulMarketplaces(failures).length === 0
                ? At.message
                : At.message + (filtered_2.length > 0 ? ". Showing available plugins." : "."),
            );
          else throw Error(At.message);
        if (targetPlugin === undefined) {
          let de = markDiscoverLoaded();
          logDiscoverShown({
            directoryRows: count(filtered_2, (Ge) => Ge.fromPluginDirectory === true),
            totalRows: filtered_2.length,
            foldedRows: count(filtered_2, (Ge) => Ge.installCountIds !== undefined),
            loadMs: Date.now() - now,
            entry: de ? "tab_return" : initialMarketplace === undefined ? "menu" : "directory_command",
            directoryState:
              pluginDirectoryState === "on" && !found?.data ? "unavailable" : pluginDirectoryState,
            knownMarketplaceCount: count(
              Object.values(knownMarketplacesWithDeclared),
              (Ge) => Ge.source === undefined || !isPluginDirectorySource(Ge.source),
            ),
          });
        }
        if (targetPlugin) {
          let de =
            Nt.find((Pt) => Pt.entry.name === targetPlugin) ??
            Mt.find((Pt) => Pt.entry.name === targetPlugin);
          let Ge = false;
          let Ne = false;
          let mt = false;
          let en = false;
          if (!de) {
            for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
              Oe(`Checking ${displayTextOrRaw(key)} for new plugins\u2026`);
              let bn = await refreshMarketplaceOnCatalogMiss(key, value, storageV5);
              if (Ce) return;
              if (bn === "refresh-failed") Ne = true;
              else if (bn === "refreshed") en = true;
              if (bn !== "refreshed") continue;
              try {
                let found = (await getMarketplace(key, storageV5)).plugins.find(
                  (plugin) => plugin.name === targetPlugin,
                );
                if (found) {
                  let Ft = formatPluginId(found.name, key);
                  let [po] = await pluginInstallPath(key, [found], knownMarketplacesWithDeclared, storageV5);
                  de = {
                    entry: po ?? found,
                    marketplaceName: key,
                    pluginId: Ft,
                    isInstalled: isPluginInstalled(Ft),
                  };
                  Ge = true;
                  logFeatureOk("plugin_install_catalog_refresh");
                  break;
                }
              } catch (error) {
                mt = true;
                logForDebugging(
                  `Post-refresh reload of marketplace '${key}' failed: ${errorMessage(error)}`,
                  {
                    level: "warn",
                  },
                );
              }
              if (Ce) return;
            }
            if (!Ge)
              if (Ne) logFeatureBad("plugin_install_catalog_refresh", "refresh_failed");
              else if (mt) logFeatureBad("plugin_install_catalog_refresh", "reload_failed");
              else if (en) logFeatureSad("plugin_install_catalog_refresh", "not_found_after_refresh");
              else logFeatureSad("plugin_install_catalog_refresh", "ineligible");
          }
          if (Ce) return;
          if (de && pluginDirectoryState !== "unavailable")
            de = markFromPluginDirectory([de], knownMarketplacesWithDeclared)[0] ?? de;
          if (Ge && de && !de.isInstalled && !isPluginBlockedByPolicy(de.pluginId)) {
            let Pt = de;
            me((kn) => (kn.some((bn) => bn.pluginId === Pt.pluginId) ? kn : [...kn, Pt]));
          }
          if (de) {
            if (isPluginGloballyInstalled(de.pluginId)) {
              let Pt = await installMissingDependencies(de.pluginId, storageV5);
              let kn = await savePluginOptions(de.pluginId, Pt, storageV5, credentials);
              if (Ce) return;
              if (kn) setViewState_2(kn);
              else if (Pt === null)
                setError(
                  `Plugin '${de.pluginId}' is already installed. Use '/plugin' to manage existing plugins.`,
                );
              else if (Pt.changed) {
                let bn = await onInstallComplete?.([de.pluginId]);
                if (Ce) return;
                setResult(
                  `Plugin "${de.pluginId}" is already installed${Pt.suffix}${bn === "load-failed" ? ". The plugin couldn't be loaded \u2014 see /plugin for details." : ""}`,
                );
              } else setResult(`Plugin "${de.pluginId}" is already installed${Pt.suffix}`);
            } else openDetails(de);
          } else setError(`Plugin "${targetPlugin}" not found in any marketplace`);
        }
      } catch (error) {
        if (Ce) return;
        setError(error instanceof Error ? error.message : "Failed to load plugins");
      } finally {
        if (!Ce) he(false);
      }
    }
    Ve();
    return () => {
      Ce = true;
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
  let wt = R(false);
  P(() => {
    if (
      wt.current ||
      ne ||
      storeSelector !== null ||
      storeSelector_2 !== null ||
      viewState !== "plugin-list" ||
      je.size === 0
    )
      return;
    wt.current = true;
    let Ce = [...je.keys()];
    for (let Ve of Ce) grantedSuggestions?.add(Ve);
    recordPluginSuggestionShown(
      Ce.flatMap((Ve) => [Ve, ...(fe.find((ke) => ke.pluginId === Ve)?.installCountIds ?? [])]),
      storageV5,
    );
  }, [fe, ne, storeSelector, storeSelector_2, viewState, je, grantedSuggestions, storageV5]);
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
      onFinish: (Ce) => {
        setResult(Ce);
        setViewState({
          type: "menu",
        });
      },
    });
  if (ne)
    return jsxProd_default(WorkerBadge, {
      message: W,
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
  if (fe.length === 0)
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
        fn &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(StatusRow, {
              status: "warning",
              children: fn,
            }),
          }),
        jsxProd_default(renderEmptyDiscoverState, {
          reason: jt,
        }),
        Te
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
        marginBottom: Mn || Te ? 0 : 1,
        flexDirection: "column",
        children: jsxProd_default(SearchBox, {
          ...searchBoxProps,
        }),
      }),
      Mn
        ? jsxProd_default(Box, {
            marginBottom: Te ? 0 : 1,
            marginLeft: 1,
            children: jsxProd_default_2(Text, {
              children: [
                pickShownMarketplaces(Tt, Se).map((Ce, Ve) => {
                  let ke = Ce.marketplace === Se;
                  return jsxProd_default_2(
                    Text,
                    {
                      children: [
                        Ve > 0 &&
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: " \xB7 ",
                          }),
                        jsxProd_default_2(Text, {
                          bold: ke,
                          color: ke ? "suggestion" : undefined,
                          dimColor: !ke,
                          children: [stripInvisibleKeepEmoji(Ce.label), " ", Ce.count],
                        }),
                      ],
                    },
                    Ce.marketplace ?? "",
                  );
                }),
                Tt.length > MAX_SHOWN_MARKETPLACES &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" ", "\xB7 +", Tt.length - MAX_SHOWN_MARKETPLACES, " more"],
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
      Te
        ? jsxProd_default(Box, {
            marginBottom: 1,
            marginLeft: 1,
            children: jsxProd_default(formatBlockedByOrg, {}),
          })
        : null,
      dt !== undefined
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
                Number.isNaN(Date.parse(dt))
                  ? "an earlier session"
                  : formatRelativeTimeAgo(new Date(dt), {
                      style: "long",
                    }),
                ".",
              ],
            }),
          })
        : null,
      fn &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(StatusRow, {
            status: "warning",
            children: fn,
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
      visibleItems.map((Ce, Ve) => {
        let ke = pagination.toActualIndex(Ve);
        let ht = selectedIndex === ke;
        let Jt = selectedForInstall.has(Ce.pluginId);
        let qt = installingPlugins.has(Ce.pluginId);
        let count = getPluginInstallCount(Ce, rt);
        let _t = Ce.entry.description || (xn ? pluginSourceLink(Ce) : undefined);
        let Mt = je.get(Ce.pluginId);
        let hn = Ve === visibleItems.length - 1;
        return jsxProd_default_2(
          TwoColumnRow,
          {
            active: ht && !isSearchMode,
            flexDirection: "column",
            marginBottom: hn ? 0 : 1,
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    "aria-hidden": true,
                    color: ht && !isSearchMode ? "suggestion" : undefined,
                    children: [ht && !isSearchMode ? figures_default.pointer : " ", " "],
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      qt ? figures_default.ellipsis : Jt ? figures_default.radioOn : figures_default.radioOff,
                      " ",
                      getPluginDisplayName(Ce.entry),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [" ", "\xB7 ", stripInvisibleKeepEmoji(marketplaceLabel_2(Ce))],
                      }),
                      Mt &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" ", "\xB7 ", formatSuggestedFor(Mt)],
                        }),
                      Ce.entry.tags?.includes("community-managed") &&
                        Ce.marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [Community Managed]",
                        }),
                      isNonInstallableClaudeAiPlugin(Ce.entry) &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " [not installable on claude.ai yet]",
                        }),
                      count !== undefined &&
                        (Ce.marketplaceName === CLAUDE_PLUGINS_OFFICIAL ||
                          Ce.alsoListedIn?.includes(CLAUDE_PLUGINS_OFFICIAL)) &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" \xB7 ", formatInstallCount(count), " installs"],
                        }),
                    ],
                  }),
                ],
              }),
              _t &&
                jsxProd_default(Box, {
                  marginLeft: 4,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: truncateToWidth(stripInvisibleKeepEmoji(_t), 60),
                  }),
                }),
            ],
          },
          `${pagination.startIndex}-${Ce.pluginId}`,
        );
      }),
      pagination.scrollPosition.canScrollDown &&
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", figures_default.arrowDown, " more below"],
          }),
        }),
      jsxProd_default(DiscoverPluginsKeyHint, {
        ...keyHintProps,
      }),
    ],
  });
}
//@ chunk-vrb44rx7.js:94560-94764 placement
function formatBlockedByOrg() {
  let i = w(2);
  let h;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    h = pluginDirectoryPolicyBlockHint();
    i[0] = h;
  } else h = i[0];
  let k = h;
  let C;
  if (i[1] === MEMO_CACHE_SENTINEL) {
    C = jsxProd_default_2(Text, {
      dimColor: true,
      children: [OFFICIAL_MARKETPLACE_DISPLAY, " is blocked by your organization.", k === "" ? "" : ` ${k}`],
    });
    i[1] = C;
  } else C = i[1];
  return C;
}
//@ chunk-vrb44rx7.js:94764-96832 placement
/**
 * 发现页空状态（目录未加载、全部已安装、被策略隐藏、市场加载失败）。
 */
function renderEmptyDiscoverState(props) {
  let k = w(9);
  let { reason } = props;
  switch (reason) {
    case "directory-failed": {
      let C;
      if (k[0] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["No plugins to show until the", " ", OFFICIAL_MARKETPLACE_DISPLAY, " loads."],
        });
        k[0] = C;
      } else C = k[0];
      return C;
    }
    case "all-hidden-by-policy": {
      let C;
      if (k[1] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default(Text, {
          dimColor: true,
          children: "Your organization's policy hides every plugin that would be listed here.",
        });
        k[1] = C;
      } else C = k[1];
      return C;
    }
    case "git-not-installed": {
      let C;
      if (k[2] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[2] = C;
      } else C = k[2];
      return C;
    }
    case "all-blocked-by-policy": {
      let C;
      if (k[3] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[3] = C;
      } else C = k[3];
      return C;
    }
    case "policy-restricts-sources": {
      let C;
      if (k[4] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[4] = C;
      } else C = k[4];
      return C;
    }
    case "all-marketplaces-failed": {
      let C;
      if (k[5] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[5] = C;
      } else C = k[5];
      return C;
    }
    case "all-plugins-installed": {
      let C;
      if (k[6] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[6] = C;
      } else C = k[6];
      return C;
    }
    case "all-plugins-project-installed": {
      let C;
      if (k[7] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default_2(Fragment, {
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
        k[7] = C;
      } else C = k[7];
      return C;
    }
    case "no-marketplaces-configured":
    default: {
      let C;
      if (k[8] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default(HintText, {
          hint: "Add a marketplace first using the Marketplaces tab.",
          children: "No plugins available.",
        });
        k[8] = C;
      } else C = k[8];
      return C;
    }
  }
}
//@ chunk-vrb44rx7.js:96832-96842 placement
var MAX_SUGGESTION_LABEL_WIDTH = 32;
//@ chunk-vrb44rx7.js:96842-97141 placement
function formatSuggestedFor(i) {
  switch (i.signal) {
    case "cwd":
      return "suggested for this directory";
    case "cli":
      return `suggested for ${truncateToWidth(i.command, MAX_SUGGESTION_LABEL_WIDTH)} commands`;
    case "hosts":
      return `suggested for ${truncateToWidth(i.host, MAX_SUGGESTION_LABEL_WIDTH)}`;
    case "filesRead":
      return `suggested for ${displayPathForSuggestion(i.file)}`;
    case "manifestDep":
      return `suggested from ${displayPathForSuggestion(i.file)}`;
  }
}
//@ chunk-vrb44rx7.js:97141-97197 placement
function displayPathForSuggestion(file) {
  return truncatePathMiddle(getDisplayPath(file).replaceAll("\\", "/"), MAX_SUGGESTION_LABEL_WIDTH);
}
//@ chunk-vrb44rx7.js:97197-97201 placement
init_react_production();
export { DiscoverPluginsScreen, renderContextCost };
