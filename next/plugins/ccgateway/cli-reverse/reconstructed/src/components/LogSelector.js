/**
 * components/LogSelector.tsx
 *
 * 会话选择器（/resume 列表）：搜索、按项目/全部项目切换、按标签与 PR/分支分组、worktree 检测、片段预览。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogSelector.tsx
 * pieces: chunk-4j4pn0rx.js (1), chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (1), chunk-y1bp9wp9.js (13)
 * attribution: fingerprint 9, file-local 1, layout 4, callgraph-fingerprint 1, sole-consumer 1
 */
import { sep, basename } from "path";
import { sortLogs } from "../types/logs.js";
import {
  useRef,
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
} from "../../vendor/react/cjs/react.production.js";
import { fieldKey } from "./pluginUi/render/RenderInstance.js";
import { truncateToWidth, formatLogMetadata } from "../utils/format.js";
import { sequential } from "../utils/sequential.js";
import { PR_URL_RE_2, parsePrUrl_2 } from "../tools/shared/gitOperationTracking.js";
import { BOXED_DIAMOND_GLYPH } from "../constants/figures.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getLogDisplayTitle } from "../utils/log.js";
import { useTheme_2, useResolvedTheme } from "./design-system/ThemeProvider.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useGlobalExitKeybindings, useKeybinding } from "../keybindings/useKeybinding.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useClock } from "../ink/components/ClockContext.js";
import { applyColor } from "../ink/colorize.js";
import { useProject } from "../context/session.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { logEvent } from "../services/analytics/index.js";
import { getBranch } from "../utils/git.js";
import { getWorktreePathsPortable } from "../utils/getWorktreePathsPortable.js";
import {
  getSessionIdFromLog,
  getFirstMeaningfulUserMessageTextContent,
  saveCustomTitle,
} from "../utils/sessionStorage.js";
import { PANE_PADDING, Pane } from "./design-system/Pane.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { SessionPreview } from "./SessionPreview.js";
import { Box, Text } from "../ink/components/Text.js";
import { SearchBox } from "./SearchBox.js";
import { Byline } from "./design-system/Byline.js";
import { HintText } from "./design-system/HintText.js";
import { TextInput } from "./TextInput.js";
import { TreeSelect } from "./ui/TreeSelect.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { stripModelOnlySummarySuffix } from "./CompactSummary.js";
import { renderPluginPromptColon } from "../utils/messages/pluginPrompts.js";

