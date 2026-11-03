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
import { Me } from "../../components/design-system/ThemeProvider.js";
import { y, P, j, Q, R } from "../../../vendor/react/cjs/react.production.js";
import {
  estimatePluginTokenCost,
  OWo,
  getUniqueInstallCounts,
  formatInstallCount,
} from "../../utils/plugins/installCounts.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { _h } from "./BrowseMarketplace.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  formatTokenEstimate,
  formatRelativeTimeAgo,
  truncateToWidth,
  truncatePathMiddle,
} from "../../utils/format.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { ii } from "./PluginDetails.js";
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
import { kk } from "../../utils/plugins/commandSourceErrors.js";
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
  marketplaceLabel,
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
import { b1s, recordPluginSuggestionShown } from "../../services/tips/tipIds.js";
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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isNonInstallableClaudeAiPlugin } from "../../utils/plugins/claudeAiMarketplaces.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getDisplayPath } from "../../utils/file.js";

/**
 * 显示插件的上下文成本估计（每轮、调用时的 token）。
 */
//@ chunk-vrb44rx7.js:83483-84659 placement
function renderContextCost(i) {
  let T = w(22),
    { pluginId: pluginId } = i,
    { storageV5: storageV5 } = Me(),
    [C, x] = y(null),
    D,
    U;
  if (T[0] !== pluginId || T[1] !== storageV5)
    ((D = () => {
      x(null);
      let L = !1;
      return (
        estimatePluginTokenCost(pluginId, getCanonicalName(getMainLoopModel()), storageV5)
          .then((A) => {
            if (!L) x(A);
          })
          .catch(_h),
        () => {
          L = !0;
        }
      );
    }),
      (U = [pluginId, storageV5]),
      (T[0] = pluginId),
      (T[1] = storageV5),
      (T[2] = D),
      (T[3] = U));
  else ((D = T[2]), (U = T[3]));
  if ((P(D, U), C === null)) {
    return null;
  }
  let K = C.alwaysOn >= OWo,
    V;
  if (T[4] !== C.isEstimate)
    ((V = C.isEstimate && e(Text, { dimColor: !0, children: " (estimated)" })),
      (T[4] = C.isEstimate),
      (T[5] = V));
  else V = T[5];
  let B;
  if (T[6] !== V) ((B = r(Text, { bold: !0, children: ["Context cost", V, ":"] })), (T[6] = V), (T[7] = B));
  else B = T[7];
  const _ = K ? "warning" : void 0,
    J = !K;
  let pe;
  if (T[8] !== C.alwaysOn) ((pe = formatTokenEstimate(C.alwaysOn)), (T[8] = C.alwaysOn), (T[9] = pe));
  else pe = T[9];
  let fe;
  if (T[10] !== _ || T[11] !== J || T[12] !== pe)
    ((fe = r(Text, { color: _, dimColor: J, children: ["\xB7 Every turn: ", pe, " tokens"] })),
      (T[10] = _),
      (T[11] = J),
      (T[12] = pe),
      (T[13] = fe));
  else fe = T[13];
  let me;
  if (T[14] !== C.onInvoke) ((me = formatTokenEstimate(C.onInvoke)), (T[14] = C.onInvoke), (T[15] = me));
  else me = T[15];
  let ne;
  if (T[16] !== me)
    ((ne = r(Text, { dimColor: !0, children: ["\xB7 When invoked: ", me, " tokens"] })),
      (T[16] = me),
      (T[17] = ne));
  else ne = T[17];
  let he;
  if (T[18] !== ne || T[19] !== B || T[20] !== fe)
    ((he = r(Box, { flexDirection: "column", marginBottom: 1, children: [B, fe, ne] })),
      (T[18] = ne),
      (T[19] = B),
      (T[20] = fe),
      (T[21] = he));
  else he = T[21];
  return he;
}
//@ chunk-vrb44rx7.js:84659-84663 placement
j();
//@ chunk-vrb44rx7.js:84663-84684 placement
var Bh = (i) => i.result;
/**
 * 发现页主组件：加载市场与安装量、计算推荐、搜索与安装（约 10 KB）。
 */
