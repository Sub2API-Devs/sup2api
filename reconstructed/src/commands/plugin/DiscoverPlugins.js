/**
 * commands/plugin/DiscoverPlugins.tsx
 *
 * /plugin 发现与搜索插件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/DiscoverPlugins.tsx
 * pieces: chunk-vrb44rx7.js (2)
 * attribution: fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { y, ce, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  ii,
  describeMarketplaceEntryRisks,
  usePinnedConsentRecord,
  describeInstallScopeRisks,
} from "./PluginDetails.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { isInMarketplace } from "../../services/plugins/pluginTag.js";
import { installCountEntries, marketplaceNamesOf } from "../../utils/plugins/pluginDisplayMetadata.js";
import { usePagination } from "./usePagination.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { logDirectoryListingViewed } from "../../utils/plugins/pluginDirectoryTelemetry.js";

//@ chunk-vrb44rx7.js:59155-60011 fingerprint = DiscoverPluginsKeyHint (0.753)
function DiscoverPluginsKeyHint(t0) {
  let x = w(12),
    { hasSelection: hasSelection, canToggle: canToggle, canView: canView } = t0,
    T;
  if (x[0] !== hasSelection)
    ((T =
      hasSelection &&
      e(ConfigurableShortcutHint, {
        action: "plugin:install",
        context: "Plugin",
        fallback: "i",
        description: "install",
        bold: !0,
      })),
      (x[0] = hasSelection),
      (x[1] = T));
  else T = x[1];
  let D;
  if (x[2] === MEMO_CACHE_SENTINEL) ((D = e(Text, { children: "Type to search" })), (x[2] = D));
  else D = x[2];
  let U;
  if (x[3] !== canToggle)
    ((U =
      canToggle &&
      e(ConfigurableShortcutHint, {
        action: "plugin:toggle",
        context: "Plugin",
        fallback: "Space",
        description: "toggle",
      })),
      (x[3] = canToggle),
      (x[4] = U));
  else U = x[4];
  let L;
  if (x[5] !== canView)
    ((L =
      canView &&
      e(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "view",
      })),
      (x[5] = canView),
      (x[6] = L));
  else L = x[6];
  let A;
  if (x[7] === MEMO_CACHE_SENTINEL)
    ((A = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "go back",
    })),
      (x[7] = A));
  else A = x[7];
  let K;
  if (x[8] !== T || x[9] !== U || x[10] !== L)
    ((K = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, italic: !0, children: r(Byline, { children: [T, D, U, L, A] }) }),
    })),
      (x[8] = T),
      (x[9] = U),
      (x[10] = L),
      (x[11] = K));
  else K = x[11];
  return K;
}
//@ chunk-vrb44rx7.js:71007-74454 fingerprint = DiscoverPlugins (0.392)
function DiscoverPlugins({
  screen: screen,
  surface: surface,
  initialViewState: initialViewState,
  availablePlugins: availablePlugins,
  loading: loading,
  searchMarketplaceName: searchMarketplaceName,
  marketplaceFilter: marketplaceFilter = null,
  onInstallComplete: onInstallComplete,
  onSearchModeChange: onSearchModeChange,
}) {
  let { storageV5: storageV5 } = Me(),
    [K, V] = y(initialViewState),
    [B, _] = y(null),
    setIsSearchMode = ce((active) => {
      (_(active), V("plugin-details"));
    }, []),
    pe = ce(() => {
      (V("plugin-list"), _(null));
    }, []),
    fe = K === "plugin-list",
    me = fe && !loading,
    ne = useStoreSelector(screen, ii),
    [he, W] = y(!1),
    Oe = () => W(!1),
    {
      query: searchQuery,
      setQuery: setSearchQuery,
      cursorOffset: searchCursorOffset,
      setCursorOffset: setCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({ isActive: fe && he && !loading, onExit: Oe, onExitUp: Oe }),
    Tt = he && searchQuery !== "";
  (P(() => {
    onSearchModeChange(Tt);
  }, [Tt, onSearchModeChange]),
    P(() => () => onSearchModeChange(!1), [onSearchModeChange]));
  let isTerminalFocused = useTerminalFocus(),
    filteredPlugins = Q(() => {
      let yt =
        marketplaceFilter === null
          ? availablePlugins
          : availablePlugins.filter((on) => isInMarketplace(on, marketplaceFilter));
      if (!searchQuery) return yt;
      let lowerQuery = searchQuery.toLowerCase();
      return yt.filter(
        (plugin) =>
          plugin.entry.name.toLowerCase().includes(lowerQuery) ||
          plugin.entry.displayName?.toLowerCase().includes(lowerQuery) ||
          plugin.entry.description?.toLowerCase().includes(lowerQuery) ||
          installCountEntries(plugin).some((rn) => rn.name.toLowerCase().includes(lowerQuery)) ||
          (searchMarketplaceName && marketplaceNamesOf(plugin).toLowerCase().includes(lowerQuery)) ||
          (searchMarketplaceName && plugin.marketplaceName.toLowerCase().includes(lowerQuery)) ||
          (searchMarketplaceName &&
            (plugin.alsoListedIn ?? []).some((rn) => rn.toLowerCase().includes(lowerQuery))),
      );
    }, [availablePlugins, searchQuery, searchMarketplaceName, marketplaceFilter]),
    [He, ct] = y(0),
    [Ct, oe] = y(new Set()),
    [ft, at] = y(new Set()),
    Ot = usePagination({ totalItems: filteredPlugins.length, selectedIndex: He });
  P(() => {
    ct(0);
  }, [searchQuery, marketplaceFilter]);
  let [an, Yt] = y(!1),
    [_e, qe] = y(null),
    installSelectedPlugins = () =>
      describeMarketplaceEntryRisks({
        selectedForInstall: Ct,
        availablePlugins: availablePlugins,
        setInstallingPlugins: at,
        setSelectedForInstall: oe,
        setResult: screen.setResult,
        setError: screen.setResult,
        setParentViewState: screen.setViewState,
        onInstallComplete: onInstallComplete,
        surface: surface,
        storageV5: storageV5,
      }),
    Lt = usePinnedConsentRecord(B),
    nn = (yt, Ut = "user") =>
      describeInstallScopeRisks({
        plugin: yt,
        scope: Ut,
        consentedEntryHelper: Lt.pinned(),
        setIsInstalling: Yt,
        setInstallError: qe,
        setViewState: V,
        setResult: screen.setResult,
        setParentViewState: screen.setViewState,
        onInstallComplete: onInstallComplete,
        surface: surface,
        storageV5: storageV5,
      });
  P(() => {
    if (ne) screen.setResult(ne);
  }, [ne, screen]);
  function $t(p_1) {
    if (he) {
      handleKeyDown(p_1);
      return;
    }
    if (p_1.ctrl || p_1.meta || loading) return;
    if (p_1.key === "/") (p_1.preventDefault(), W(!0), setSearchQuery(""));
    else if (p_1.key.length === 1 && p_1.key !== " ") (p_1.preventDefault(), W(!0), setSearchQuery(p_1.key));
  }
  function ln(p_2) {
    if (he) {
      handlePaste(p_2);
      return;
    }
    if (loading) return;
    let trimmed = (p_2.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    (p_2.preventDefault(), W(!0), setSearchQuery(trimmed));
  }
  return (
    MessageActionsKeybindings(
      {
        "select:previous": () => {
          if (He === 0) {
            if (!loading && availablePlugins.length > 0) W(!0);
          } else Ot.handleSelectionChange(He - 1, ct);
        },
        "select:next": () => {
          if (He < filteredPlugins.length - 1) Ot.handleSelectionChange(He + 1, ct);
        },
        "select:accept": () => {
          if (He < filteredPlugins.length) {
            let yt = filteredPlugins[He];
            if (yt)
              if (yt.isInstalled)
                screen.setViewState({
                  type: "manage-plugins",
                  targetPlugin: yt.entry.name,
                  targetMarketplace: yt.marketplaceName,
                });
              else
                (setIsSearchMode(yt),
                  qe(null),
                  logDirectoryListingViewed({ pluginId: yt.pluginId, surface: surface, resultIndex: He }));
          }
        },
      },
      { context: "Select", isActive: me && !he },
    ),
    MessageActionsKeybindings(
      {
        "plugin:toggle": () => {
          if (He < filteredPlugins.length) {
            let yt = filteredPlugins[He];
            if (yt && !yt.isInstalled) {
              let newSelection = new Set(Ct);
              if (newSelection.has(yt.pluginId)) newSelection.delete(yt.pluginId);
              else newSelection.add(yt.pluginId);
              oe(newSelection);
            }
          }
        },
        "plugin:install": () => {
          if (Ct.size === 0) return !1;
          if (ft.size > 0) return;
          installSelectedPlugins();
        },
      },
      { context: "Plugin", isActive: me && !he },
    ),
    {
      viewState: K,
      setViewState: V,
      selectedPlugin: B,
      openDetails: setIsSearchMode,
      closeDetails: pe,
      recordEntryHelperShown: Lt.record,
      isSearchMode: he,
      setIsSearchMode: W,
      searchQuery: searchQuery,
      setSearchQuery: setSearchQuery,
      searchBoxProps: {
        query: searchQuery,
        isFocused: he,
        isTerminalFocused: isTerminalFocused,
        cursorOffset: searchCursorOffset,
        onCursorOffsetChange: setCursorOffset,
        onFocus: () => W(!0),
      },
      keyHintProps: {
        hasSelection: Ct.size > 0,
        canToggle: He < filteredPlugins.length && !filteredPlugins[He]?.isInstalled,
        canView: He < filteredPlugins.length,
      },
      filteredPlugins: filteredPlugins,
      selectedIndex: He,
      setSelectedIndex: ct,
      selectedForInstall: Ct,
      setSelectedForInstall: oe,
      installingPlugins: ft,
      pagination: Ot,
      installPlugin: nn,
      isInstalling: an,
      installError: _e,
      handleListKeyDown: $t,
      handleListPaste: ln,
    }
  );
}

export { DiscoverPlugins, DiscoverPluginsKeyHint };