//@ chunk-4j4pn0rx.js:457-534 fingerprint (2.1.88 match: _temp7, 0.578)
function createLogSinkRef() {
  let sink = {
    log() {},
    hookFailed() {},
  };
  return {
    set: (next) => {
      sink = next;
    },
    get: () => sink,
  };
}
//@ chunk-5xgkngpb.js:551752-551974 fingerprint (2.1.88 match: groupLogsBySessionId, 1)
function latestLogPerSession(filteredLogs) {
  let groups = new Map();
  for (let log of filteredLogs) {
    if (!log.sessionId) continue;
    let existing = groups.get(log.sessionId);
    if (!existing || log.modified.getTime() > existing.modified.getTime()) groups.set(log.sessionId, log);
  }
  return sortLogs([...groups.values()]).map((log, value) => ({
    ...log,
    value,
  }));
}
//@ chunk-czq1j3j2.js:511915-512162 fingerprint (2.1.88 match: getUniqueTags, 0.487)
function useRedrawnValues(logs, tag, onConflict) {
  let seenRef = useRef(new Map());
  useEffect(() => {
    let conflicts = [];
    for (let log of logs) {
      if (log.tag !== tag) continue;
      let key = fieldKey(log.plugin, log.element);
      if (seenRef.current.has(key) && seenRef.current.get(key) !== log.value) conflicts.push(key);
      seenRef.current.set(key, log.value);
    }
    if (conflicts.length > 0) onConflict(conflicts);
  }, [logs, tag, onConflict]);
}
//@ chunk-y1bp9wp9.js:7193-7260 file-local
function normalizeAndTruncateToWidth(text, maxWidth) {
  let normalized = text.replace(/\s+/g, " ").trim();
  return truncateToWidth(normalized, maxWidth);
}
//@ chunk-y1bp9wp9.js:7260-7306 layout
var LOG_MIN_LINES = 2;
var LOG_MAX_LINES = 4;
var LOG_REFRESH_MS = 2000;
var LOG_TAIL_MS = 1000;
var LOG_MAX_BYTES = 50000;
var LOG_DIM_RATIO = 0.3;
//@ chunk-y1bp9wp9.js:7306-7377 layout
var LOG_SHORTCUT_FORMAT = {
  format: {
    modCase: "title",
    charCase: "upper",
  },
};
var LOG_STALE_MS = 60000;
var LOG_MAX_ENTRIES = 50;
var LOG_RETRY_COUNT = 5;
//@ chunk-y1bp9wp9.js:7377-7451 fingerprint (2.1.88 match: formatSnippet, 1)
function formatSnippet({ before, match, after }, highlightColor) {
  return sequential.dim(before) + highlightColor(match) + sequential.dim(after);
}
//@ chunk-y1bp9wp9.js:7451-7592 layout
function formatPrUrlsInQuery(searchQuery) {
  return searchQuery.replace(new RegExp(PR_URL_RE_2.source + '[^,\\s"]*', "g"), (url) => {
    let prUrl = parsePrUrl_2(url);
    return prUrl ? `PR #${prUrl.prNumber} ${prUrl.prRepository}` : url;
  });
}
//@ chunk-y1bp9wp9.js:7592-7930 fingerprint (2.1.88 match: extractSnippet, 1)
function extractSnippet(text, query, contextChars) {
  let matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex === -1) return null;
  let matchEnd = matchIndex + query.length;
  let snippetStart = Math.max(0, matchIndex - contextChars);
  let snippetEnd = Math.min(text.length, matchEnd + contextChars);
  let beforeRaw = text.slice(snippetStart, matchIndex);
  let matchText = text.slice(matchIndex, matchEnd);
  let afterRaw = text.slice(matchEnd, snippetEnd);
  return {
    before: (snippetStart > 0 ? "\u2026" : "") + beforeRaw.replace(/\s+/g, " ").trimStart(),
    match: matchText.trim(),
    after: afterRaw.replace(/\s+/g, " ").trimEnd() + (snippetEnd < text.length ? "\u2026" : ""),
  };
}
//@ chunk-y1bp9wp9.js:7930-8261 fingerprint (2.1.88 match: buildLogLabel, 0.948)
function buildLogLabel(log, maxLabelWidth, options) {
  let { isGroupHeader = false, isChild = false, forkCount = 0 } = options || {};
  let prefixWidth = isGroupHeader && forkCount > 0 ? LOG_MIN_LINES : isChild ? LOG_MAX_LINES : 0;
  let forkSuffix =
    isGroupHeader && forkCount > 0
      ? ` (+${forkCount} other ${forkCount === 1 ? "session" : "sessions"})`
      : "";
  let sidechainSuffix = log.isSidechain ? " (sidechain)" : "";
  let artifactSuffix =
    log.artifactCount !== undefined && log.artifactCount > 0
      ? `  ${BOXED_DIAMOND_GLYPH} ${log.artifactCount}`
      : "";
  let maxSummaryWidth =
    maxLabelWidth - prefixWidth - sidechainSuffix.length - forkSuffix.length - bunStringWidth(artifactSuffix);
  return `${normalizeAndTruncateToWidth(getLogDisplayTitle(log), maxSummaryWidth)}${sidechainSuffix}${forkSuffix}${artifactSuffix}`;
}
//@ chunk-y1bp9wp9.js:8261-8406 fingerprint (2.1.88 match: buildLogMetadata, 1)
function buildLogMetadata(log, options) {
  let { isChild = false, showProjectPath = false } = options || {};
  let childPadding = isChild ? "    " : "";
  let baseMetadata = formatLogMetadata(log);
  let projectSuffix = showProjectPath && log.projectPath ? ` \xB7 ${log.projectPath}` : "";
  return childPadding + baseMetadata + projectSuffix;
}
//@ chunk-y1bp9wp9.js:8406-18349 fingerprint (2.1.88 match: LogSelector, 0.631)
/**
 * 会话选择器：显示会话列表（标题、时间、消息数、分支/PR、标签），支持搜索（tengu_session_search_toggled）、所有项目切换、按 sessionId 分组、worktree 检测与预览。
 */
