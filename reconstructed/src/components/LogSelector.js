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
import { sep, sep as sep_2, basename } from "path";
import { truncateToWidth, formatLogMetadata } from "../utils/format.js";
import { sequential } from "../utils/sequential.js";
import { PR_URL_RE, parsePrUrl_2 } from "../tools/shared/gitOperationTracking.js";
import { hf } from "../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getLogDisplayTitle } from "../utils/log.js";
import { Me, useResolvedTheme } from "./design-system/ThemeProvider.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useGlobalExitKeybindings, useKeybinding } from "../keybindings/useKeybinding.js";
import { nd } from "../utils/stableEmptyObject.js";
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
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { t7 } from "../utils/messages/pluginPrompts.js";
import { fieldKey } from "./pluginUi/render/RenderInstance.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-b79vwm1h.js:7428-7495 file-local
function normalizeAndTruncateToWidth(text, maxWidth) {
  let normalized = text.replace(/\s+/g, " ").trim();
  return truncateToWidth(normalized, maxWidth);
}
//@ chunk-b79vwm1h.js:7495-7541 layout
var wo = 2,
  Io = 4,
  Do = 2000,
  En = 1000,
  Tn = 50000,
  No = 0.3;
//@ chunk-b79vwm1h.js:7541-7612 layout
var Po = { format: { modCase: "title", charCase: "upper" } },
  vo = 60000,
  Ro = 50,
  Fo = 5;
//@ chunk-b79vwm1h.js:7612-7686 fingerprint = formatSnippet (1)
function formatSnippet({ before: before, match: match, after: after }, highlightColor) {
  return sequential.dim(before) + highlightColor(match) + sequential.dim(after);
}
//@ chunk-b79vwm1h.js:7686-7827 layout
function formatPrUrlsInQuery(o) {
  return o.replace(new RegExp(PR_URL_RE.source + '[^,\\s"]*', "g"), (d) => {
    let c = parsePrUrl_2(d);
    return c ? `PR #${c.prNumber} ${c.prRepository}` : d;
  });
}
//@ chunk-b79vwm1h.js:7827-8165 fingerprint = extractSnippet (1)
function extractSnippet(text, query, contextChars) {
  let matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex === -1) return null;
  let matchEnd = matchIndex + query.length,
    snippetStart = Math.max(0, matchIndex - contextChars),
    snippetEnd = Math.min(text.length, matchEnd + contextChars),
    beforeRaw = text.slice(snippetStart, matchIndex),
    matchText = text.slice(matchIndex, matchEnd),
    afterRaw = text.slice(matchEnd, snippetEnd);
  return {
    before: (snippetStart > 0 ? "\u2026" : "") + beforeRaw.replace(/\s+/g, " ").trimStart(),
    match: matchText.trim(),
    after: afterRaw.replace(/\s+/g, " ").trimEnd() + (snippetEnd < text.length ? "\u2026" : ""),
  };
}
//@ chunk-b79vwm1h.js:8165-8496 fingerprint = buildLogLabel (0.948)
function buildLogLabel(log, maxLabelWidth, options) {
  let { isGroupHeader: isGroupHeader = !1, isChild: isChild = !1, forkCount: forkCount = 0 } = options || {},
    b = isGroupHeader && forkCount > 0 ? wo : isChild ? Io : 0,
    p =
      isGroupHeader && forkCount > 0
        ? ` (+${forkCount} other ${forkCount === 1 ? "session" : "sessions"})`
        : "",
    _ = log.isSidechain ? " (sidechain)" : "",
    F = log.artifactCount !== void 0 && log.artifactCount > 0 ? `  ${hf} ${log.artifactCount}` : "",
    maxSummaryWidth = maxLabelWidth - b - _.length - p.length - bunStringWidth(F);
  return `${normalizeAndTruncateToWidth(getLogDisplayTitle(log), maxSummaryWidth)}${_}${p}${F}`;
}
//@ chunk-b79vwm1h.js:8496-8641 fingerprint = buildLogMetadata (1)
function buildLogMetadata(log, options) {
  let { isChild: isChild = !1, showProjectPath: showProjectPath = !1 } = options || {},
    u = isChild ? "    " : "",
    baseMetadata = formatLogMetadata(log),
    b = showProjectPath && log.projectPath ? ` \xB7 ${log.projectPath}` : "";
  return u + baseMetadata + b;
}
/**
 * 会话选择器：显示会话列表（标题、时间、消息数、分支/PR、标签），支持搜索（tengu_session_search_toggled）、所有项目切换、按 sessionId 分组、worktree 检测与预览。
 */
