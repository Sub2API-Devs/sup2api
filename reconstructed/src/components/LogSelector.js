/**
 * components/LogSelector.tsx
 *
 * 会话选择器（/resume 列表）：搜索、按项目/全部项目切换、按标签与 PR/分支分组、worktree 检测、片段预览。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogSelector.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-52dd7zdd.js (1), chunk-63641kq7.js (1), chunk-b79vwm1h.js (13)
 * attribution: fingerprint 10, file-local 1, layout 4, callgraph-fingerprint 1
 */
import { sep, basename } from "path";
import { truncateToWidth, formatLogMetadata } from "../utils/format.js";
import { sequential } from "../utils/sequential.js";
import { PR_URL_RE_2, parsePrUrl_2 } from "../tools/shared/gitOperationTracking.js";
import { BOXED_DIAMOND_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getLogDisplayTitle } from "../utils/log.js";
import { useTheme_2, useResolvedTheme } from "./design-system/ThemeProvider.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useGlobalExitKeybindings, useKeybinding } from "../keybindings/useKeybinding.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useClock } from "../ink/components/ClockContext.js";
import { Q, y, eJ, P, R } from "../../vendor/react/cjs/react.production.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
import { renderCompactSummaryText } from "./CompactSummary.js";
import { renderPluginPromptColon } from "../utils/messages/pluginPrompts.js";
import { fieldKey } from "./pluginUi/render/RenderInstance.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-b79vwm1h.js:7428-7495 file-local
function normalizeAndTruncateToWidth(text, maxWidth) {
  let normalized = text.replace(/\s+/g, " ").trim();
  return truncateToWidth(normalized, maxWidth);
}
//@ chunk-b79vwm1h.js:7495-7541 layout
var LOG_MIN_LINES = 2;
var LOG_MAX_LINES = 4;
var LOG_REFRESH_MS = 2000;
var LOG_TAIL_MS = 1000;
var LOG_MAX_BYTES = 50000;
var LOG_DIM_RATIO = 0.3;
//@ chunk-b79vwm1h.js:7541-7612 layout
var LOG_SHORTCUT_FORMAT = {
  format: {
    modCase: "title",
    charCase: "upper",
  },
};
var LOG_STALE_MS = 60000;
var LOG_MAX_ENTRIES = 50;
var LOG_RETRY_COUNT = 5;
//@ chunk-b79vwm1h.js:7612-7686 fingerprint = formatSnippet (1)
function formatSnippet({ before, match, after }, highlightColor) {
  return sequential.dim(before) + highlightColor(match) + sequential.dim(after);
}
//@ chunk-b79vwm1h.js:7686-7827 layout
function formatPrUrlsInQuery(searchQuery) {
  return searchQuery.replace(new RegExp(PR_URL_RE_2.source + '[^,\\s"]*', "g"), (d) => {
    let prUrl = parsePrUrl_2(d);
    return prUrl ? `PR #${prUrl.prNumber} ${prUrl.prRepository}` : d;
  });
}
//@ chunk-b79vwm1h.js:7827-8165 fingerprint = extractSnippet (1)
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
//@ chunk-b79vwm1h.js:8165-8496 fingerprint = buildLogLabel (0.948)
function buildLogLabel(log, maxLabelWidth, options) {
  let { isGroupHeader = false, isChild = false, forkCount = 0 } = options || {};
  let prefixWidth = isGroupHeader && forkCount > 0 ? LOG_MIN_LINES : isChild ? LOG_MAX_LINES : 0;
  let p =
    isGroupHeader && forkCount > 0
      ? ` (+${forkCount} other ${forkCount === 1 ? "session" : "sessions"})`
      : "";
  let _ = log.isSidechain ? " (sidechain)" : "";
  let F =
    log.artifactCount !== undefined && log.artifactCount > 0
      ? `  ${BOXED_DIAMOND_GLYPH} ${log.artifactCount}`
      : "";
  let maxSummaryWidth = maxLabelWidth - prefixWidth - _.length - p.length - bunStringWidth(F);
  return `${normalizeAndTruncateToWidth(getLogDisplayTitle(log), maxSummaryWidth)}${_}${p}${F}`;
}
//@ chunk-b79vwm1h.js:8496-8641 fingerprint = buildLogMetadata (1)
function buildLogMetadata(log, options) {
  let { isChild = false, showProjectPath = false } = options || {};
  let childPadding = isChild ? "    " : "";
  let baseMetadata = formatLogMetadata(log);
  let projectSuffix = showProjectPath && log.projectPath ? ` \xB7 ${log.projectPath}` : "";
  return childPadding + baseMetadata + projectSuffix;
}
//@ chunk-b79vwm1h.js:8641-18667 fingerprint = LogSelector (0.634)
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
  let Se = forceWidth === undefined ? scrollViewportSize.columns : forceWidth;
  let globalExitKeybindings = useGlobalExitKeybindings(onCancel);
  let ee = false;
  let M = stableEmptyObject(false);
  let T = LOG_SHORTCUT_FORMAT;
  let qe = "show all projects";
  let te = 2;
  let isTerminalFocused = useTerminalFocus();
  let terminalSize = useClock();
  let Te = false;
  let isTerminalFocused_2 = useResolvedTheme();
  let highlightColor = Q(
    () => (text) => applyColor(text, isTerminalFocused_2.warning),
    [isTerminalFocused_2.warning],
  );
  let re = Q(() => (footerNote === undefined ? 0 : bunStringWidth(footerNote.join(" \xB7 "))), [footerNote]);
  let [A, W] = y(null);
  let [K, vt] = y(true);
  let [de, ft] = y(false);
  let [Le, ze] = y(false);
  let [_t, V] = y(null);
  let [Xe, Rt] = y(null);
  let [ke, Ye] = y([]);
  let [Ze, le] = y(false);
  let project = useProject();
  let [cwd] = y(() => project.originalCwd);
  let [Oe, J] = y("");
  let [tt, mt] = y(0);
  let [nt, ot] = y(new Set());
  let [U, ht] = y(null);
  let [we, Ft] = y(1);
  let [x, D] = y(initialSearchQuery ? "search" : "list");
  let [ue, gt] = y(null);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: x === "search",
    onExit: () => {
      D("list");
      logEvent("tengu_session_search_toggled", {
        enabled: false,
      });
    },
    onExitUp: () => {
      D("list");
      logEvent("tengu_session_search_toggled", {
        enabled: false,
      });
    },
    passthroughCtrlKeys: logs.length === 0 ? ["n", "a"] : ["n"],
    initialQuery: initialSearchQuery || "",
  });
  let De = formatPrUrlsInQuery(searchQuery);
  let z = eJ(De);
  let [query, st] = y("");
  P(() => {
    if (!z) {
      st("");
      return;
    }
    return terminalSize.setTimeout(() => st(z), 300);
  }, [z, terminalSize]);
  let [se, Be] = y(null);
  let bt = false;
  P(() => {
    getBranch().then((branch) => W(branch));
    let now = Date.now();
    getWorktreePathsPortable(cwd)
      .then(async (worktreePathsPortable) => {
        worktreePathsPortable.length;
        return worktreePathsPortable;
      })
      .then((i) => {
        logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: i.length,
          success: true,
        });
        ze(i.length > 1);
        Ye(i);
        V(i[0] ?? null);
        let filtered = i.filter((branch) => cwd === branch || cwd.startsWith(branch + sep));
        filtered.sort((f, L) => L.length - f.length);
        Rt(filtered[0] ?? null);
        le(true);
      })
      .catch(() => {
        logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: 0,
          success: false,
        });
        le(true);
      });
  }, [cwd]);
  let it = Q(() => new Map(logs.map((paths) => [paths, buildSearchableText(paths)])), [logs]);
  let We = Q(() => null, [logs, it, false]);
  let pe = Q(() => {
    let filtered = logs.filter((log) => {
      let sessionIdFromLog = getSessionIdFromLog(log);
      if (currentSessionId && sessionIdFromLog === currentSessionId) return true;
      if (log.customTitle ?? log.aiTitle) return true;
      if (getFirstMeaningfulUserMessageTextContent(log.messages)) return true;
      if (log.firstPrompt || log.customTitle || log.aiTitle) return true;
      return false;
    });
    if (!K && A) filtered = filtered.filter((log_3) => log_3.gitBranch === A);
    if (Le && !de && !showAllProjects) {
      let i = Xe ?? cwd;
      filtered = filtered.filter((log_4) => {
        if (log_4.isAlias) return true;
        let projectPath = log_4.projectPath;
        if (projectPath === undefined) return false;
        let L = null;
        for (let C of ke)
          if (projectPath === C || projectPath.startsWith(C + sep)) {
            if (L === null || C.length > L.length) L = C;
          }
        if (L === null) return projectPath === i;
        return L === i;
      });
    }
    return filtered;
  }, [logs, currentSessionId, K, A, Le, de, showAllProjects, cwd, Xe, ke]);
  let $e = Q(() => {
    if (!De) return pe;
    let query = De.toLowerCase();
    return pe.filter((log) => {
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
  }, [pe, De]);
  P(() => {
    Be(null);
    return;
  }, [query, z, We, false, terminalSize]);
  let { filteredLogs, snippets } = Q(() => {
    let t = new Map();
    let i = $e;
    if (se && query && se.query === query) {
      for (let result of se.results)
        if (result.searchableText) {
          let snippet = extractSnippet(result.searchableText, query, LOG_MAX_ENTRIES);
          if (snippet) t.set(result.log, snippet);
        }
      let h = new Set(i.map((log_7) => log_7.messages[0]?.uuid));
      let f = new Set(pe);
      let transcriptOnlyMatches = se.results
        .map((C) => C.log)
        .filter((C) => !h.has(C.messages[0]?.uuid) && f.has(C));
      i = [...i, ...transcriptOnlyMatches];
    }
    return {
      filteredLogs: i,
      snippets: t,
    };
  }, [$e, se, query, pe]);
  let me = Se - 2 * PANE_PADDING;
  let maxLabelWidth = Math.max(30, me - 4);
  let nodes = Q(() => {
    let sessionGroups = groupLogsBySessionId(filteredLogs);
    return Array.from(sessionGroups.entries()).map(([sessionId, groupLogs]) => {
      let latestLog = groupLogs[0];
      let indexInFiltered = filteredLogs.indexOf(latestLog);
      let snippet = snippets.get(latestLog);
      let snippetStr = snippet ? formatSnippet(snippet, highlightColor) : null;
      if (groupLogs.length === 1) {
        let metadata = buildLogMetadata(latestLog, {
          showProjectPath: showAllProjects,
        });
        return {
          id: `log:${sessionId}:0`,
          value: {
            log: latestLog,
            indexInFiltered,
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
        let childIndexInFiltered = filteredLogs.indexOf(log);
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
            indexInFiltered: childIndexInFiltered,
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
          indexInFiltered,
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
  }, [filteredLogs, maxLabelWidth, showAllProjects, snippets, highlightColor]);
  let log = U?.value.log ?? null;
  let Dn = () => {
    if (!log) return "";
    let sessionId = getSessionIdFromLog(log);
    if (!sessionId) return "";
    let sessionLogs = filteredLogs.filter((log) => getSessionIdFromLog(log) === sessionId);
    if (!(sessionLogs.length > 1)) return "";
    let isExpanded = nt.has(sessionId);
    if (sessionLogs.indexOf(log) > 0 || isExpanded)
      return jsxProd_default(KeyboardShortcutHint, {
        chord: "left",
        action: "collapse",
        ...M,
      });
    return jsxProd_default(KeyboardShortcutHint, {
      chord: "right",
      action: "expand",
      ...M,
    });
  };
  let onSubmit = async () => {
    let sessionId = log ? getSessionIdFromLog(log) : undefined;
    if (!log || !sessionId) {
      D("list");
      J("");
      return;
    }
    if (Oe.trim()) {
      await saveCustomTitle(sessionId, Oe.trim(), log.fullPath, "user", storageV5);
      if (onLogsChanged) onLogsChanged();
    }
    D("list");
    J("");
  };
  let Pn = () => {
    D("list");
    setSearchQuery("");
    logEvent("tengu_session_search_toggled", {
      enabled: false,
    });
  };
  let onUpFromFirstItem = () => {
    D("search");
    logEvent("tengu_session_search_toggled", {
      enabled: true,
    });
  };
  P(() => {
    if (reloadGeneration === 0) return;
    Be(null);
  }, [reloadGeneration]);
  let onFocus = (node) => {
    ht(node);
    let index = filteredLogs.findIndex(
      (log) => getSessionIdFromLog(log) === getSessionIdFromLog(node.value.log),
    );
    if (index >= 0) Ft(index + 1);
  };
  useKeybinding(
    "confirm:no",
    () => {
      D("list");
      J("");
    },
    {
      context: "Settings",
      isActive: x === "rename",
    },
  );
  function Rn(prev) {
    if (x === "preview") return;
    if (x === "rename");
    else if (x === "search") {
      handleKeyDown(prev);
      if (prev.ctrl && prev.key === "n") {
        prev.preventDefault();
        Pn();
      } else if (prev.ctrl && prev.key === "a" && onToggleAllProjects && logs.length === 0) {
        prev.preventDefault();
        onToggleAllProjects();
        logEvent("tengu_session_all_projects_toggled", {
          enabled: showAllProjects,
        });
      }
    } else {
      if (filteredLogs.length === 0 && (prev.key === "up" || prev.key === "down" || prev.key === "return")) {
        prev.preventDefault();
        D("search");
        return;
      }
      let i = !prev.ctrl && !prev.meta;
      let lowerInput = prev.key.toLowerCase();
      if (prev.ctrl && prev.key === "a" && onToggleAllProjects) {
        prev.preventDefault();
        onToggleAllProjects();
        logEvent("tengu_session_all_projects_toggled", {
          enabled: showAllProjects,
        });
      } else if (prev.ctrl && prev.key === "b") {
        prev.preventDefault();
        let newEnabled = !K;
        vt(newEnabled);
        logEvent("tengu_session_branch_filter_toggled", {
          enabled: !newEnabled,
        });
      } else if (prev.ctrl && prev.key === "w" && Le) {
        prev.preventDefault();
        let newValue = !de;
        ft(newValue);
        logEvent("tengu_session_worktree_filter_toggled", {
          enabled: !newValue,
        });
      } else if (lowerInput === "/" && i) {
        prev.preventDefault();
        D("search");
        logEvent("tengu_session_search_toggled", {
          enabled: true,
        });
      } else if (prev.ctrl && prev.key === "r" && log) {
        prev.preventDefault();
        D("rename");
        J("");
        logEvent("tengu_session_rename_started", {});
      } else if (((prev.key === " " && i) || (prev.ctrl && prev.key === "v")) && log) {
        prev.preventDefault();
        gt(log);
        D("preview");
        logEvent("tengu_session_preview_opened", {
          messageCount: log.messageCount,
        });
      } else if (!prev.defaultPrevented && i && prev.key.length === 1 && prev.key !== " ") {
        prev.preventDefault();
        D("search");
        setSearchQuery(prev.key);
        logEvent("tengu_session_search_toggled", {
          enabled: true,
        });
      }
    }
  }
  function Fn(event) {
    if (x === "search") {
      handlePaste(event);
      return;
    }
    let trimmed = (event.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (x === "preview" || x === "rename" || !log || !trimmed) return;
    event.preventDefault();
    D("search");
    setSearchQuery(trimmed);
    logEvent("tengu_session_search_toggled", {
      enabled: true,
    });
  }
  let _e = [];
  let Mt = !!onToggleAllProjects && !showAllProjects && Ze;
  let Bt = _t ?? cwd;
  if (Mt) _e.push(basename(Bt));
  if (!K && A) _e.push(A);
  if (Le && !de && !showAllProjects) {
    let t = Xe ?? cwd;
    if (!(Mt && Bt === t)) _e.push(basename(t));
  }
  let kn = !!onToggleAllProjects && !showAllProjects && !Ze;
  let Wt = (_e.length > 0 || kn) && x !== "search";
  let $t = 3;
  let On = 5 + $t + (Wt ? 1 : 0);
  let At = footerNote !== undefined && x !== "rename" && re <= me - 2 && maxHeight - (5 + $t + 1) - 3 >= 3;
  let Mn = 2 + (At ? 1 : 0);
  let visibleCount = Math.max(1, Math.floor((maxHeight - On - Mn) / 3));
  let Bn = logs.length;
  let at = R({
    focusedIndex: -1,
    visible: -1,
    empty: 0,
  });
  P(() => {
    if (!onLoadMore) return;
    let t = at.current;
    if (t.focusedIndex !== we || t.visible !== filteredLogs.length)
      at.current = {
        focusedIndex: we,
        visible: filteredLogs.length,
        empty: 0,
      };
    let i = visibleCount * 2;
    if (we + i >= filteredLogs.length && at.current.empty < LOG_RETRY_COUNT) {
      at.current.empty++;
      onLoadMore(visibleCount * 3);
    }
  }, [we, visibleCount, filteredLogs.length, Bn, onLoadMore]);
  if (logs.length === 0 && !onToggleAllProjects) return null;
  if (x === "preview" && ue)
    return jsxProd_default(SessionPreview, {
      log: ue,
      onExit: () => {
        D("list");
        gt(null);
      },
      onSelect,
    });
  return jsxProd_default(Box, {
    flexDirection: "column",
    maxHeight: maxHeight - 1,
    onKeyDown: Rn,
    onPaste: Fn,
    children: jsxProd_default_2(ResumeSessionPane, {
      isRedesign: false,
      titleDetail: jsxProd_default_2(Fragment, {
        children: [
          x === "list" &&
            filteredLogs.length > visibleCount &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" ", "(", we, " of ", filteredLogs.length, ")"],
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
          isFocused: x === "search",
          isTerminalFocused,
          cursorOffset: searchCursorOffset,
          isSearchLineUnpadded: true,
        }),
        Wt &&
          (_e.length > 0
            ? jsxProd_default(Box, {
                flexShrink: 0,
                paddingLeft: 2,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: jsxProd_default(Byline, {
                    children: _e,
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
        (x === "search" || x === "list") &&
          Boolean(searchQuery.trim()) &&
          filteredLogs.length === 0 &&
          !bt &&
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
          x === "list" &&
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
                    ...T,
                  }),
              children: showAllProjects
                ? "No conversations found."
                : "No conversations found in this project.",
            }),
          }),
        x === "rename" && log
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
                    value: Oe,
                    onChange: J,
                    onSubmit,
                    placeholder: getLogDisplayTitle(log, "Enter new session name"),
                    columns: me - 2,
                    cursorOffset: tt,
                    onChangeCursorOffset: mt,
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
              focusNodeId: U?.id,
              visibleOptionCount: visibleCount,
              layout: "expanded",
              isDisabled: x === "search",
              hidePromptWhileDisabled: true,
              hideIndexes: false,
              isNodeExpanded: (nodeId) => {
                if (x === "search" || !K) return true;
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                return sessionId ? nt.has(sessionId) : false;
              },
              onExpand: (nodeId) => {
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                if (sessionId) {
                  ot((prev) => new Set(prev).add(sessionId));
                  logEvent("tengu_session_group_expanded", {});
                }
              },
              onCollapse: (nodeId) => {
                let sessionId =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                if (sessionId)
                  ot((prev) => {
                    let newSet = new Set(prev);
                    newSet.delete(sessionId);
                    return newSet;
                  });
              },
              onUpFromFirstItem,
            }),
        At &&
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
            : x === "rename"
              ? jsxProd_default(Text, {
                  dimColor: true,
                  italic: false,
                  children: jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "enter",
                        action: "save",
                        ...M,
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "confirm:no",
                        context: "Confirmation",
                        fallback: "Esc",
                        description: "cancel",
                        ...M,
                      }),
                    ],
                  }),
                })
              : x === "search"
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
                            ...T,
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "select",
                          ...M,
                        }),
                        jsxProd_default(ConfigurableShortcutHint, {
                          action: "confirm:no",
                          context: "Confirmation",
                          fallback: "Esc",
                          description: "clear",
                          ...M,
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
                            ...T,
                          }),
                        A &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+b",
                            action: K ? "only show current branch" : "show all branches",
                            ...T,
                          }),
                        Le &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+w",
                            action: de ? "only show current worktree" : "show all worktrees",
                            ...T,
                          }),
                        log &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "space",
                            action: "preview",
                            ...M,
                          }),
                        log &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+r",
                            action: "rename",
                            ...T,
                          }),
                        jsxProd_default(Text, {
                          children: "Type to search",
                        }),
                        jsxProd_default(ConfigurableShortcutHint, {
                          action: "confirm:no",
                          context: "Confirmation",
                          fallback: "Esc",
                          description: "cancel",
                          format: M.format,
                        }),
                        Dn(),
                      ],
                    }),
                  }),
        }),
      ],
    }),
  });
}
//@ chunk-b79vwm1h.js:18667-18971 layout
/**
 * 会话恢复面板：显示“Resume session”标题与附加说明，下方放子内容。
 */
