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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useState, useCallback, useEffect, useMemo } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-vrb44rx7.js:59155-60011 fingerprint (2.1.88 match: DiscoverPluginsKeyHint, 0.753)
function DiscoverPluginsKeyHint(props) {
  let $ = useMemoCache(12);
  let { hasSelection, canToggle, canView } = props;
  let body;
  if ($[0] !== hasSelection) {
    body =
      hasSelection &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "plugin:install",
        context: "Plugin",
        fallback: "i",
        description: "install",
        bold: true,
      });
    $[0] = hasSelection;
    $[1] = body;
  } else body = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      children: "Type to search",
    });
    $[2] = t2;
  } else t2 = $[2];
  let toggleBody;
  if ($[3] !== canToggle) {
    toggleBody =
      canToggle &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "plugin:toggle",
        context: "Plugin",
        fallback: "Space",
        description: "toggle",
      });
    $[3] = canToggle;
    $[4] = toggleBody;
  } else toggleBody = $[4];
  let viewBody;
  if ($[5] !== canView) {
    viewBody =
      canView &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "view",
      });
    $[5] = canView;
    $[6] = viewBody;
  } else viewBody = $[6];
  let selectBody;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    selectBody = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "go back",
    });
    $[7] = selectBody;
  } else selectBody = $[7];
  let t6;
  if ($[8] !== body || $[9] !== toggleBody || $[10] !== viewBody) {
    t6 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [body, t2, toggleBody, viewBody, selectBody],
        }),
      }),
    });
    $[8] = body;
    $[9] = toggleBody;
    $[10] = viewBody;
    $[11] = t6;
  } else t6 = $[11];
  return t6;
}
//@ chunk-vrb44rx7.js:71007-74454 fingerprint (2.1.88 match: DiscoverPlugins, 0.392)
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
  let [viewState, setViewState] = useState(initialViewState);
  let [error, setError] = useState(null);
  let setIsSearchMode = useCallback((active) => {
    setError(active);
    setViewState("plugin-details");
  }, []);
  let closeDetails = useCallback(() => {
    setViewState("plugin-list");
    setError(null);
  }, []);
  let isList = viewState === "plugin-list";
  let isActive = isList && !loading;
  let storeSelector = useStoreSelector(screen, errorOf);
  let [isSearchMode, setSearchMode] = useState(false);
  let exitSearch = () => setSearchMode(false);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: isList && isSearchMode && !loading,
    onExit: exitSearch,
    onExitUp: exitSearch,
  });
  let searchActive = isSearchMode && searchQuery !== "";
  useEffect(() => {
    onSearchModeChange(searchActive);
  }, [searchActive, onSearchModeChange]);
  useEffect(() => () => onSearchModeChange(false), [onSearchModeChange]);
  let isTerminalFocused = useTerminalFocus();
  let filteredPlugins = useMemo(() => {
    let activeMarketplaceFilter =
      marketplaceFilter === null
        ? availablePlugins
        : availablePlugins.filter((availablePlugin) => isInMarketplace(availablePlugin, marketplaceFilter));
    if (!searchQuery) return activeMarketplaceFilter;
    let lowerQuery = searchQuery.toLowerCase();
    return activeMarketplaceFilter.filter(
      (plugin) =>
        plugin.entry.name.toLowerCase().includes(lowerQuery) ||
        plugin.entry.displayName?.toLowerCase().includes(lowerQuery) ||
        plugin.entry.description?.toLowerCase().includes(lowerQuery) ||
        installCountEntries(plugin).some((installId) => installId.name.toLowerCase().includes(lowerQuery)) ||
        (searchMarketplaceName && marketplaceNamesOf(plugin).toLowerCase().includes(lowerQuery)) ||
        (searchMarketplaceName && plugin.marketplaceName.toLowerCase().includes(lowerQuery)) ||
        (searchMarketplaceName &&
          (plugin.alsoListedIn ?? []).some((listed) => listed.toLowerCase().includes(lowerQuery))),
    );
  }, [availablePlugins, searchQuery, searchMarketplaceName, marketplaceFilter]);
  let [cursor, setCursor] = useState(0);
  let [selectedForInstall, setSelectedForInstall] = useState(new Set());
  let [installing, setInstalling] = useState(new Set());
  let pagination = usePagination({
    totalItems: filteredPlugins.length,
    selectedIndex: cursor,
  });
  useEffect(() => {
    setCursor(0);
  }, [searchQuery, marketplaceFilter]);
  let [showSources, setShowSources] = useState(false);
  let [installError, setInstallError] = useState(null);
  let installSelectedPlugins = () =>
    describeMarketplaceEntryRisks({
      selectedForInstall,
      availablePlugins,
      setInstallingPlugins: setInstalling,
      setSelectedForInstall,
      setResult: screen.setResult,
      setError: screen.setResult,
      setParentViewState: screen.setViewState,
      onInstallComplete,
      surface,
      storageV5,
    });
  let pinnedConsentRecord = usePinnedConsentRecord(error);
  let installPlugin = (plugin, scope = "user") =>
    describeInstallScopeRisks({
      plugin,
      scope,
      consentedEntryHelper: pinnedConsentRecord.pinned(),
      setIsInstalling: setShowSources,
      setInstallError,
      setViewState,
      setResult: screen.setResult,
      setParentViewState: screen.setViewState,
      onInstallComplete,
      surface,
      storageV5,
    });
  useEffect(() => {
    if (storeSelector) screen.setResult(storeSelector);
  }, [storeSelector, screen]);
  function renderRow(p_1) {
    if (isSearchMode) {
      handleKeyDown(p_1);
      return;
    }
    if (p_1.ctrl || p_1.meta || loading) return;
    if (p_1.key === "/") {
      p_1.preventDefault();
      setSearchMode(true);
      setSearchQuery("");
    } else if (p_1.key.length === 1 && p_1.key !== " ") {
      p_1.preventDefault();
      setSearchMode(true);
      setSearchQuery(p_1.key);
    }
  }
  function renderGroup(p_2) {
    if (isSearchMode) {
      handlePaste(p_2);
      return;
    }
    if (loading) return;
    let trimmed = (p_2.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    p_2.preventDefault();
    setSearchMode(true);
    setSearchQuery(trimmed);
  }
  MessageActionsKeybindings(
    {
      "select:previous": () => {
        if (cursor === 0) {
          if (!loading && availablePlugins.length > 0) setSearchMode(true);
        } else pagination.handleSelectionChange(cursor - 1, setCursor);
      },
      "select:next": () => {
        if (cursor < filteredPlugins.length - 1) pagination.handleSelectionChange(cursor + 1, setCursor);
      },
      "select:accept": () => {
        if (cursor < filteredPlugins.length) {
          let plugin = filteredPlugins[cursor];
          if (plugin)
            if (plugin.isInstalled)
              screen.setViewState({
                type: "manage-plugins",
                targetPlugin: plugin.entry.name,
                targetMarketplace: plugin.marketplaceName,
              });
            else {
              setIsSearchMode(plugin);
              setInstallError(null);
              logDirectoryListingViewed({
                pluginId: plugin.pluginId,
                surface,
                resultIndex: cursor,
              });
            }
        }
      },
    },
    {
      context: "Select",
      isActive: isActive && !isSearchMode,
    },
  );
  MessageActionsKeybindings(
    {
      "plugin:toggle": () => {
        if (cursor < filteredPlugins.length) {
          let plugin = filteredPlugins[cursor];
          if (plugin && !plugin.isInstalled) {
            let newSelection = new Set(selectedForInstall);
            if (newSelection.has(plugin.pluginId)) newSelection.delete(plugin.pluginId);
            else newSelection.add(plugin.pluginId);
            setSelectedForInstall(newSelection);
          }
        }
      },
      "plugin:install": () => {
        if (selectedForInstall.size === 0) return false;
        if (installing.size > 0) return;
        installSelectedPlugins();
      },
    },
    {
      context: "Plugin",
      isActive: isActive && !isSearchMode,
    },
  );
  return {
    viewState,
    setViewState,
    selectedPlugin: error,
    openDetails: setIsSearchMode,
    closeDetails,
    recordEntryHelperShown: pinnedConsentRecord.record,
    isSearchMode,
    setIsSearchMode: setSearchMode,
    searchQuery,
    setSearchQuery,
    searchBoxProps: {
      query: searchQuery,
      isFocused: isSearchMode,
      isTerminalFocused,
      cursorOffset: searchCursorOffset,
      onCursorOffsetChange: setCursorOffset,
      onFocus: () => setSearchMode(true),
    },
    keyHintProps: {
      hasSelection: selectedForInstall.size > 0,
      canToggle: cursor < filteredPlugins.length && !filteredPlugins[cursor]?.isInstalled,
      canView: cursor < filteredPlugins.length,
    },
    filteredPlugins,
    selectedIndex: cursor,
    setSelectedIndex: setCursor,
    selectedForInstall,
    setSelectedForInstall,
    installingPlugins: installing,
    pagination,
    installPlugin,
    isInstalling: showSources,
    installError,
    handleListKeyDown: renderRow,
    handleListPaste: renderGroup,
  };
}
export { DiscoverPlugins, DiscoverPluginsKeyHint };