function LogSelector({
  logs,
  maxHeight = 1 / 0,
  forceWidth,
  onCancel,
  onSelect,
  onLogsChanged,
  onLoadMore,
  initialSearchQuery,
  isLoading = false,
  reloadGeneration = 0,
  showAllProjects = false,
  onToggleAllProjects,
  currentSessionId,
  footerNote,
}) {
  let { storageV5 } = useTheme_2();
  let scrollViewportSize = useScrollViewportSize(useTerminalSize());
  let width = forceWidth === undefined ? scrollViewportSize.columns : forceWidth;
  let globalExitKeybindings = useGlobalExitKeybindings(onCancel);
  let unused = false;
  let emptyProps = stableEmptyObject(false);
  let shortcutFormat = LOG_SHORTCUT_FORMAT;
  let allProjectsAction = "show all projects";
  let rowHeight = 2;
  let isTerminalFocused = useTerminalFocus();
  let terminalSize = useClock();
  let unused_2 = false;
  let isTerminalFocused_2 = useResolvedTheme();
  let highlightColor = useMemo(
    () => (text) => applyColor(text, isTerminalFocused_2.warning),
    [isTerminalFocused_2.warning],
  );
  let footerWidth = useMemo(
    () => (footerNote === undefined ? 0 : bunStringWidth(footerNote.join(" \xB7 "))),
    [footerNote],
  );
  let [branch, setBranch] = useState(null);
  let [allBranches, setAllBranches] = useState(true);
  let [allWorktrees, setAllWorktrees] = useState(false);
  let [hasWorktrees, setHasWorktrees] = useState(false);
  let [focusedWorktree, setFocusedWorktree] = useState(null);
  let [activeWorktree, setActiveWorktree] = useState(null);
  let [worktreePaths, setWorktreePaths] = useState([]);
  let [worktreesReady, setWorktreesReady] = useState(false);
  let project = useProject();
  let [cwd] = useState(() => project.originalCwd);
  let [renameDraft, setRenameDraft] = useState("");
  let [renameCursor, setRenameCursor] = useState(0);
  let [expandedGroups, setExpandedGroups] = useState(new Set());
  let [focusedNode, setFocusedNode] = useState(null);
  let [focusedIndex, setFocusedIndex] = useState(1);
  let [mode, setMode] = useState(initialSearchQuery ? "search" : "list");
  let [previewLog, setPreviewLog] = useState(null);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: mode === "search",
    onExit: () => {
      setMode("list");
      logEvent("tengu_session_search_toggled", {
        enabled: false,
      });
    },
    onExitUp: () => {
      setMode("list");
      logEvent("tengu_session_search_toggled", {
        enabled: false,
      });
    },
    passthroughCtrlKeys: logs.length === 0 ? ["n", "a"] : ["n"],
    initialQuery: initialSearchQuery || "",
  });
  let formattedQuery = formatPrUrlsInQuery(searchQuery);
  let parsedQuery = useDeferredValue(formattedQuery);
  let [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    if (!parsedQuery) {
      setDebouncedQuery("");
      return;
    }
    return terminalSize.setTimeout(() => setDebouncedQuery(parsedQuery), 300);
  }, [parsedQuery, terminalSize]);
  let [searchResults, setSearchResults] = useState(null);
  let searchPending = false;
  useEffect(() => {
    getBranch().then((branch) => setBranch(branch));
    let now = Date.now();
    getWorktreePathsPortable(cwd)
      .then(async (worktreePathsPortable) => {
        worktreePathsPortable.length;
        return worktreePathsPortable;
      })
      .then((worktrees) => {
        logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: worktrees.length,
          success: true,
        });
        setHasWorktrees(worktrees.length > 1);
        setWorktreePaths(worktrees);
        setFocusedWorktree(worktrees[0] ?? null);
        let filtered = worktrees.filter((branch) => cwd === branch || cwd.startsWith(branch + sep));
        filtered.sort((pathA, pathB) => pathB.length - pathA.length);
        setActiveWorktree(filtered[0] ?? null);
        setWorktreesReady(true);
      })
      .catch(() => {
        logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: 0,
          success: false,
        });
        setWorktreesReady(true);
      });
  }, [cwd]);
  let searchableByLog = useMemo(
    () => new Map(logs.map((paths) => [paths, buildSearchableText(paths)])),
    [logs],
  );
  let unusedMemo = useMemo(() => null, [logs, searchableByLog, false]);
  let listableLogs = useMemo(() => {
    let filtered = logs.filter((log) => {
      let sessionIdFromLog = getSessionIdFromLog(log);
      if (currentSessionId && sessionIdFromLog === currentSessionId) return true;
      if (log.customTitle ?? log.aiTitle) return true;
      if (getFirstMeaningfulUserMessageTextContent(log.messages)) return true;
      if (log.firstPrompt || log.customTitle || log.aiTitle) return true;
      return false;
    });
    if (!allBranches && branch) filtered = filtered.filter((log_3) => log_3.gitBranch === branch);
    if (hasWorktrees && !allWorktrees && !showAllProjects) {
      let targetPath = activeWorktree ?? cwd;
      filtered = filtered.filter((log_4) => {
        if (log_4.isAlias) return true;
        let projectPath = log_4.projectPath;
        if (projectPath === undefined) return false;
        let matchedRoot = null;
        for (let root of worktreePaths)
          if (projectPath === root || projectPath.startsWith(root + sep)) {
            if (matchedRoot === null || root.length > matchedRoot.length) matchedRoot = root;
          }
        if (matchedRoot === null) return projectPath === targetPath;
        return matchedRoot === targetPath;
      });
    }
    return filtered;
  }, [
    logs,
    currentSessionId,
    allBranches,
    branch,
    hasWorktrees,
    allWorktrees,
    showAllProjects,
    cwd,
    activeWorktree,
    worktreePaths,
  ]);
  let filteredLogs = useMemo(() => {
    if (!formattedQuery) return listableLogs;
    let query = formattedQuery.toLowerCase();
    return listableLogs.filter((log) => {
      let displayedTitle = getLogDisplayTitle(log).toLowerCase();
      let branch = (log.gitBranch || "").toLowerCase();
      let tag = (log.tag || "").toLowerCase();
      let prInfo = log.prNumber ? `pr #${log.prNumber} ${log.prRepository || ""}`.toLowerCase() : "";
      return (
        displayedTitle.includes(query) ||
        branch.includes(query) ||
        tag.includes(query) ||
        prInfo.includes(query)
      );
    });
  }, [listableLogs, formattedQuery]);
  useEffect(() => {
    setSearchResults(null);
    return;
  }, [debouncedQuery, parsedQuery, unusedMemo, false, terminalSize]);
  let { filteredLogs: filteredLogs_2, snippets } = useMemo(() => {
    let snippetMap = new Map();
    let logsMatching = filteredLogs;
    if (searchResults && debouncedQuery && searchResults.query === debouncedQuery) {
      for (let result of searchResults.results)
        if (result.searchableText) {
          let snippet = extractSnippet(result.searchableText, debouncedQuery, LOG_MAX_ENTRIES);
          if (snippet) snippetMap.set(result.log, snippet);
        }
      let listedUuids = new Set(logsMatching.map((log_7) => log_7.messages[0]?.uuid));
      let listableSet = new Set(listableLogs);
      let transcriptOnlyMatches = searchResults.results
        .map((result) => result.log)
        .filter((resultLog) => !listedUuids.has(resultLog.messages[0]?.uuid) && listableSet.has(resultLog));
      logsMatching = [...logsMatching, ...transcriptOnlyMatches];
    }
    return {
      filteredLogs: logsMatching,
      snippets: snippetMap,
    };
  }, [filteredLogs, searchResults, debouncedQuery, listableLogs]);
  let contentWidth = width - 2 * PANE_PADDING;
  let maxLabelWidth = Math.max(30, contentWidth - 4);
  let nodes = useMemo(() => {
    let sessionGroups = groupLogsBySessionId(filteredLogs_2);
    return Array.from(sessionGroups.entries()).map(([sessionId, groupLogs]) => {
      let latestLog = groupLogs[0];
      let snippet_0 = snippets.get(latestLog);
      let snippetStr = snippet_0 ? formatSnippet(snippet_0, highlightColor) : null;
      if (groupLogs.length === 1) {
        let metadata = buildLogMetadata(latestLog, {
          showProjectPath: showAllProjects,
        });
        return {
          id: `log:${sessionId}:0`,
          value: {
            log: latestLog,
          },
          label: buildLogLabel(latestLog, maxLabelWidth),
          description: snippetStr
            ? `${metadata}
  ${snippetStr}`
            : metadata,
          dimDescription: true,
        };
      }
      let forkCount = groupLogs.length - 1;
      let children = groupLogs.slice(1).map((log, index) => {
        let childSnippet = snippets.get(log);
        let childSnippetStr = childSnippet ? formatSnippet(childSnippet, highlightColor) : null;
        let childMetadata = buildLogMetadata(log, {
          isChild: true,
          showProjectPath: showAllProjects,
        });
        return {
          id: `log:${sessionId}:${index + 1}`,
          value: {
            log,
          },
          label: buildLogLabel(log, maxLabelWidth, {
            isChild: true,
          }),
          description: childSnippetStr
            ? `${childMetadata}
      ${childSnippetStr}`
            : childMetadata,
          dimDescription: true,
        };
      });
      let parentMetadata = buildLogMetadata(latestLog, {
        showProjectPath: showAllProjects,
      });
      return {
        id: `group:${sessionId}`,
        value: {
          log: latestLog,
        },
        label: buildLogLabel(latestLog, maxLabelWidth, {
          isGroupHeader: true,
          forkCount,
        }),
        description: snippetStr
          ? `${parentMetadata}
  ${snippetStr}`
          : parentMetadata,
        dimDescription: true,
        children,
      };
    });
  }, [filteredLogs_2, maxLabelWidth, showAllProjects, snippets, highlightColor]);
  let log = focusedNode?.value.log ?? null;
  let expandHint = () => {
    if (!log) return "";
    let sessionId = getSessionIdFromLog(log);
    if (!sessionId) return "";
    let sessionLogs = filteredLogs_2.filter((log) => getSessionIdFromLog(log) === sessionId);
    if (!(sessionLogs.length > 1)) return "";
    let isExpanded = expandedGroups.has(sessionId);
    if (sessionLogs.indexOf(log) > 0 || isExpanded)
      return jsxProd_default(KeyboardShortcutHint, {
        chord: "left",
        action: "collapse",
        ...emptyProps,
      });
    return jsxProd_default(KeyboardShortcutHint, {
      chord: "right",
      action: "expand",
      ...emptyProps,
    });
  };
  let onSubmit = async () => {
    let sessionId = log ? getSessionIdFromLog(log) : undefined;
    if (!log || !sessionId) {
      setMode("list");
      setRenameDraft("");
      return;
    }
    if (renameDraft.trim()) {
      await saveCustomTitle(sessionId, renameDraft.trim(), log.fullPath, "user", storageV5);
      if (onLogsChanged) onLogsChanged();
    }
    setMode("list");
    setRenameDraft("");
  };
  let exitSearch = () => {
    setMode("list");
    setSearchQuery("");
    logEvent("tengu_session_search_toggled", {
      enabled: false,
    });
  };
  let onUpFromFirstItem = () => {
    setMode("search");
    logEvent("tengu_session_search_toggled", {
      enabled: true,
    });
  };
  useEffect(() => {
    if (reloadGeneration === 0) return;
    setSearchResults(null);
  }, [reloadGeneration]);
  let onFocus = (node) => {
    setFocusedNode(node);
    let index = filteredLogs_2.findIndex(
      (log) => getSessionIdFromLog(log) === getSessionIdFromLog(node.value.log),
    );
    if (index >= 0) setFocusedIndex(index + 1);
  };
  useKeybinding(
    "confirm:no",
    () => {
      setMode("list");
      setRenameDraft("");
    },
    {
      context: "Settings",
      isActive: mode === "rename",
    },
  );
  function onKeyDown(prev) {
    if (mode === "preview") return;
    if (mode === "rename");
    else if (mode === "search") {
      handleKeyDown(prev);
      if (prev.ctrl && prev.key === "n") {
        prev.preventDefault();
        exitSearch();
      } else if (prev.ctrl && prev.key === "a" && onToggleAllProjects && logs.length === 0) {
        prev.preventDefault();
        onToggleAllProjects();
        logEvent("tengu_session_all_projects_toggled", {
          enabled: showAllProjects,
        });
      }
    } else {
      if (
        filteredLogs_2.length === 0 &&
        (prev.key === "up" || prev.key === "down" || prev.key === "return")
      ) {
        prev.preventDefault();
        setMode("search");
        return;
      }
      let plainKey = !prev.ctrl && !prev.meta;
      let lowerInput = prev.key.toLowerCase();
      if (prev.ctrl && prev.key === "a" && onToggleAllProjects) {
        prev.preventDefault();
        onToggleAllProjects();
        logEvent("tengu_session_all_projects_toggled", {
          enabled: showAllProjects,
        });
      } else if (prev.ctrl && prev.key === "b") {
        prev.preventDefault();
        let newEnabled = !allBranches;
        setAllBranches(newEnabled);
        logEvent("tengu_session_branch_filter_toggled", {
          enabled: !newEnabled,
        });
      } else if (prev.ctrl && prev.key === "w" && hasWorktrees) {
        prev.preventDefault();
        let newValue = !allWorktrees;
        setAllWorktrees(newValue);
        logEvent("tengu_session_worktree_filter_toggled", {
          enabled: !newValue,
        });
      } else if (lowerInput === "/" && plainKey) {
        prev.preventDefault();
        setMode("search");
        logEvent("tengu_session_search_toggled", {
          enabled: true,
        });
      } else if (prev.ctrl && prev.key === "r" && log) {
        prev.preventDefault();
        setMode("rename");
        setRenameDraft("");
        logEvent("tengu_session_rename_started", {});
      } else if (((prev.key === " " && plainKey) || (prev.ctrl && prev.key === "v")) && log) {
        prev.preventDefault();
        setPreviewLog(log);
        setMode("preview");
        logEvent("tengu_session_preview_opened", {
          messageCount: log.messageCount,
        });
      } else if (!prev.defaultPrevented && plainKey && prev.key.length === 1 && prev.key !== " ") {
        prev.preventDefault();
        setMode("search");
        setSearchQuery(prev.key);
        logEvent("tengu_session_search_toggled", {
          enabled: true,
        });
      }
    }
  }
  function onPaste(event) {
    if (mode === "search") {
      handlePaste(event);
      return;
    }
    let trimmed = (event.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (mode === "preview" || mode === "rename" || !log || !trimmed) return;
    event.preventDefault();
    setMode("search");
    setSearchQuery(trimmed);
    logEvent("tengu_session_search_toggled", {
      enabled: true,
    });
  }
  let filterChips = [];
  let showProjectChip = !!onToggleAllProjects && !showAllProjects && worktreesReady;
  let chipPath = focusedWorktree ?? cwd;
  if (showProjectChip) filterChips.push(basename(chipPath));
  if (!allBranches && branch) filterChips.push(branch);
  if (hasWorktrees && !allWorktrees && !showAllProjects) {
    let worktreePath = activeWorktree ?? cwd;
    if (!(showProjectChip && chipPath === worktreePath)) filterChips.push(basename(worktreePath));
  }
  let showAllProjectsHint = !!onToggleAllProjects && !showAllProjects && !worktreesReady;
  let showChips = (filterChips.length > 0 || showAllProjectsHint) && mode !== "search";
  let searchRows = 3;
  let chromeRows = 5 + searchRows + (showChips ? 1 : 0);
  let showFooterNote =
    footerNote !== undefined &&
    mode !== "rename" &&
    footerWidth <= contentWidth - 2 &&
    maxHeight - (5 + searchRows + 1) - 3 >= 3;
  let footerRows = 2 + (showFooterNote ? 1 : 0);
  let visibleCount = Math.max(1, Math.floor((maxHeight - chromeRows - footerRows) / 3));
  let logCount = logs.length;
  let loadMoreRef = useRef({
    focusedIndex: -1,
    visible: -1,
    empty: 0,
  });
  useEffect(() => {
    if (!onLoadMore) return;
    let prev = loadMoreRef.current;
    if (prev.focusedIndex !== focusedIndex || prev.visible !== filteredLogs_2.length)
      loadMoreRef.current = {
        focusedIndex,
        visible: filteredLogs_2.length,
        empty: 0,
      };
    let prefetchCount = visibleCount * 2;
    if (
      focusedIndex + prefetchCount >= filteredLogs_2.length &&
      loadMoreRef.current.empty < LOG_RETRY_COUNT
    ) {
      loadMoreRef.current.empty++;
      onLoadMore(visibleCount * 3);
    }
  }, [focusedIndex, visibleCount, filteredLogs_2.length, logCount, onLoadMore]);
  if (logs.length === 0 && !onToggleAllProjects) return null;
  if (mode === "preview" && previewLog)
    return jsxProd_default(SessionPreview, {
      log: previewLog,
      onExit: () => {
        setMode("list");
        setPreviewLog(null);
      },
      onSelect,
    });
  return jsxProd_default(Box, {
    flexDirection: "column",
    maxHeight: maxHeight - 1,
    onKeyDown,
    onPaste,
    children: jsxProd_default_2(ResumeSessionPane, {
      isRedesign: false,
      titleDetail: jsxProd_default_2(Fragment, {
        children: [
          mode === "list" &&
            filteredLogs_2.length > visibleCount &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" ", "(", focusedIndex, " of ", filteredLogs_2.length, ")"],
            }),
          isLoading &&
            jsxProd_default(Text, {
              dimColor: true,
              children: " \xB7 Refreshing\u2026",
            }),
        ],
      }),
      children: [
        jsxProd_default(SearchBox, {
          query: searchQuery,
          isFocused: mode === "search",
          isTerminalFocused,
          cursorOffset: searchCursorOffset,
          isSearchLineUnpadded: true,
        }),
        showChips &&
          (filterChips.length > 0
            ? jsxProd_default(Box, {
                flexShrink: 0,
                paddingLeft: 2,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: jsxProd_default(Byline, {
                    children: filterChips,
                  }),
                }),
              })
            : jsxProd_default(Box, {
                flexShrink: 0,
                height: 1,
              })),
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            children: " ",
          }),
        }),
        (mode === "search" || mode === "list") &&
          Boolean(searchQuery.trim()) &&
          filteredLogs_2.length === 0 &&
          !searchPending &&
          !isLoading &&
          jsxProd_default(Box, {
            paddingLeft: 1,
            marginBottom: 1,
            flexShrink: 0,
            children: jsxProd_default_2(HintText, {
              children: ['No sessions match "', searchQuery, '".'],
            }),
          }),
        logs.length === 0 &&
          mode === "list" &&
          !isLoading &&
          !searchQuery.trim() &&
          jsxProd_default(Box, {
            paddingLeft: 1,
            marginBottom: 1,
            flexShrink: 0,
            children: jsxProd_default(HintText, {
              hint: showAllProjects
                ? undefined
                : jsxProd_default(KeyboardShortcutHint, {
                    chord: "ctrl+a",
                    action: "show all projects",
                    ...shortcutFormat,
                  }),
              children: showAllProjects
                ? "No conversations found."
                : "No conversations found in this project.",
            }),
          }),
        mode === "rename" && log
          ? jsxProd_default_2(Box, {
              paddingLeft: 2,
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Rename session:",
                }),
                jsxProd_default(Box, {
                  paddingTop: 1,
                  children: jsxProd_default(TextInput, {
                    value: renameDraft,
                    onChange: setRenameDraft,
                    onSubmit,
                    placeholder: getLogDisplayTitle(log, "Enter new session name"),
                    columns: contentWidth - 2,
                    cursorOffset: renameCursor,
                    onChangeCursorOffset: setRenameCursor,
                    showCursor: true,
                    focus: true,
                  }),
                }),
              ],
            })
          : jsxProd_default(TreeSelect, {
              nodes,
              onSelect: (node_0) => {
                onSelect(node_0.value.log);
              },
              onFocus,
              onCancel,
              focusNodeId: focusedNode?.id,
              visibleOptionCount: visibleCount,
              layout: "expanded",
              isDisabled: mode === "search",
              hidePromptWhileDisabled: true,
              hideIndexes: false,
              isNodeExpanded: (nodeId) => {
                if (mode === "search" || !allBranches) return true;
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                return sessionId ? expandedGroups.has(sessionId) : false;
              },
              onExpand: (nodeId) => {
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                if (sessionId) {
                  setExpandedGroups((prev) => new Set(prev).add(sessionId));
                  logEvent("tengu_session_group_expanded", {});
                }
              },
              onCollapse: (nodeId) => {
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                if (sessionId)
                  setExpandedGroups((prev) => {
                    let newSet = new Set(prev);
                    newSet.delete(sessionId);
                    return newSet;
                  });
              },
              onUpFromFirstItem,
            }),
        showFooterNote &&
          jsxProd_default(Box, {
            paddingLeft: 2,
            flexShrink: 0,
            children: jsxProd_default(Text, {
              dimColor: true,
              wrap: "truncate-end",
              children: jsxProd_default(Byline, {
                children: footerNote,
              }),
            }),
          }),
        jsxProd_default(Box, {
          paddingLeft: 2,
          children: globalExitKeybindings.pending
            ? jsxProd_default_2(Text, {
                dimColor: true,
                italic: false,
                children: ["Press ", globalExitKeybindings.keyName, " again to exit"],
              })
            : mode === "rename"
              ? jsxProd_default(Text, {
                  dimColor: true,
                  italic: false,
                  children: jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "enter",
                        action: "save",
                        ...emptyProps,
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "confirm:no",
                        context: "Confirmation",
                        fallback: "Esc",
                        description: "cancel",
                        ...emptyProps,
                      }),
                    ],
                  }),
                })
              : mode === "search"
                ? jsxProd_default(Text, {
                    dimColor: true,
                    italic: false,
                    children: jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(Text, {
                          children: "Type to Search",
                        }),
                        logs.length === 0 &&
                          onToggleAllProjects &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+a",
                            action: showAllProjects ? "only show current repo" : "show all projects",
                            ...shortcutFormat,
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "select",
                          ...emptyProps,
                        }),
                        jsxProd_default(ConfigurableShortcutHint, {
                          action: "confirm:no",
                          context: "Confirmation",
                          fallback: "Esc",
                          description: "clear",
                          ...emptyProps,
                        }),
                      ],
                    }),
                  })
                : jsxProd_default(Text, {
                    dimColor: true,
                    italic: false,
                    children: jsxProd_default_2(Byline, {
                      children: [
                        onToggleAllProjects &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+a",
                            action: showAllProjects ? "only show current repo" : "show all projects",
                            ...shortcutFormat,
                          }),
                        branch &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+b",
                            action: allBranches ? "only show current branch" : "show all branches",
                            ...shortcutFormat,
                          }),
                        hasWorktrees &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+w",
                            action: allWorktrees ? "only show current worktree" : "show all worktrees",
                            ...shortcutFormat,
                          }),
                        log &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "space",
                            action: "preview",
                            ...emptyProps,
                          }),
                        log &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+r",
                            action: "rename",
                            ...shortcutFormat,
                          }),
                        jsxProd_default(Text, {
                          children: "Type to search",
                        }),
                        jsxProd_default(ConfigurableShortcutHint, {
                          action: "confirm:no",
                          context: "Confirmation",
                          fallback: "Esc",
                          description: "cancel",
                          format: emptyProps.format,
                        }),
                        expandHint(),
                      ],
                    }),
                  }),
        }),
      ],
    }),
  });
}
//@ chunk-y1bp9wp9.js:18349-18653 layout
/**
 * 会话恢复面板：显示“Resume session”标题与附加说明，下方放子内容。
 */