//@ chunk-b79vwm1h.js:8641-18667 fingerprint = LogSelector (0.634)
function LogSelector({
  logs: logs,
  maxHeight: maxHeight = 1 / 0,
  forceWidth: forceWidth,
  onCancel: onCancel,
  onSelect: onSelect,
  onLogsChanged: onLogsChanged,
  onLoadMore: onLoadMore,
  initialSearchQuery: initialSearchQuery,
  isLoading: isLoading = !1,
  reloadGeneration: reloadGeneration = 0,
  showAllProjects: showAllProjects = !1,
  onToggleAllProjects: onToggleAllProjects,
  currentSessionId: currentSessionId,
  footerNote: footerNote,
}) {
  let { storageV5: storageV5 } = Me(),
    Fe = useScrollViewportSize(useTerminalSize()),
    Se = forceWidth === void 0 ? Fe.columns : forceWidth,
    Ce = useGlobalExitKeybindings(onCancel),
    ee = !1,
    M = nd(!1),
    T = Po,
    qe = "show all projects",
    te = 2,
    G = useTerminalFocus(),
    terminalSize = useClock(),
    Te = !1,
    isTerminalFocused = useResolvedTheme(),
    oe = Q(() => (text) => applyColor(text, isTerminalFocused.warning), [isTerminalFocused.warning]),
    re = Q(() => (footerNote === void 0 ? 0 : bunStringWidth(footerNote.join(" \xB7 "))), [footerNote]),
    [A, W] = y(null),
    [K, vt] = y(!0),
    [de, ft] = y(!1),
    [Le, ze] = y(!1),
    [_t, V] = y(null),
    [Xe, Rt] = y(null),
    [ke, Ye] = y([]),
    [Ze, le] = y(!1),
    et = useProject(),
    [H] = y(() => et.originalCwd),
    [Oe, J] = y(""),
    [tt, mt] = y(0),
    [nt, ot] = y(new Set()),
    [U, ht] = y(null),
    [we, Ft] = y(1),
    [x, D] = y(initialSearchQuery ? "search" : "list"),
    [ue, gt] = y(null),
    {
      query: searchQuery,
      setQuery: setSearchQuery,
      cursorOffset: searchCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({
      isActive: x === "search",
      onExit: () => {
        (D("list"), logEvent("tengu_session_search_toggled", { enabled: !1 }));
      },
      onExitUp: () => {
        (D("list"), logEvent("tengu_session_search_toggled", { enabled: !1 }));
      },
      passthroughCtrlKeys: logs.length === 0 ? ["n", "a"] : ["n"],
      initialQuery: initialSearchQuery || "",
    }),
    De = formatPrUrlsInQuery(searchQuery),
    z = eJ(De),
    [O, st] = y("");
  P(() => {
    if (!z) {
      st("");
      return;
    }
    return terminalSize.setTimeout(() => st(z), 300);
  }, [z, terminalSize]);
  let [se, Be] = y(null),
    bt = !1;
  P(() => {
    getBranch().then((i) => W(i));
    let now = Date.now();
    getWorktreePathsPortable(H)
      .then(async (i) => (i.length, i))
      .then((i) => {
        (logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: i.length,
          success: !0,
        }),
          ze(i.length > 1),
          Ye(i),
          V(i[0] ?? null));
        let filtered = i.filter((branch) => H === branch || H.startsWith(branch + sep));
        (filtered.sort((f, L) => L.length - f.length), Rt(filtered[0] ?? null), le(!0));
      })
      .catch(() => {
        (logEvent("tengu_worktree_detection", {
          duration_ms: Date.now() - now,
          worktree_count: 0,
          success: !1,
        }),
          le(!0));
      });
  }, [H]);
  let it = Q(() => new Map(logs.map((paths) => [paths, buildSearchableText(paths)])), [logs]),
    We = Q(() => null, [logs, it, !1]),
    pe = Q(() => {
      let filtered = logs.filter((log_2) => {
        let h = getSessionIdFromLog(log_2);
        if (currentSessionId && h === currentSessionId) return !0;
        if (log_2.customTitle ?? log_2.aiTitle) return !0;
        if (getFirstMeaningfulUserMessageTextContent(log_2.messages)) return !0;
        if (log_2.firstPrompt || log_2.customTitle || log_2.aiTitle) return !0;
        return !1;
      });
      if (!K && A) filtered = filtered.filter((log_3) => log_3.gitBranch === A);
      if (Le && !de && !showAllProjects) {
        let i = Xe ?? H;
        filtered = filtered.filter((log_4) => {
          if (log_4.isAlias) return !0;
          let projectPath = log_4.projectPath;
          if (projectPath === void 0) return !1;
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
    }, [logs, currentSessionId, K, A, Le, de, showAllProjects, H, Xe, ke]),
    $e = Q(() => {
      if (!De) return pe;
      let query = De.toLowerCase();
      return pe.filter((log_5) => {
        let displayedTitle = getLogDisplayTitle(log_5).toLowerCase(),
          branch_0 = (log_5.gitBranch || "").toLowerCase(),
          tag = (log_5.tag || "").toLowerCase(),
          C = log_5.prNumber ? `pr #${log_5.prNumber} ${log_5.prRepository || ""}`.toLowerCase() : "";
        return (
          displayedTitle.includes(query) ||
          branch_0.includes(query) ||
          tag.includes(query) ||
          C.includes(query)
        );
      });
    }, [pe, De]);
  P(() => {
    Be(null);
    return;
  }, [O, z, We, !1, terminalSize]);
  let { filteredLogs: filteredLogs, snippets: snippets } = Q(() => {
      let t = new Map(),
        i = $e;
      if (se && O && se.query === O) {
        for (let result of se.results)
          if (result.searchableText) {
            let snippet = extractSnippet(result.searchableText, O, Ro);
            if (snippet) t.set(result.log, snippet);
          }
        let h = new Set(i.map((log_7) => log_7.messages[0]?.uuid)),
          f = new Set(pe),
          transcriptOnlyMatches = se.results
            .map((C) => C.log)
            .filter((C) => !h.has(C.messages[0]?.uuid) && f.has(C));
        i = [...i, ...transcriptOnlyMatches];
      }
      return { filteredLogs: i, snippets: t };
    }, [$e, se, O, pe]),
    me = Se - 2 * PANE_PADDING,
    maxLabelWidth = Math.max(30, me - 4),
    Ot = Q(() => {
      let sessionGroups = groupLogsBySessionId(filteredLogs);
      return Array.from(sessionGroups.entries()).map(([i, h]) => {
        let f = h[0],
          indexInFiltered = filteredLogs.indexOf(f),
          snippet_0 = snippets.get(f),
          ge = snippet_0 ? formatSnippet(snippet_0, oe) : null;
        if (h.length === 1) {
          let metadata = buildLogMetadata(f, { showProjectPath: showAllProjects });
          return {
            id: `log:${i}:0`,
            value: { log: f, indexInFiltered: indexInFiltered },
            label: buildLogLabel(f, maxLabelWidth),
            description: ge
              ? `${metadata}
  ${ge}`
              : metadata,
            dimDescription: !0,
          };
        }
        let Wn = h.length - 1,
          children = h.slice(1).map((log_8, index) => {
            let childIndexInFiltered = filteredLogs.indexOf(log_8),
              childSnippet = snippets.get(log_8),
              jt = childSnippet ? formatSnippet(childSnippet, oe) : null,
              childMetadata = buildLogMetadata(log_8, { isChild: !0, showProjectPath: showAllProjects });
            return {
              id: `log:${i}:${index + 1}`,
              value: { log: log_8, indexInFiltered: childIndexInFiltered },
              label: buildLogLabel(log_8, maxLabelWidth, { isChild: !0 }),
              description: jt
                ? `${childMetadata}
      ${jt}`
                : childMetadata,
              dimDescription: !0,
            };
          }),
          parentMetadata = buildLogMetadata(f, { showProjectPath: showAllProjects });
        return {
          id: `group:${i}`,
          value: { log: f, indexInFiltered: indexInFiltered },
          label: buildLogLabel(f, maxLabelWidth, { isGroupHeader: !0, forkCount: Wn }),
          description: ge
            ? `${parentMetadata}
  ${ge}`
            : parentMetadata,
          dimDescription: !0,
          children: children,
        };
      });
    }, [filteredLogs, maxLabelWidth, showAllProjects, snippets, oe]),
    v = U?.value.log ?? null,
    Dn = () => {
      if (!v) return "";
      let sessionId_0 = getSessionIdFromLog(v);
      if (!sessionId_0) return "";
      let sessionLogs = filteredLogs.filter((log_10) => getSessionIdFromLog(log_10) === sessionId_0);
      if (!(sessionLogs.length > 1)) return "";
      let isExpanded = nt.has(sessionId_0);
      if (sessionLogs.indexOf(v) > 0 || isExpanded)
        return e(KeyboardShortcutHint, { chord: "left", action: "collapse", ...M });
      return e(KeyboardShortcutHint, { chord: "right", action: "expand", ...M });
    },
    Nn = async () => {
      let t = v ? getSessionIdFromLog(v) : void 0;
      if (!v || !t) {
        (D("list"), J(""));
        return;
      }
      if (Oe.trim()) {
        if ((await saveCustomTitle(t, Oe.trim(), v.fullPath, "user", storageV5), onLogsChanged))
          onLogsChanged();
      }
      (D("list"), J(""));
    },
    Pn = () => {
      (D("list"), setSearchQuery(""), logEvent("tengu_session_search_toggled", { enabled: !1 }));
    },
    vn = () => {
      (D("search"), logEvent("tengu_session_search_toggled", { enabled: !0 }));
    };
  P(() => {
    if (reloadGeneration === 0) return;
    Be(null);
  }, [reloadGeneration]);
  let _n = (value) => {
    ht(value);
    let index_2 = filteredLogs.findIndex(
      (log_12) => getSessionIdFromLog(log_12) === getSessionIdFromLog(value.value.log),
    );
    if (index_2 >= 0) Ft(index_2 + 1);
  };
  useKeybinding(
    "confirm:no",
    () => {
      (D("list"), J(""));
    },
    { context: "Settings", isActive: x === "rename" },
  );
  function Rn(prev) {
    if (x === "preview") return;
    if (x === "rename");
    else if (x === "search") {
      if ((handleKeyDown(prev), prev.ctrl && prev.key === "n")) (prev.preventDefault(), Pn());
      else if (prev.ctrl && prev.key === "a" && onToggleAllProjects && logs.length === 0)
        (prev.preventDefault(),
          onToggleAllProjects(),
          logEvent("tengu_session_all_projects_toggled", { enabled: showAllProjects }));
    } else {
      if (filteredLogs.length === 0 && (prev.key === "up" || prev.key === "down" || prev.key === "return")) {
        (prev.preventDefault(), D("search"));
        return;
      }
      let i = !prev.ctrl && !prev.meta,
        lowerInput = prev.key.toLowerCase();
      if (prev.ctrl && prev.key === "a" && onToggleAllProjects)
        (prev.preventDefault(),
          onToggleAllProjects(),
          logEvent("tengu_session_all_projects_toggled", { enabled: showAllProjects }));
      else if (prev.ctrl && prev.key === "b") {
        prev.preventDefault();
        let newEnabled = !K;
        (vt(newEnabled), logEvent("tengu_session_branch_filter_toggled", { enabled: !newEnabled }));
      } else if (prev.ctrl && prev.key === "w" && Le) {
        prev.preventDefault();
        let newValue = !de;
        (ft(newValue), logEvent("tengu_session_worktree_filter_toggled", { enabled: !newValue }));
      } else if (lowerInput === "/" && i)
        (prev.preventDefault(), D("search"), logEvent("tengu_session_search_toggled", { enabled: !0 }));
      else if (prev.ctrl && prev.key === "r" && v)
        (prev.preventDefault(), D("rename"), J(""), logEvent("tengu_session_rename_started", {}));
      else if (((prev.key === " " && i) || (prev.ctrl && prev.key === "v")) && v)
        (prev.preventDefault(),
          gt(v),
          D("preview"),
          logEvent("tengu_session_preview_opened", { messageCount: v.messageCount }));
      else if (!prev.defaultPrevented && i && prev.key.length === 1 && prev.key !== " ")
        (prev.preventDefault(),
          D("search"),
          setSearchQuery(prev.key),
          logEvent("tengu_session_search_toggled", { enabled: !0 }));
    }
  }
  function Fn(t) {
    if (x === "search") {
      handlePaste(t);
      return;
    }
    let trimmed = (t.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (x === "preview" || x === "rename" || !v || !trimmed) return;
    (t.preventDefault(),
      D("search"),
      setSearchQuery(trimmed),
      logEvent("tengu_session_search_toggled", { enabled: !0 }));
  }
  let _e = [],
    Mt = !!onToggleAllProjects && !showAllProjects && Ze,
    Bt = _t ?? H;
  if (Mt) _e.push(basename(Bt));
  if (!K && A) _e.push(A);
  if (Le && !de && !showAllProjects) {
    let t = Xe ?? H;
    if (!(Mt && Bt === t)) _e.push(basename(t));
  }
  let kn = !!onToggleAllProjects && !showAllProjects && !Ze,
    Wt = (_e.length > 0 || kn) && x !== "search",
    $t = 3,
    On = 5 + $t + (Wt ? 1 : 0),
    At = footerNote !== void 0 && x !== "rename" && re <= me - 2 && maxHeight - (5 + $t + 1) - 3 >= 3,
    Mn = 2 + (At ? 1 : 0),
    visibleCount = Math.max(1, Math.floor((maxHeight - On - Mn) / 3)),
    Bn = logs.length,
    at = R({ focusedIndex: -1, visible: -1, empty: 0 });
  if (
    (P(() => {
      if (!onLoadMore) return;
      let t = at.current;
      if (t.focusedIndex !== we || t.visible !== filteredLogs.length)
        at.current = { focusedIndex: we, visible: filteredLogs.length, empty: 0 };
      let i = visibleCount * 2;
      if (we + i >= filteredLogs.length && at.current.empty < Fo)
        (at.current.empty++, onLoadMore(visibleCount * 3));
    }, [we, visibleCount, filteredLogs.length, Bn, onLoadMore]),
    logs.length === 0 && !onToggleAllProjects)
  )
    return null;
  if (x === "preview" && ue)
    return e(SessionPreview, {
      log: ue,
      onExit: () => {
        (D("list"), gt(null));
      },
      onSelect: onSelect,
    });
  return e(Box, {
    flexDirection: "column",
    maxHeight: maxHeight - 1,
    onKeyDown: Rn,
    onPaste: Fn,
    children: r(ResumeSessionPane, {
      isRedesign: !1,
      titleDetail: r(Fragment, {
        children: [
          x === "list" &&
            filteredLogs.length > visibleCount &&
            r(Text, { dimColor: !0, children: [" ", "(", we, " of ", filteredLogs.length, ")"] }),
          isLoading && e(Text, { dimColor: !0, children: " \xB7 Refreshing\u2026" }),
        ],
      }),
      children: [
        e(SearchBox, {
          query: searchQuery,
          isFocused: x === "search",
          isTerminalFocused: G,
          cursorOffset: searchCursorOffset,
          isSearchLineUnpadded: !0,
        }),
        Wt &&
          (_e.length > 0
            ? e(Box, {
                flexShrink: 0,
                paddingLeft: 2,
                children: e(Text, { dimColor: !0, children: e(Byline, { children: _e }) }),
              })
            : e(Box, { flexShrink: 0, height: 1 })),
        e(Box, { flexShrink: 0, children: e(Text, { children: " " }) }),
        (x === "search" || x === "list") &&
          Boolean(searchQuery.trim()) &&
          filteredLogs.length === 0 &&
          !bt &&
          !isLoading &&
          e(Box, {
            paddingLeft: 1,
            marginBottom: 1,
            flexShrink: 0,
            children: r(HintText, { children: ['No sessions match "', searchQuery, '".'] }),
          }),
        logs.length === 0 &&
          x === "list" &&
          !isLoading &&
          !searchQuery.trim() &&
          e(Box, {
            paddingLeft: 1,
            marginBottom: 1,
            flexShrink: 0,
            children: e(HintText, {
              hint: showAllProjects
                ? void 0
                : e(KeyboardShortcutHint, { chord: "ctrl+a", action: "show all projects", ...T }),
              children: showAllProjects
                ? "No conversations found."
                : "No conversations found in this project.",
            }),
          }),
        x === "rename" && v
          ? r(Box, {
              paddingLeft: 2,
              flexDirection: "column",
              children: [
                e(Text, { bold: !0, children: "Rename session:" }),
                e(Box, {
                  paddingTop: 1,
                  children: e(TextInput, {
                    value: Oe,
                    onChange: J,
                    onSubmit: Nn,
                    placeholder: getLogDisplayTitle(v, "Enter new session name"),
                    columns: me - 2,
                    cursorOffset: tt,
                    onChangeCursorOffset: mt,
                    showCursor: !0,
                    focus: !0,
                  }),
                }),
              ],
            })
          : e(TreeSelect, {
              nodes: Ot,
              onSelect: (node_0) => {
                onSelect(node_0.value.log);
              },
              onFocus: _n,
              onCancel: onCancel,
              focusNodeId: U?.id,
              visibleOptionCount: visibleCount,
              layout: "expanded",
              isDisabled: x === "search",
              hidePromptWhileDisabled: !0,
              hideIndexes: !1,
              isNodeExpanded: (nodeId) => {
                if (x === "search" || !K) return !0;
                let i =
                  typeof nodeId === "string" && nodeId.startsWith("group:") ? nodeId.substring(6) : null;
                return i ? nt.has(i) : !1;
              },
              onExpand: (nodeId_0) => {
                let i =
                  typeof nodeId_0 === "string" && nodeId_0.startsWith("group:")
                    ? nodeId_0.substring(6)
                    : null;
                if (i) (ot((prev_0) => new Set(prev_0).add(i)), logEvent("tengu_session_group_expanded", {}));
              },
              onCollapse: (nodeId_1) => {
                let i =
                  typeof nodeId_1 === "string" && nodeId_1.startsWith("group:")
                    ? nodeId_1.substring(6)
                    : null;
                if (i)
                  ot((prev_1) => {
                    let newSet = new Set(prev_1);
                    return (newSet.delete(i), newSet);
                  });
              },
              onUpFromFirstItem: vn,
            }),
        At &&
          e(Box, {
            paddingLeft: 2,
            flexShrink: 0,
            children: e(Text, {
              dimColor: !0,
              wrap: "truncate-end",
              children: e(Byline, { children: footerNote }),
            }),
          }),
        e(Box, {
          paddingLeft: 2,
          children: Ce.pending
            ? r(Text, { dimColor: !0, italic: !1, children: ["Press ", Ce.keyName, " again to exit"] })
            : x === "rename"
              ? e(Text, {
                  dimColor: !0,
                  italic: !1,
                  children: r(Byline, {
                    children: [
                      e(KeyboardShortcutHint, { chord: "enter", action: "save", ...M }),
                      e(ConfigurableShortcutHint, {
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
                ? e(Text, {
                    dimColor: !0,
                    italic: !1,
                    children: r(Byline, {
                      children: [
                        e(Text, { children: "Type to Search" }),
                        logs.length === 0 &&
                          onToggleAllProjects &&
                          e(KeyboardShortcutHint, {
                            chord: "ctrl+a",
                            action: showAllProjects ? "only show current repo" : "show all projects",
                            ...T,
                          }),
                        e(KeyboardShortcutHint, { chord: "enter", action: "select", ...M }),
                        e(ConfigurableShortcutHint, {
                          action: "confirm:no",
                          context: "Confirmation",
                          fallback: "Esc",
                          description: "clear",
                          ...M,
                        }),
                      ],
                    }),
                  })
                : e(Text, {
                    dimColor: !0,
                    italic: !1,
                    children: r(Byline, {
                      children: [
                        onToggleAllProjects &&
                          e(KeyboardShortcutHint, {
                            chord: "ctrl+a",
                            action: showAllProjects ? "only show current repo" : "show all projects",
                            ...T,
                          }),
                        A &&
                          e(KeyboardShortcutHint, {
                            chord: "ctrl+b",
                            action: K ? "only show current branch" : "show all branches",
                            ...T,
                          }),
                        Le &&
                          e(KeyboardShortcutHint, {
                            chord: "ctrl+w",
                            action: de ? "only show current worktree" : "show all worktrees",
                            ...T,
                          }),
                        v && e(KeyboardShortcutHint, { chord: "space", action: "preview", ...M }),
                        v && e(KeyboardShortcutHint, { chord: "ctrl+r", action: "rename", ...T }),
                        e(Text, { children: "Type to search" }),
                        e(ConfigurableShortcutHint, {
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
/**
 * 会话恢复面板：显示“Resume session”标题与附加说明，下方放子内容。
 */
//@ chunk-b79vwm1h.js:18667-18971 layout
function ResumeSessionPane(o) {
  let $ = w(5),
    { titleDetail: titleDetail, children: children } = o,
    u;
  if ($[0] !== titleDetail)
    ((u = e(Box, {
      flexShrink: 0,
      children: r(Text, { bold: !0, color: "suggestion", children: ["Resume session", titleDetail] }),
    })),
      ($[0] = titleDetail),
      ($[1] = u));
  else u = $[1];
  let m;
  if ($[2] !== children || $[3] !== u)
    ((m = r(Pane, { color: "suggestion", children: [u, children] })),
      ($[2] = children),
      ($[3] = u),
      ($[4] = m));
  else m = $[4];
  return m;
}
//@ chunk-b79vwm1h.js:18971-19421 callgraph-fingerprint = extractSearchableText (0.465)
function extractSearchableText(message) {
  if (message.type !== "user" && message.type !== "assistant") return "";
  let d = "message" in message ? message.message?.content : void 0;
  if (!d) return "";
  let c = message.type === "user" && message.isCompactSummary ? message.modelOnlyText : void 0;
  if (typeof d === "string")
    return renderCompactSummaryText(t7(d, message.type === "user" ? message.pluginPrompt : void 0), c);
  if (Array.isArray(d))
    return d
      .map((block) => {
        if (typeof block === "string") return block;
        if ("text" in block && typeof block.text === "string") return renderCompactSummaryText(block.text, c);
        return "";
      })
      .filter(Boolean)
      .join(" ");
  return "";
}
//@ chunk-b79vwm1h.js:19421-19785 fingerprint = buildSearchableText (0.887)
function buildSearchableText(log) {
  let messageText = (
      log.messages.length <= Do ? log.messages : [...log.messages.slice(0, En), ...log.messages.slice(-En)]
    )
      .map(extractSearchableText)
      .filter(Boolean)
      .join(" "),
    fullText =
      `${[log.customTitle, log.aiTitle, log.summary, log.firstPromptShown ?? log.firstPrompt, log.gitBranch, log.tag, log.prNumber ? `PR #${log.prNumber}` : void 0, log.prRepository].filter(Boolean).join(" ")} ${messageText}`.trim();
  return fullText.length > Tn ? fullText.slice(0, Tn) : fullText;
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
  return (
    groups.forEach((logs) =>
      logs.sort((l, u) => new Date(u.modified).getTime() - new Date(l.modified).getTime()),
    ),
    groups
  );
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
function N() {
  let o = { log() {}, hookFailed() {} };
  return {
    set: (r) => {
      o = r;
    },
    get: () => o,
  };
}
//@ chunk-63641kq7.js:5273-5307 fingerprint = _temp2 (0.643)
var W = DoctorLazy(() => u({ customTitle: o() }));

export { getUniqueTags, LogSelector, N, W };