//@ chunk-vrb44rx7.js:84684-94560 placement
function DiscoverPluginsScreen({
  screen: screen,
  onInstallComplete: onInstallComplete,
  onSearchModeChange: onSearchModeChange,
  getSessionContext: getSessionContext,
  grantedSuggestions: grantedSuggestions,
  targetPlugin: targetPlugin,
  initialMarketplace: initialMarketplace,
  initialSearchQuery: initialSearchQuery,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    K = useStoreSelector(screen, ii),
    V = useStoreSelector(screen, Bh),
    { setError: setError, setResult: setResult, markDiscoverLoaded: markDiscoverLoaded } = screen,
    setViewState = screen.setViewState,
    [fe, me] = y([]),
    [ne, he] = y(!0),
    [W, Oe] = y("Loading\u2026"),
    [rt, et] = y(null),
    [je, ae] = y(new Map()),
    [Se, kt] = y(initialMarketplace ?? null),
    Tt = Q(() => ALL_TAB_LABEL(fe), [fe]),
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
      selectedForInstall: selectedForInstall,
      installingPlugins: installingPlugins,
      pagination: pagination,
      installPlugin: installPlugin,
      isInstalling: isInstalling,
      installError: installError,
      handleListKeyDown: handleListKeyDown,
      handleListPaste: handleListPaste,
    } = DiscoverPlugins({
      screen: screen,
      surface: "discover",
      initialViewState: "plugin-list",
      availablePlugins: fe,
      loading: ne,
      searchMarketplaceName: !0,
      marketplaceFilter: Se,
      onInstallComplete: onInstallComplete,
      onSearchModeChange: onSearchModeChange,
    }),
    mn = R(!1);
  (P(() => {
    if (ne || mn.current || !initialSearchQuery || fe.length === 0) return;
    ((mn.current = !0), setSearchQuery(initialSearchQuery), setIsSearchMode(!0));
  }, [ne, initialSearchQuery, fe.length, setSearchQuery, setIsSearchMode]),
    P(() => {
      if (!ne && Se !== null && !Tt.some((Ce) => Ce.marketplace === Se)) kt(null);
    }, [ne, Se, Tt]));
  let [xn, Ln] = y(!1),
    Mn = xn && Tt.length > 2;
  MessageActionsKeybindings(
    {
      "plugin:cycleMarketplace": () => {
        kt((Ce) => {
          let index = Tt.findIndex((ke) => ke.marketplace === Ce);
          return Tt[(index + 1) % Tt.length]?.marketplace ?? null;
        });
      },
    },
    { context: "Plugin", isActive: viewState === "plugin-list" && !ne && Mn },
  );
  let [fn, Be] = y(null),
    [jt, le] = y(null),
    [Te, Ue] = y(!1),
    [dt, Dt] = y(void 0);
  P(() => {
    let Ce = !1;
    async function Ve() {
      let now = Date.now();
      try {
        let ht = await loadKnownMarketplacesWithDeclared(storageV5),
          { marketplaces: marketplaces, failures: failures } = await loadMarketplacesWithErrors(
            ht,
            storageV5,
            "discover",
          ),
          xt = await getPluginDirectoryState(),
          _t = xt === "blocked";
        if (Ce) return;
        (Ue(_t), Ln(xt !== "unavailable"), Dt(xt === "on" ? kk().staleCatalogFetchedAt : void 0));
        let Mt = [],
          results = await Promise.all(
            marketplaces.map(async ({ name: de, data: Ge }) => ({
              name: de,
              entries: Ge ? await pluginInstallPath(de, Ge.plugins, ht, storageV5) : [],
            })),
          );
        if (Ce) return;
        for (let { name: de, entries: entries } of results)
          for (let Ne of entries) {
            let mt = formatPluginId(Ne.name, de);
            Mt.push({ entry: Ne, marketplaceName: de, pluginId: mt, isInstalled: isPluginInstalled(mt) });
          }
        let Nt = Mt;
        if (xt !== "unavailable") {
          let de = await allowlistedInstalledPlugins(ht, storageV5);
          if (Ce) return;
          Nt = dedupeListedPlugins(groupBySource(markFromPluginDirectory(Mt, ht), ht, de), ht);
        }
        let filtered = Nt.filter((de) => !de.isInstalled),
          filtered_2 = filtered.filter(
            (de) =>
              !isPluginBlockedByPolicy(de.pluginId) &&
              !(de.installCountIds ?? []).some(isPluginBlockedByPolicy),
          ),
          found = marketplaces.find(
            (de) =>
              de.name === OFFICIAL_MARKETPLACE_NAME &&
              de.config.source !== void 0 &&
              isPluginDirectorySource(de.config.source),
          ),
          Un =
            filtered.length -
            filtered_2.length +
            (found?.data ? Math.max(0, (kk().catalogEntryNames?.size ?? 0) - found.data.plugins.length) : 0);
        try {
          let de = await getUniqueInstallCounts(storageV5);
          if (Ce) return;
          (et(de), sortPluginsByPopularity(filtered_2, de));
        } catch (error) {
          (logForDebugging(`Failed to fetch install counts: ${errorMessage(error)}`),
            sortPluginsByPopularity(filtered_2, null));
        }
        let An = new Map();
        try {
          let de = getSessionContext?.(),
            Ge = new Set(getPluginSuggestionMarketplaces());
          for (let Ne of filtered_2) {
            if (!isListedInKnownMarketplace(Ne, Ge, ht)) continue;
            let mt = hasRelevanceSignals(Ne.entry.name, Ne.entry.relevance);
            if (!mt) continue;
            if (
              [Ne.pluginId, ...(Ne.installCountIds ?? [])].some((Pt) => b1s(Pt) > 0) &&
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
        let Tn = count(
          Object.values(ht),
          (de) => !(_t && de.source !== void 0 && isPluginDirectorySource(de.source)),
        );
        if (filtered_2.length === 0) {
          let de = await detectEmptyMarketplaceReason({
            configuredMarketplaceCount: Tn,
            failedMarketplaceCount: filterSuccessfulMarketplaces(failures).length,
          });
          if (Ce) return;
          if (
            de === "all-plugins-installed" &&
            Mt.length > 0 &&
            Mt.every((Ge) => Ge.isInstalled && !isPluginGloballyInstalled(Ge.pluginId)) &&
            !Mt.some((Ge) => isPluginBlockedByPolicy(Ge.pluginId))
          )
            de = "all-plugins-project-installed";
          le(
            xt !== "unavailable" && de === "all-plugins-installed" && Un > 0
              ? "all-hidden-by-policy"
              : de === "all-marketplaces-failed" && onlyPluginDirectoryFailed(failures)
                ? "directory-failed"
                : de,
          );
        }
        let ze = count(marketplaces, (de) => de.data !== null),
          At = formatMarketplaceLoadingErrors(failures, ze);
        if (At)
          if (At.type === "warning")
            Be(
              filterSuccessfulMarketplaces(failures).length === 0
                ? At.message
                : At.message + (filtered_2.length > 0 ? ". Showing available plugins." : "."),
            );
          else throw Error(At.message);
        if (targetPlugin === void 0) {
          let de = markDiscoverLoaded();
          logDiscoverShown({
            directoryRows: count(filtered_2, (Ge) => Ge.fromPluginDirectory === !0),
            totalRows: filtered_2.length,
            foldedRows: count(filtered_2, (Ge) => Ge.installCountIds !== void 0),
            loadMs: Date.now() - now,
            entry: de ? "tab_return" : initialMarketplace === void 0 ? "menu" : "directory_command",
            directoryState: xt === "on" && !found?.data ? "unavailable" : xt,
            knownMarketplaceCount: count(
              Object.values(ht),
              (Ge) => Ge.source === void 0 || !isPluginDirectorySource(Ge.source),
            ),
          });
        }
        if (targetPlugin) {
          let de =
              Nt.find((Pt) => Pt.entry.name === targetPlugin) ??
              Mt.find((Pt) => Pt.entry.name === targetPlugin),
            Ge = !1,
            Ne = !1,
            mt = !1,
            en = !1;
          if (!de) {
            for (let [Pt, kn] of Object.entries(ht)) {
              Oe(`Checking ${displayTextOrRaw(Pt)} for new plugins\u2026`);
              let bn = await refreshMarketplaceOnCatalogMiss(Pt, kn, storageV5);
              if (Ce) return;
              if (bn === "refresh-failed") Ne = !0;
              else if (bn === "refreshed") en = !0;
              if (bn !== "refreshed") continue;
              try {
                let found = (await getMarketplace(Pt, storageV5)).plugins.find(
                  (plugin) => plugin.name === targetPlugin,
                );
                if (found) {
                  let Ft = formatPluginId(found.name, Pt),
                    [po] = await pluginInstallPath(Pt, [found], ht, storageV5);
                  ((de = {
                    entry: po ?? found,
                    marketplaceName: Pt,
                    pluginId: Ft,
                    isInstalled: isPluginInstalled(Ft),
                  }),
                    (Ge = !0),
                    logFeatureOk("plugin_install_catalog_refresh"));
                  break;
                }
              } catch (error) {
                ((mt = !0),
                  logForDebugging(
                    `Post-refresh reload of marketplace '${Pt}' failed: ${errorMessage(error)}`,
                    { level: "warn" },
                  ));
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
          if (de && xt !== "unavailable") de = markFromPluginDirectory([de], ht)[0] ?? de;
          if (Ge && de && !de.isInstalled && !isPluginBlockedByPolicy(de.pluginId)) {
            let Pt = de;
            me((kn) => (kn.some((bn) => bn.pluginId === Pt.pluginId) ? kn : [...kn, Pt]));
          }
          if (de)
            if (isPluginGloballyInstalled(de.pluginId)) {
              let Pt = await installMissingDependencies(de.pluginId, storageV5),
                kn = await savePluginOptions(de.pluginId, Pt, storageV5, credentials);
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
          else setError(`Plugin "${targetPlugin}" not found in any marketplace`);
        }
      } catch (error) {
        if (Ce) return;
        setError(error instanceof Error ? error.message : "Failed to load plugins");
      } finally {
        if (!Ce) he(!1);
      }
    }
    return (
      Ve(),
      () => {
        Ce = !0;
      }
    );
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
  let wt = R(!1);
  if (
    (P(() => {
      if (wt.current || ne || K !== null || V !== null || viewState !== "plugin-list" || je.size === 0)
        return;
      wt.current = !0;
      let Ce = [...je.keys()];
      for (let Ve of Ce) grantedSuggestions?.add(Ve);
      recordPluginSuggestionShown(
        Ce.flatMap((Ve) => [Ve, ...(fe.find((ke) => ke.pluginId === Ve)?.installCountIds ?? [])]),
        storageV5,
      );
    }, [fe, ne, K, V, viewState, je, grantedSuggestions, storageV5]),
    useKeybinding("confirm:no", closeDetails, {
      context: "Settings",
      isActive: viewState === "plugin-details",
    }),
    useKeybinding(
      "confirm:no",
      () => {
        setViewState({ type: "menu" });
      },
      { context: "Settings", isActive: viewState === "plugin-list" && !isSearchMode },
    ),
    typeof viewState === "object" && viewState.type === "plugin-options")
  )
    return e(formatInstallOutcome, {
      viewState: viewState,
      onInstallComplete: onInstallComplete,
      onFinish: (Ce) => {
        (setResult(Ce), setViewState({ type: "menu" }));
      },
    });
  if (ne) return e(WorkerBadge, { message: W });
  if (K) return e(ErrorText, { error: K });
  if (viewState === "plugin-details" && selectedPlugin)
    return e(PluginSelectionKeyHint, {
      onEntryHelperShown: recordEntryHelperShown,
      title: "Plugin details",
      plugin: selectedPlugin,
      showMarketplace: !0,
      installError: installError,
      isInstalling: isInstalling,
      onInstall: installPlugin,
      onBack: closeDetails,
    });
  if (fe.length === 0)
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Discover plugins" }) }),
        fn && e(Box, { marginBottom: 1, children: e(StatusRow, { status: "warning", children: fn }) }),
        e(renderEmptyDiscoverState, { reason: jt }),
        Te ? e(Box, { marginTop: 1, children: e(formatBlockedByOrg, {}) }) : null,
        e(Box, {
          marginTop: 1,
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
  let visibleItems = pagination.getVisibleItems(filteredPlugins);
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
          e(Text, { bold: !0, children: "Discover plugins" }),
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
      e(Box, {
        marginBottom: Mn || Te ? 0 : 1,
        flexDirection: "column",
        children: e(SearchBox, { ...searchBoxProps }),
      }),
      Mn
        ? e(Box, {
            marginBottom: Te ? 0 : 1,
            marginLeft: 1,
            children: r(Text, {
              children: [
                pickShownMarketplaces(Tt, Se).map((Ce, Ve) => {
                  let ke = Ce.marketplace === Se;
                  return r(
                    Text,
                    {
                      children: [
                        Ve > 0 && e(Text, { dimColor: !0, children: " \xB7 " }),
                        r(Text, {
                          bold: ke,
                          color: ke ? "suggestion" : void 0,
                          dimColor: !ke,
                          children: [stripInvisibleKeepEmoji(Ce.label), " ", Ce.count],
                        }),
                      ],
                    },
                    Ce.marketplace ?? "",
                  );
                }),
                Tt.length > MAX_SHOWN_MARKETPLACES &&
                  r(Text, {
                    dimColor: !0,
                    children: [" ", "\xB7 +", Tt.length - MAX_SHOWN_MARKETPLACES, " more"],
                  }),
                r(Text, {
                  dimColor: !0,
                  children: [
                    "  ",
                    e(ConfigurableShortcutHint, {
                      action: "plugin:cycleMarketplace",
                      context: "Plugin",
                      fallback: "ctrl+s",
                      description: "filter by marketplace",
                      parens: !0,
                    }),
                  ],
                }),
              ],
            }),
          })
        : null,
      Te ? e(Box, { marginBottom: 1, marginLeft: 1, children: e(formatBlockedByOrg, {}) }) : null,
      dt !== void 0
        ? e(Box, {
            marginBottom: 1,
            marginLeft: 1,
            children: r(Text, {
              dimColor: !0,
              children: [
                "The ",
                OFFICIAL_MARKETPLACE_DISPLAY,
                " could not be reached; showing the list from",
                " ",
                Number.isNaN(Date.parse(dt))
                  ? "an earlier session"
                  : formatRelativeTimeAgo(new Date(dt), { style: "long" }),
                ".",
              ],
            }),
          })
        : null,
      fn && e(Box, { marginBottom: 1, children: e(StatusRow, { status: "warning", children: fn }) }),
      filteredPlugins.length === 0 &&
        searchQuery &&
        e(Box, {
          marginBottom: 1,
          children: r(HintText, { children: ['No plugins match "', searchQuery, '"'] }),
        }),
      pagination.scrollPosition.canScrollUp &&
        e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowUp, " more above"] }) }),
      visibleItems.map((Ce, Ve) => {
        let toActualIndex = pagination.toActualIndex(Ve),
          ht = selectedIndex === toActualIndex,
          Jt = selectedForInstall.has(Ce.pluginId),
          qt = installingPlugins.has(Ce.pluginId),
          xt = getPluginInstallCount(Ce, rt),
          _t = Ce.entry.description || (xn ? pluginSourceLink(Ce) : void 0),
          Mt = je.get(Ce.pluginId),
          hn = Ve === visibleItems.length - 1;
        return r(
          TwoColumnRow,
          {
            active: ht && !isSearchMode,
            flexDirection: "column",
            marginBottom: hn ? 0 : 1,
            children: [
              r(Box, {
                children: [
                  r(Text, {
                    "aria-hidden": !0,
                    color: ht && !isSearchMode ? "suggestion" : void 0,
                    children: [ht && !isSearchMode ? re.pointer : " ", " "],
                  }),
                  r(Text, {
                    children: [
                      qt ? re.ellipsis : Jt ? re.radioOn : re.radioOff,
                      " ",
                      getPluginDisplayName(Ce.entry),
                      r(Text, {
                        dimColor: !0,
                        children: [" ", "\xB7 ", stripInvisibleKeepEmoji(marketplaceLabel(Ce))],
                      }),
                      Mt && r(Text, { dimColor: !0, children: [" ", "\xB7 ", formatSuggestedFor(Mt)] }),
                      Ce.entry.tags?.includes("community-managed") &&
                        Ce.marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
                        e(Text, { dimColor: !0, children: " [Community Managed]" }),
                      isNonInstallableClaudeAiPlugin(Ce.entry) &&
                        e(Text, { dimColor: !0, children: " [not installable on claude.ai yet]" }),
                      xt !== void 0 &&
                        (Ce.marketplaceName === CLAUDE_PLUGINS_OFFICIAL ||
                          Ce.alsoListedIn?.includes(CLAUDE_PLUGINS_OFFICIAL)) &&
                        r(Text, { dimColor: !0, children: [" \xB7 ", formatInstallCount(xt), " installs"] }),
                    ],
                  }),
                ],
              }),
              _t &&
                e(Box, {
                  marginLeft: 4,
                  children: e(Text, {
                    dimColor: !0,
                    children: truncateToWidth(stripInvisibleKeepEmoji(_t), 60),
                  }),
                }),
            ],
          },
          `${pagination.startIndex}-${Ce.pluginId}`,
        );
      }),
      pagination.scrollPosition.canScrollDown &&
        e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowDown, " more below"] }) }),
      e(DiscoverPluginsKeyHint, { ...keyHintProps }),
    ],
  });
}
//@ chunk-vrb44rx7.js:94560-94764 placement
function formatBlockedByOrg() {
  let i = w(2),
    h;
  if (i[0] === MEMO_CACHE_SENTINEL) ((h = pluginDirectoryPolicyBlockHint()), (i[0] = h));
  else h = i[0];
  let k = h,
    C;
  if (i[1] === MEMO_CACHE_SENTINEL)
    ((C = r(Text, {
      dimColor: !0,
      children: [OFFICIAL_MARKETPLACE_DISPLAY, " is blocked by your organization.", k === "" ? "" : ` ${k}`],
    })),
      (i[1] = C));
  else C = i[1];
  return C;
}
/**
 * 发现页空状态（目录未加载、全部已安装、被策略隐藏、市场加载失败）。
 */