function ResumeSessionPane(props) {
  let $ = useMemoCache(5);
  let { titleDetail, children } = props;
  let titleRow;
  if ($[0] !== titleDetail) {
    titleRow = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        bold: true,
        color: "suggestion",
        children: ["Resume session", titleDetail],
      }),
    });
    $[0] = titleDetail;
    $[1] = titleRow;
  } else titleRow = $[1];
  let pane;
  if ($[2] !== children || $[3] !== titleRow) {
    pane = jsxProd_default_2(Pane, {
      color: "suggestion",
      children: [titleRow, children],
    });
    $[2] = children;
    $[3] = titleRow;
    $[4] = pane;
  } else pane = $[4];
  return pane;
}
//@ chunk-y1bp9wp9.js:18653-19104 callgraph-fingerprint (2.1.88 match: extractSearchableText, 0.466)
function extractSearchableText(message) {
  if (message.type !== "user" && message.type !== "assistant") return "";
  let content = "message" in message ? message.message?.content : undefined;
  if (!content) return "";
  let modelOnlyText = message.type === "user" && message.isCompactSummary ? message.modelOnlyText : undefined;
  if (typeof content === "string")
    return stripModelOnlySummarySuffix(
      renderPluginPromptColon(content, message.type === "user" ? message.pluginPrompt : undefined),
      modelOnlyText,
    );
  if (Array.isArray(content))
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if ("text" in block && typeof block.text === "string")
          return stripModelOnlySummarySuffix(block.text, modelOnlyText);
        return "";
      })
      .filter(Boolean)
      .join(" ");
  return "";
}
//@ chunk-y1bp9wp9.js:19104-19468 fingerprint (2.1.88 match: buildSearchableText, 0.887)
function buildSearchableText(log) {
  let messageText = (
    log.messages.length <= LOG_REFRESH_MS
      ? log.messages
      : [...log.messages.slice(0, LOG_TAIL_MS), ...log.messages.slice(-LOG_TAIL_MS)]
  )
    .map(extractSearchableText)
    .filter(Boolean)
    .join(" ");
  let fullText =
    `${[log.customTitle, log.aiTitle, log.summary, log.firstPromptShown ?? log.firstPrompt, log.gitBranch, log.tag, log.prNumber ? `PR #${log.prNumber}` : undefined, log.prRepository].filter(Boolean).join(" ")} ${messageText}`.trim();
  return fullText.length > LOG_MAX_BYTES ? fullText.slice(0, LOG_MAX_BYTES) : fullText;
}
//@ chunk-y1bp9wp9.js:19468-19682 sole-consumer (2.1.88 match: groupLogsBySessionId, 1)
function groupLogsBySessionId(filteredLogs) {
  let groups = new Map();
  for (let log of filteredLogs) {
    let sessionId = getSessionIdFromLog(log);
    if (sessionId) {
      let existing = groups.get(sessionId);
      if (existing) existing.push(log);
      else groups.set(sessionId, [log]);
    }
  }
  groups.forEach((logs) =>
    logs.sort((logA, logB) => new Date(logB.modified).getTime() - new Date(logA.modified).getTime()),
  );
  return groups;
}
export { latestLogPerSession, LogSelector, createLogSinkRef, useRedrawnValues };
