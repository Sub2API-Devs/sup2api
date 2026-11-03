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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { y, ce, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  errorOf,
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
function DiscoverPluginsKeyHint(props) {
  let $ = w(12);
  let { hasSelection, canToggle, canView } = props;
  let T;
  if ($[0] !== hasSelection) {
    T =
      hasSelection &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "plugin:install",
        context: "Plugin",
        fallback: "i",
        description: "install",
        bold: true,
      });
    $[0] = hasSelection;
    $[1] = T;
  } else T = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      children: "Type to search",
    });
    $[2] = t2;
  } else t2 = $[2];
  let U;
  if ($[3] !== canToggle) {
    U =
      canToggle &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "plugin:toggle",
        context: "Plugin",
        fallback: "Space",
        description: "toggle",
      });
    $[3] = canToggle;
    $[4] = U;
  } else U = $[4];
  let L;
  if ($[5] !== canView) {
    L =
      canView &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "view",
      });
    $[5] = canView;
    $[6] = L;
  } else L = $[6];
  let A;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    A = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "go back",
    });
    $[7] = A;
  } else A = $[7];
  let t6;
  if ($[8] !== T || $[9] !== U || $[10] !== L) {
    t6 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [T, t2, U, L, A],
        }),
      }),
    });
    $[8] = T;
    $[9] = U;
    $[10] = L;
    $[11] = t6;
  } else t6 = $[11];
  return t6;
}
//@ chunk-vrb44rx7.js:71007-74454 fingerprint = DiscoverPlugins (0.392)
function DiscoverPlugins({
  screen,
  surface,
  initialViewState,
  availablePlugins,
  loading,
  searchMarketplaceName,
  marketplaceFilter = null,
  onInstallComplete,
  onSearchModeChange,
}) {
  let { storageV5 } = useTheme_2();
  let [K, V] = y(initialViewState);
  let [B, _] = y(null);
  let setIsSearchMode = ce((active) => {
    _(active);
    V("plugin-details");
  }, []);
  let closeDetails = ce(() => {
    V("plugin-list");
    _(null);
  }, []);
  let fe = K === "plugin-list";
  let me = fe && !loading;
  let storeSelector = useStoreSelector(screen, errorOf);
  let [he, W] = y(false);
  let Oe = () => W(false);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: fe && he && !loading,
    onExit: Oe,
    onExitUp: Oe,
  });
  let Tt = he && searchQuery !== "";
  P(() => {
    onSearchModeChange(Tt);
  }, [Tt, onSearchModeChange]);
  P(() => () => onSearchModeChange(false), [onSearchModeChange]);
  let isTerminalFocused = useTerminalFocus();
  let filteredPlugins = Q(() => {
    let yt =
      marketplaceFilter === null
        ? availablePlugins
        : availablePlugins.filter((availablePlugin) => isInMarketplace(availablePlugin, marketplaceFilter));
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
  }, [availablePlugins, searchQuery, searchMarketplaceName, marketplaceFilter]);
  let [He, ct] = y(0);
  let [Ct, oe] = y(new Set());
  let [ft, at] = y(new Set());
  let pagination = usePagination({
    totalItems: filteredPlugins.length,
    selectedIndex: He,
  });
  P(() => {
    ct(0);
  }, [searchQuery, marketplaceFilter]);
  let [an, Yt] = y(false);
  let [_e, qe] = y(null);
  let installSelectedPlugins = () =>
    describeMarketplaceEntryRisks({
      selectedForInstall: Ct,
      availablePlugins,
      setInstallingPlugins: at,
      setSelectedForInstall: oe,
      setResult: screen.setResult,
      setError: screen.setResult,
      setParentViewState: screen.setViewState,
      onInstallComplete,
      surface,
      storageV5,
    });
  let pinnedConsentRecord = usePinnedConsentRecord(B);
  let installPlugin = (plugin, scope = "user") =>
    describeInstallScopeRisks({
      plugin,
      scope,
      consentedEntryHelper: pinnedConsentRecord.pinned(),
      setIsInstalling: Yt,
      setInstallError: qe,
      setViewState: V,
      setResult: screen.setResult,
      setParentViewState: screen.setViewState,
      onInstallComplete,
      surface,
      storageV5,
    });
  P(() => {
    if (storeSelector) screen.setResult(storeSelector);
  }, [storeSelector, screen]);
  function $t(p_1) {
    if (he) {
      handleKeyDown(p_1);
      return;
    }
    if (p_1.ctrl || p_1.meta || loading) return;
    if (p_1.key === "/") {
      p_1.preventDefault();
      W(true);
      setSearchQuery("");
    } else if (p_1.key.length === 1 && p_1.key !== " ") {
      p_1.preventDefault();
      W(true);
      setSearchQuery(p_1.key);
    }
  }
  function ln(p_2) {
    if (he) {
      handlePaste(p_2);
      return;
    }
    if (loading) return;
    let trimmed = (p_2.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    p_2.preventDefault();
    W(true);
    setSearchQuery(trimmed);
  }
  MessageActionsKeybindings(
    {
      "select:previous": () => {
        if (He === 0) {
          if (!loading && availablePlugins.length > 0) W(true);
        } else pagination.handleSelectionChange(He - 1, ct);
      },
      "select:next": () => {
        if (He < filteredPlugins.length - 1) pagination.handleSelectionChange(He + 1, ct);
      },
      "select:accept": () => {
        if (He < filteredPlugins.length) {
          let plugin = filteredPlugins[He];
          if (plugin)
            if (plugin.isInstalled)
              screen.setViewState({
                type: "manage-plugins",
                targetPlugin: plugin.entry.name,
                targetMarketplace: plugin.marketplaceName,
              });
            else {
              setIsSearchMode(plugin);
              qe(null);
              logDirectoryListingViewed({
                pluginId: plugin.pluginId,
                surface,
                resultIndex: He,
              });
            }
        }
      },
    },
    {
      context: "Select",
      isActive: me && !he,
    },
  );
  MessageActionsKeybindings(
    {
      "plugin:toggle": () => {
        if (He < filteredPlugins.length) {
          let plugin = filteredPlugins[He];
          if (plugin && !plugin.isInstalled) {
            let newSelection = new Set(Ct);
            if (newSelection.has(plugin.pluginId)) newSelection.delete(plugin.pluginId);
            else newSelection.add(plugin.pluginId);
            oe(newSelection);
          }
        }
      },
      "plugin:install": () => {
        if (Ct.size === 0) return false;
        if (ft.size > 0) return;
        installSelectedPlugins();
      },
    },
    {
      context: "Plugin",
      isActive: me && !he,
    },
  );
  return {
    viewState: K,
    setViewState: V,
    selectedPlugin: B,
    openDetails: setIsSearchMode,
    closeDetails,
    recordEntryHelperShown: pinnedConsentRecord.record,
    isSearchMode: he,
    setIsSearchMode: W,
    searchQuery,
    setSearchQuery,
    searchBoxProps: {
      query: searchQuery,
      isFocused: he,
      isTerminalFocused,
      cursorOffset: searchCursorOffset,
      onCursorOffsetChange: setCursorOffset,
      onFocus: () => W(true),
    },
    keyHintProps: {
      hasSelection: Ct.size > 0,
      canToggle: He < filteredPlugins.length && !filteredPlugins[He]?.isInstalled,
      canView: He < filteredPlugins.length,
    },
    filteredPlugins,
    selectedIndex: He,
    setSelectedIndex: ct,
    selectedForInstall: Ct,
    setSelectedForInstall: oe,
    installingPlugins: ft,
    pagination,
    installPlugin,
    isInstalling: an,
    installError: _e,
    handleListKeyDown: $t,
    handleListPaste: ln,
  };
}
export { DiscoverPlugins, DiscoverPluginsKeyHint };
