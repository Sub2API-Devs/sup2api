/**
 * screens/repl/TranscriptView.tsx
 *
 * 2.1.316 新增。转录视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { logEvent } from "../../services/analytics/index.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useSession } from "../../context/session.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  useState,
  useRef,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useSearchHighlight } from "../../ink/hooks/use-search-highlight.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import {
  negateBoolean,
  notB,
  TranscriptSearchBar,
  TranscriptHelpFooter,
  TranscriptModeFooter,
} from "../REPL.js";
import { renderMessagesToPlainText, ExportTranscriptView } from "../../utils/exportRenderer.js";
import { writeTempFile } from "../../utils/tempFiles.js";
import { openFileInExternalEditor } from "../../utils/editor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LogoHeader } from "../../components/Messages.js";
import { GlobalKeybindingHandlers } from "../../hooks/useGlobalKeybindings.js";
import { ScrollKeybindingHandler } from "../../components/ScrollKeybindingHandler.js";
import { Box } from "../../ink/components/Text.js";
import { FullscreenLayout } from "../../components/FullscreenLayout.js";
import { AgentWaitingMessages } from "../../components/PromptInput/WaitingMessages.js";
import { SandboxViolationExpandedView } from "../../components/SandboxViolationExpandedView.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:142030-142807 placement
function TranscriptModeHeader(props) {
  let $ = useMemoCache(12);
  let { showAllInTranscript, onToggleShowAll, onExit, messageCount, virtualScrollActive, searchBarOpen } =
    props;
  let toggleShowAll;
  if ($[0] !== messageCount || $[1] !== onToggleShowAll || $[2] !== showAllInTranscript) {
    toggleShowAll = () => {
      logEvent("tengu_transcript_toggle_show_all", {
        is_expanding: !showAllInTranscript,
        message_count: messageCount,
      });
      onToggleShowAll();
    };
    $[0] = messageCount;
    $[1] = onToggleShowAll;
    $[2] = showAllInTranscript;
    $[3] = toggleShowAll;
  } else toggleShowAll = $[3];
  let toggleShowAll_2 = toggleShowAll;
  let exitTranscript;
  if ($[4] !== messageCount || $[5] !== onExit || $[6] !== showAllInTranscript) {
    exitTranscript = () => {
      logEvent("tengu_transcript_exit", {
        show_all: showAllInTranscript,
        message_count: messageCount,
      });
      onExit();
    };
    $[4] = messageCount;
    $[5] = onExit;
    $[6] = showAllInTranscript;
    $[7] = exitTranscript;
  } else exitTranscript = $[7];
  let exitTranscript_2 = exitTranscript;
  const isActive = !virtualScrollActive;
  let toggleKeybindingOptions;
  if ($[8] !== isActive) {
    toggleKeybindingOptions = {
      context: "Transcript",
      isActive,
    };
    $[8] = isActive;
    $[9] = toggleKeybindingOptions;
  } else toggleKeybindingOptions = $[9];
  useKeybinding("transcript:toggleShowAll", toggleShowAll_2, toggleKeybindingOptions);
  const isActive_2 = !searchBarOpen;
  let exitKeybindingOptions;
  if ($[10] !== isActive_2) {
    exitKeybindingOptions = {
      context: "Transcript",
      isActive: isActive_2,
    };
    $[10] = isActive_2;
    $[11] = exitKeybindingOptions;
  } else exitKeybindingOptions = $[11];
  useKeybinding("transcript:exit", exitTranscript_2, exitKeybindingOptions);
  return null;
}
//@ chunk-18hwfzwa.js:142807-149068 placement
/**
 * 转录模式（ctrl+o）视图：虚拟滚动渲染全部消息，支持显示全部/退出快捷键，把转录写入临时文件 cc-transcript-*.txt 并用 $VISUAL/$EDITOR 打开。
 */