function ResumeSessionPane(props) {
  let $ = w(5);
  let { titleDetail, children } = props;
  let u;
  if ($[0] !== titleDetail) {
    u = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        bold: true,
        color: "suggestion",
        children: ["Resume session", titleDetail],
      }),
    });
    $[0] = titleDetail;
    $[1] = u;
  } else u = $[1];
  let m;
  if ($[2] !== children || $[3] !== u) {
    m = jsxProd_default_2(Pane, {
      color: "suggestion",
      children: [u, children],
    });
    $[2] = children;
    $[3] = u;
    $[4] = m;
  } else m = $[4];
  return m;
}
//@ chunk-b79vwm1h.js:18971-19421 callgraph-fingerprint = extractSearchableText (0.465)
function extractSearchableText(message) {
  if (message.type !== "user" && message.type !== "assistant") return "";
  let content = "message" in message ? message.message?.content : undefined;
  if (!content) return "";
  let modelOnlyText = message.type === "user" && message.isCompactSummary ? message.modelOnlyText : undefined;
  if (typeof content === "string")
    return renderCompactSummaryText(
      renderPluginPromptColon(content, message.type === "user" ? message.pluginPrompt : undefined),
      modelOnlyText,
    );
  if (Array.isArray(content))
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if ("text" in block && typeof block.text === "string")
          return renderCompactSummaryText(block.text, modelOnlyText);
        return "";
      })
      .filter(Boolean)
      .join(" ");
  return "";
}
//@ chunk-b79vwm1h.js:19421-19785 fingerprint = buildSearchableText (0.887)
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
//@ chunk-b79vwm1h.js:19785-19999 fingerprint = groupLogsBySessionId (1)
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
    logs.sort((l, u) => new Date(u.modified).getTime() - new Date(l.modified).getTime()),
  );
  return groups;
}
//@ chunk-18hwfzwa.js:485439-485686 fingerprint = getUniqueTags (0.489)
function getUniqueTags(h, x, D) {
  let L = R(new Map());
  P(() => {
    let ee = [];
    for (let log of h) {
      if (log.tag !== x) continue;
      let Re = fieldKey(log.plugin, log.element);
      if (L.current.has(Re) && L.current.get(Re) !== log.value) ee.push(Re);
      L.current.set(Re, log.value);
    }
    if (ee.length > 0) D(ee);
  }, [h, x, D]);
}
//@ chunk-52dd7zdd.js:457-534 fingerprint = _temp7 (0.578)
function createLogSinkRef() {
  let o = {
    log() {},
    hookFailed() {},
  };
  return {
    set: (r) => {
      o = r;
    },
    get: () => o,
  };
}
//@ chunk-63641kq7.js:5273-5307 fingerprint = _temp2 (0.643)
var LogSelectorOptionsSchema = DoctorLazy(() =>
  u({
    customTitle: string(),
  }),
);
export { getUniqueTags, LogSelector, createLogSinkRef, LogSelectorOptionsSchema };