//@ chunk-vrb44rx7.js:94764-96832 placement
function renderEmptyDiscoverState(i) {
  let k = w(9),
    { reason: reason } = i;
  switch (reason) {
    case "directory-failed": {
      let C;
      if (k[0] === MEMO_CACHE_SENTINEL)
        ((C = r(Text, {
          dimColor: !0,
          children: ["No plugins to show until the", " ", OFFICIAL_MARKETPLACE_DISPLAY, " loads."],
        })),
          (k[0] = C));
      else C = k[0];
      return C;
    }
    case "all-hidden-by-policy": {
      let C;
      if (k[1] === MEMO_CACHE_SENTINEL)
        ((C = e(Text, {
          dimColor: !0,
          children: "Your organization's policy hides every plugin that would be listed here.",
        })),
          (k[1] = C));
      else C = k[1];
      return C;
    }
    case "git-not-installed": {
      let C;
      if (k[2] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: "Git is required to install marketplaces." }),
            e(Text, { dimColor: !0, children: "Please install git and restart Claude Code." }),
          ],
        })),
          (k[2] = C));
      else C = k[2];
      return C;
    }
    case "all-blocked-by-policy": {
      let C;
      if (k[3] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, {
              dimColor: !0,
              children: "Your organization policy does not allow any external marketplaces.",
            }),
            e(Text, { dimColor: !0, children: "Contact your administrator." }),
          ],
        })),
          (k[3] = C));
      else C = k[3];
      return C;
    }
    case "policy-restricts-sources": {
      let C;
      if (k[4] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, {
              dimColor: !0,
              children: "Your organization restricts which marketplaces can be added.",
            }),
            e(Text, { dimColor: !0, children: "Switch to the Marketplaces tab to view allowed sources." }),
          ],
        })),
          (k[4] = C));
      else C = k[4];
      return C;
    }
    case "all-marketplaces-failed": {
      let C;
      if (k[5] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: "Failed to load marketplace data." }),
            e(Text, { dimColor: !0, children: "Check your network connection." }),
          ],
        })),
          (k[5] = C));
      else C = k[5];
      return C;
    }
    case "all-plugins-installed": {
      let C;
      if (k[6] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: "All available plugins are already installed." }),
            e(Text, { dimColor: !0, children: "Check for new plugins later or add more marketplaces." }),
          ],
        })),
          (k[6] = C));
      else C = k[6];
      return C;
    }
    case "all-plugins-project-installed": {
      let C;
      if (k[7] === MEMO_CACHE_SENTINEL)
        ((C = r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: "All available plugins are installed for this project." }),
            e(Text, { dimColor: !0, children: "Use the Browse tab to install at user scope." }),
          ],
        })),
          (k[7] = C));
      else C = k[7];
      return C;
    }
    case "no-marketplaces-configured":
    default: {
      let C;
      if (k[8] === MEMO_CACHE_SENTINEL)
        ((C = e(HintText, {
          hint: "Add a marketplace first using the Marketplaces tab.",
          children: "No plugins available.",
        })),
          (k[8] = C));
      else C = k[8];
      return C;
    }
  }
}
//@ chunk-vrb44rx7.js:96832-96842 placement
var _l = 32;
//@ chunk-vrb44rx7.js:96842-97141 placement
function formatSuggestedFor(i) {
  switch (i.signal) {
    case "cwd":
      return "suggested for this directory";
    case "cli":
      return `suggested for ${truncateToWidth(i.command, _l)} commands`;
    case "hosts":
      return `suggested for ${truncateToWidth(i.host, _l)}`;
    case "filesRead":
      return `suggested for ${ld(i.file)}`;
    case "manifestDep":
      return `suggested from ${ld(i.file)}`;
  }
}
//@ chunk-vrb44rx7.js:97141-97197 placement
function ld(i) {
  return truncatePathMiddle(getDisplayPath(i).replaceAll("\\", "/"), _l);
}
//@ chunk-vrb44rx7.js:97197-97201 placement
j();

export { DiscoverPluginsScreen, renderContextCost };