function TranscriptView(props) {
  let $ = useMemoCache(92);
  let {
    focused,
    tools,
    commands,
    turn,
    hideWelcomeChrome,
    toolProgress,
    scrollViewport,
    reveal,
    onUserScroll,
    virtualScrollActive,
    embedded,
    scrollKeysActive,
    showSandboxViolations,
    dumpMode,
    onDumpToScrollback,
    onExit,
  } = props;
  let messages = useSession();
  let { storageV5 } = useTheme_2();
  let clock = useClock();
  let [showAll, setShowAll] = useState(false);
  let showAllMessages = showAll || dumpMode;
  let [searchActive, setSearchActive] = useState(false);
  let [statusText, setStatusText] = useState("");
  let renderGeneration = useRef(0);
  let clearStatusTimer = useRef(undefined);
  let renderInFlight = useRef(false);
  let invalidateRender;
  let invalidateDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    invalidateRender = () => () => {
      renderGeneration.current = renderGeneration.current + 1;
      clearStatusTimer.current?.();
    };
    invalidateDeps = [];
    $[0] = invalidateRender;
    $[1] = invalidateDeps;
  } else {
    invalidateRender = $[0];
    invalidateDeps = $[1];
  }
  useEffect(invalidateRender, invalidateDeps);
  let jumpRef = useRef(null);
  let [isSearching, setIsSearching] = useState(false);
  let [query, setQueryState] = useState("");
  let [matchCount, setMatchCount] = useState(0);
  let [currentMatch, setCurrentMatch] = useState(0);
  let onSearchMatchesChange;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    onSearchMatchesChange = (count, index) => {
      setMatchCount(count);
      setCurrentMatch(index);
    };
    $[2] = onSearchMatchesChange;
  } else onSearchMatchesChange = $[2];
  let onSearchMatchesChange_2 = onSearchMatchesChange;
  let { setQuery, scanElement, setPositions } = useSearchHighlight();
  let search;
  if ($[3] !== scanElement || $[4] !== setPositions) {
    search = {
      jumpRef,
      onSearchMatchesChange: onSearchMatchesChange_2,
      scanElement,
      setPositions,
    };
    $[3] = scanElement;
    $[4] = setPositions;
    $[5] = search;
  } else search = $[5];
  let search_2 = search;
  let { columns } = useTerminalSize();
  let columnsRef = useRef(columns);
  let columnsEffect;
  let columnsDeps;
  if ($[6] !== isSearching || $[7] !== query || $[8] !== setQuery || $[9] !== columns) {
    columnsEffect = () => {
      if (columnsRef.current !== columns) {
        columnsRef.current = columns;
        if (query || isSearching) {
          setIsSearching(false);
          setQueryState("");
          setMatchCount(0);
          setCurrentMatch(0);
          jumpRef.current?.disarmSearch();
          setQuery("");
        }
      }
    };
    columnsDeps = [columns, query, isSearching, setQuery];
    $[6] = isSearching;
    $[7] = query;
    $[8] = setQuery;
    $[9] = columns;
    $[10] = columnsEffect;
    $[11] = columnsDeps;
  } else {
    columnsEffect = $[10];
    columnsDeps = $[11];
  }
  useEffect(columnsEffect, columnsDeps);
  let containerRef = useRef(null);
  let focusable = !isSearching;
  useFocusOnMount(containerRef, focusable, true);
  let onKeyDown;
  if (
    $[12] !== clock ||
    $[13] !== dumpMode ||
    $[14] !== embedded ||
    $[15] !== focused.messages ||
    $[16] !== focused.task ||
    $[17] !== onDumpToScrollback ||
    $[18] !== matchCount ||
    $[19] !== messages ||
    $[20] !== storageV5 ||
    $[21] !== tools ||
    $[22] !== focusable ||
    $[23] !== virtualScrollActive
  ) {
    onKeyDown = function onKeyDownImpl(event) {
      if (!focusable || !virtualScrollActive) {
        return;
      }
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "?" && !dumpMode) {
        setSearchActive(negateBoolean);
        event.preventDefault();
        return;
      }
      if (event.key === "/" && !dumpMode) {
        jumpRef.current?.setAnchor();
        setIsSearching(true);
        setSearchActive(false);
        event.preventDefault();
        return;
      }
      let firstKeyChar = event.key[0];
      if (
        !dumpMode &&
        (firstKeyChar === "n" || firstKeyChar === "N") &&
        event.key === firstKeyChar.repeat(event.key.length) &&
        matchCount > 0
      ) {
        let jumpMatch = firstKeyChar === "n" ? jumpRef.current?.nextMatch : jumpRef.current?.prevMatch;
        if (jumpMatch) {
          for (let idx = 0; idx < event.key.length; idx++) jumpMatch();
        }
        event.preventDefault();
        return;
      }
      if (
        !dumpMode &&
        (firstKeyChar === "{" || firstKeyChar === "}") &&
        event.key === firstKeyChar.repeat(event.key.length)
      ) {
        let jumpMessage = firstKeyChar === "}" ? jumpRef.current?.nextMessage : jumpRef.current?.prevMessage;
        if (jumpMessage) {
          for (let idx = 0; idx < event.key.length; idx++) jumpMessage();
        }
        event.preventDefault();
        return;
      }
      if (event.key === "[" && !dumpMode && !embedded) {
        onDumpToScrollback();
        setSearchActive(false);
        event.preventDefault();
        return;
      }
      if (event.key === "v") {
        event.preventDefault();
        setSearchActive(false);
        if (renderInFlight.current) {
          return;
        }
        renderInFlight.current = true;
        let startGeneration = renderGeneration.current;
        let setStatus = (message) => {
          if (startGeneration !== renderGeneration.current) {
            return;
          }
          clearStatusTimer.current?.();
          setStatusText(message);
        };
        setStatus(`rendering ${focused.messages.length} messages\u2026`);
        (async () => {
          try {
            let columns = Math.max(80, (process.stdout.columns ?? 80) - 6);
            let content = (
              await renderMessagesToPlainText(messages, focused.messages, tools, {
                columns,
                storageV5,
                viewedAgent: focused.task,
              })
            ).replace(/[ \t]+$/gm, "");
            let filePath = await writeTempFile("cc-transcript-", ".txt", content);
            let fileInExternalEditor = openFileInExternalEditor(filePath);
            setStatus(
              fileInExternalEditor ? `opening ${filePath}` : `wrote ${filePath} \xB7 no $VISUAL/$EDITOR set`,
            );
          } catch (error) {
            let renderError = error;
            setStatus(
              `render failed: ${renderError instanceof Error ? renderError.message : String(renderError)}`,
            );
          }
          renderInFlight.current = false;
          if (startGeneration !== renderGeneration.current) {
            return;
          }
          clearStatusTimer.current = clock.setTimeout(() => setStatusText(""), 4000);
        })();
      }
    };
    $[12] = clock;
    $[13] = dumpMode;
    $[14] = embedded;
    $[15] = focused.messages;
    $[16] = focused.task;
    $[17] = onDumpToScrollback;
    $[18] = matchCount;
    $[19] = messages;
    $[20] = storageV5;
    $[21] = tools;
    $[22] = focusable;
    $[23] = virtualScrollActive;
    $[24] = onKeyDown;
  } else onKeyDown = $[24];
  let onKeyDown_2 = onKeyDown;
  let queryEffect;
  let queryDeps;
  if ($[25] !== query || $[26] !== setQuery || $[27] !== setPositions || $[28] !== virtualScrollActive) {
    queryEffect = () => {
      setQuery(virtualScrollActive ? query : "");
      if (!virtualScrollActive) setPositions(null);
    };
    queryDeps = [virtualScrollActive, query, setQuery, setPositions];
    $[25] = query;
    $[26] = setQuery;
    $[27] = setPositions;
    $[28] = virtualScrollActive;
    $[29] = queryEffect;
    $[30] = queryDeps;
  } else {
    queryEffect = $[29];
    queryDeps = $[30];
  }
  useEffect(queryEffect, queryDeps);
  let clearOnUnmount;
  let clearDeps;
  if ($[31] !== setQuery || $[32] !== setPositions) {
    clearOnUnmount = () => () => {
      setQuery("");
      setPositions(null);
    };
    clearDeps = [setQuery, setPositions];
    $[31] = setQuery;
    $[32] = setPositions;
    $[33] = clearOnUnmount;
    $[34] = clearDeps;
  } else {
    clearOnUnmount = $[33];
    clearDeps = $[34];
  }
  useEffect(clearOnUnmount, clearDeps);
  let scriptSourceMode = dumpMode ? "uncapped" : showAllMessages ? "all" : undefined;
  let logoHeader;
  if ($[35] !== hideWelcomeChrome) {
    logoHeader = jsxProd_default(LogoHeader, {
      hideWelcomeChrome,
    });
    $[35] = hideWelcomeChrome;
    $[36] = logoHeader;
  } else logoHeader = $[36];
  let source;
  if ($[37] !== focused || $[38] !== turn) {
    source = {
      kind: "live",
      focused,
      turn,
    };
    $[37] = focused;
    $[38] = turn;
    $[39] = source;
  } else source = $[39];
  const scriptSources = scriptSourceMode === undefined ? "collapsed" : "whole";
  let exportView;
  if (
    $[40] !== commands ||
    $[41] !== scriptSourceMode ||
    $[42] !== reveal ||
    $[43] !== scrollViewport ||
    $[44] !== search_2 ||
    $[45] !== source ||
    $[46] !== scriptSources ||
    $[47] !== tools
  ) {
    exportView = jsxProd_default(ExportTranscriptView, {
      source,
      tools,
      commands,
      screen: "transcript",
      history: scriptSourceMode,
      scriptSources,
      scrollViewport,
      search: search_2,
      reveal,
    });
    $[40] = commands;
    $[41] = scriptSourceMode;
    $[42] = reveal;
    $[43] = scrollViewport;
    $[44] = search_2;
    $[45] = source;
    $[46] = scriptSources;
    $[47] = tools;
    $[48] = exportView;
  } else exportView = $[48];
  let headerFragment;
  if ($[49] !== logoHeader || $[50] !== exportView) {
    headerFragment = jsxProd_default_2(Fragment, {
      children: [logoHeader, exportView],
    });
    $[49] = logoHeader;
    $[50] = exportView;
    $[51] = headerFragment;
  } else headerFragment = $[51];
  let header = headerFragment;
  let keybindingHandlers;
  if ($[52] !== focused.messages.length || $[53] !== onExit || $[54] !== showAllMessages) {
    keybindingHandlers = jsxProd_default(GlobalKeybindingHandlers, {
      screen: "transcript",
      onToggleTranscript: onExit,
      showAllInTranscript: showAllMessages,
      messageCount: focused.messages.length,
    });
    $[52] = focused.messages.length;
    $[53] = onExit;
    $[54] = showAllMessages;
    $[55] = keybindingHandlers;
  } else keybindingHandlers = $[55];
  let onToggleShowAll;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    onToggleShowAll = () => setShowAll(notB);
    $[56] = onToggleShowAll;
  } else onToggleShowAll = $[56];
  let modeHeader;
  if (
    $[57] !== focused.messages.length ||
    $[58] !== onExit ||
    $[59] !== isSearching ||
    $[60] !== showAllMessages ||
    $[61] !== virtualScrollActive
  ) {
    modeHeader = jsxProd_default(TranscriptModeHeader, {
      showAllInTranscript: showAllMessages,
      onToggleShowAll,
      onExit,
      messageCount: focused.messages.length,
      virtualScrollActive,
      searchBarOpen: isSearching,
    });
    $[57] = focused.messages.length;
    $[58] = onExit;
    $[59] = isSearching;
    $[60] = showAllMessages;
    $[61] = virtualScrollActive;
    $[62] = modeHeader;
  } else modeHeader = $[62];
  let bodyView;
  if (
    $[63] !== onUserScroll ||
    $[64] !== reveal?.current ||
    $[65] !== scrollKeysActive ||
    $[66] !== scrollViewport ||
    $[67] !== isSearching
  ) {
    bodyView = scrollViewport
      ? jsxProd_default(ScrollKeybindingHandler, {
          scrollViewport,
          isActive: scrollKeysActive,
          isModal: !isSearching,
          onScroll: (scrollEvent) => {
            jumpRef.current?.disarmSearch();
            reveal?.current?.release();
            onUserScroll?.(scrollEvent);
          },
        })
      : null;
    $[63] = onUserScroll;
    $[64] = reveal?.current;
    $[65] = scrollKeysActive;
    $[66] = scrollViewport;
    $[67] = isSearching;
    $[68] = bodyView;
  } else bodyView = $[68];
  let keyboardBox;
  if ($[69] !== onKeyDown_2) {
    keyboardBox = jsxProd_default(Box, {
      ref: containerRef,
      tabIndex: -1,
      onKeyDown: onKeyDown_2,
    });
    $[69] = onKeyDown_2;
    $[70] = keyboardBox;
  } else keyboardBox = $[70];
  let bodyContent;
  if (
    $[71] !== dumpMode ||
    $[72] !== statusText ||
    $[73] !== focused ||
    $[74] !== scrollViewport ||
    $[75] !== matchCount ||
    $[76] !== currentMatch ||
    $[77] !== isSearching ||
    $[78] !== query ||
    $[79] !== setQuery ||
    $[80] !== showAllMessages ||
    $[81] !== showSandboxViolations ||
    $[82] !== toolProgress ||
    $[83] !== searchActive ||
    $[84] !== header
  ) {
    bodyContent = scrollViewport
      ? jsxProd_default(FullscreenLayout, {
          scrollViewport,
          scrollable: jsxProd_default_2(Fragment, {
            children: [
              header,
              toolProgress,
              jsxProd_default(
                AgentWaitingMessages,
                {
                  focused,
                },
                focused.conversationKey,
              ),
              showSandboxViolations && jsxProd_default(SandboxViolationExpandedView, {}),
            ],
          }),
          bottom: isSearching
            ? jsxProd_default(TranscriptSearchBar, {
                jumpRef,
                initialQuery: "",
                count: matchCount,
                current: currentMatch,
                onClose: (closeArgs) => {
                  setQueryState(matchCount > 0 ? closeArgs : "");
                  setIsSearching(false);
                  if (!closeArgs) {
                    setMatchCount(0);
                    setCurrentMatch(0);
                    jumpRef.current?.setSearchQuery("");
                  }
                },
                onCancel: () => {
                  setIsSearching(false);
                  jumpRef.current?.setSearchQuery("");
                  jumpRef.current?.setSearchQuery(query);
                  setQuery(query);
                },
                setHighlight: setQuery,
              })
            : searchActive
              ? jsxProd_default(TranscriptHelpFooter, {})
              : jsxProd_default(TranscriptModeFooter, {
                  showAllInTranscript: showAllMessages,
                  virtualScroll: true,
                  status: statusText || undefined,
                  searchBadge:
                    query && matchCount > 0
                      ? {
                          current: currentMatch,
                          count: matchCount,
                        }
                      : undefined,
                }),
        })
      : jsxProd_default_2(Fragment, {
          children: [
            header,
            toolProgress,
            jsxProd_default(
              AgentWaitingMessages,
              {
                focused,
              },
              focused.conversationKey,
            ),
            showSandboxViolations && jsxProd_default(SandboxViolationExpandedView, {}),
            jsxProd_default(TranscriptModeFooter, {
              showAllInTranscript: showAllMessages,
              virtualScroll: false,
              suppressShowAll: dumpMode,
              status: statusText || undefined,
            }),
          ],
        });
    $[71] = dumpMode;
    $[72] = statusText;
    $[73] = focused;
    $[74] = scrollViewport;
    $[75] = matchCount;
    $[76] = currentMatch;
    $[77] = isSearching;
    $[78] = query;
    $[79] = setQuery;
    $[80] = showAllMessages;
    $[81] = showSandboxViolations;
    $[82] = toolProgress;
    $[83] = searchActive;
    $[84] = header;
    $[85] = bodyContent;
  } else bodyContent = $[85];
  let view;
  if (
    $[86] !== keybindingHandlers ||
    $[87] !== modeHeader ||
    $[88] !== bodyView ||
    $[89] !== keyboardBox ||
    $[90] !== bodyContent
  ) {
    view = jsxProd_default_2(Fragment, {
      children: [keybindingHandlers, modeHeader, bodyView, keyboardBox, bodyContent],
    });
    $[86] = keybindingHandlers;
    $[87] = modeHeader;
    $[88] = bodyView;
    $[89] = keyboardBox;
    $[90] = bodyContent;
    $[91] = view;
  } else view = $[91];
  return view;
}
//@ chunk-18hwfzwa.js:149068-149072 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:149068", () => {
  init_react_production();
});
export { TranscriptView };
