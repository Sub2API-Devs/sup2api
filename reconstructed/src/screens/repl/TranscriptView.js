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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { logEvent } from "../../services/analytics/index.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useSession } from "../../context/session.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { y, R, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:142030-142807 placement
function TranscriptModeHeader(props) {
  let $ = w(12);
  let { showAllInTranscript, onToggleShowAll, onExit, messageCount, virtualScrollActive, searchBarOpen } =
    props;
  let He;
  if ($[0] !== messageCount || $[1] !== onToggleShowAll || $[2] !== showAllInTranscript) {
    He = () => {
      logEvent("tengu_transcript_toggle_show_all", {
        is_expanding: !showAllInTranscript,
        message_count: messageCount,
      });
      onToggleShowAll();
    };
    $[0] = messageCount;
    $[1] = onToggleShowAll;
    $[2] = showAllInTranscript;
    $[3] = He;
  } else He = $[3];
  let We = He;
  let ze;
  if ($[4] !== messageCount || $[5] !== onExit || $[6] !== showAllInTranscript) {
    ze = () => {
      logEvent("tengu_transcript_exit", {
        show_all: showAllInTranscript,
        message_count: messageCount,
      });
      onExit();
    };
    $[4] = messageCount;
    $[5] = onExit;
    $[6] = showAllInTranscript;
    $[7] = ze;
  } else ze = $[7];
  let Xe = ze;
  const isActive = !virtualScrollActive;
  let kt;
  if ($[8] !== isActive) {
    kt = {
      context: "Transcript",
      isActive,
    };
    $[8] = isActive;
    $[9] = kt;
  } else kt = $[9];
  useKeybinding("transcript:toggleShowAll", We, kt);
  const isActive_2 = !searchBarOpen;
  let It;
  if ($[10] !== isActive_2) {
    It = {
      context: "Transcript",
      isActive: isActive_2,
    };
    $[10] = isActive_2;
    $[11] = It;
  } else It = $[11];
  useKeybinding("transcript:exit", Xe, It);
  return null;
}
//@ chunk-18hwfzwa.js:142807-149068 placement
/**
 * 转录模式（ctrl+o）视图：虚拟滚动渲染全部消息，支持显示全部/退出快捷键，把转录写入临时文件 cc-transcript-*.txt 并用 $VISUAL/$EDITOR 打开。
 */
function TranscriptView(props) {
  let $ = w(92);
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
  let [oo, Xt] = y(false);
  let io = oo || dumpMode;
  let [so, po] = y(false);
  let [ao, co] = y("");
  let bo = R(0);
  let Ao = R(undefined);
  let Bo = R(false);
  let Ho;
  let Io;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Ho = () => () => {
      bo.current = bo.current + 1;
      Ao.current?.();
    };
    Io = [];
    $[0] = Ho;
    $[1] = Io;
  } else {
    Ho = $[0];
    Io = $[1];
  }
  P(Ho, Io);
  let Wo = R(null);
  let [mn, Cn] = y(false);
  let [No, vo] = y("");
  let [Yo, kn] = y(0);
  let [Fn, bn] = y(0);
  let Go;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Go = (hn, Mn) => {
      kn(hn);
      bn(Mn);
    };
    $[2] = Go;
  } else Go = $[2];
  let onSearchMatchesChange = Go;
  let { setQuery, scanElement, setPositions } = useSearchHighlight();
  let _o;
  if ($[3] !== scanElement || $[4] !== setPositions) {
    _o = {
      jumpRef: Wo,
      onSearchMatchesChange,
      scanElement,
      setPositions,
    };
    $[3] = scanElement;
    $[4] = setPositions;
    $[5] = _o;
  } else _o = $[5];
  let search = _o;
  let { columns } = useTerminalSize();
  let columnsRef = R(columns);
  let mr;
  let Kn;
  if ($[6] !== mn || $[7] !== No || $[8] !== setQuery || $[9] !== columns) {
    mr = () => {
      if (columnsRef.current !== columns) {
        columnsRef.current = columns;
        if (No || mn) {
          Cn(false);
          vo("");
          kn(0);
          bn(0);
          Wo.current?.disarmSearch();
          setQuery("");
        }
      }
    };
    Kn = [columns, No, mn, setQuery];
    $[6] = mn;
    $[7] = No;
    $[8] = setQuery;
    $[9] = columns;
    $[10] = mr;
    $[11] = Kn;
  } else {
    mr = $[10];
    Kn = $[11];
  }
  P(mr, Kn);
  let Wn = R(null);
  let Fr = !mn;
  useFocusOnMount(Wn, Fr, true);
  let Zn;
  if (
    $[12] !== clock ||
    $[13] !== dumpMode ||
    $[14] !== embedded ||
    $[15] !== focused.messages ||
    $[16] !== focused.task ||
    $[17] !== onDumpToScrollback ||
    $[18] !== Yo ||
    $[19] !== messages ||
    $[20] !== storageV5 ||
    $[21] !== tools ||
    $[22] !== Fr ||
    $[23] !== virtualScrollActive
  ) {
    Zn = function fr(event) {
      if (!Fr || !virtualScrollActive) {
        return;
      }
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "?" && !dumpMode) {
        po(negateBoolean);
        event.preventDefault();
        return;
      }
      if (event.key === "/" && !dumpMode) {
        Wo.current?.setAnchor();
        Cn(true);
        po(false);
        event.preventDefault();
        return;
      }
      let dr = event.key[0];
      if (!dumpMode && (dr === "n" || dr === "N") && event.key === dr.repeat(event.key.length) && Yo > 0) {
        let or = dr === "n" ? Wo.current?.nextMatch : Wo.current?.prevMatch;
        if (or) {
          for (let idx = 0; idx < event.key.length; idx++) or();
        }
        event.preventDefault();
        return;
      }
      if (!dumpMode && (dr === "{" || dr === "}") && event.key === dr.repeat(event.key.length)) {
        let Qn = dr === "}" ? Wo.current?.nextMessage : Wo.current?.prevMessage;
        if (Qn) {
          for (let idx = 0; idx < event.key.length; idx++) Qn();
        }
        event.preventDefault();
        return;
      }
      if (event.key === "[" && !dumpMode && !embedded) {
        onDumpToScrollback();
        po(false);
        event.preventDefault();
        return;
      }
      if (event.key === "v") {
        event.preventDefault();
        po(false);
        if (Bo.current) {
          return;
        }
        Bo.current = true;
        let Ir = bo.current;
        let ts = (Pr) => {
          if (Ir !== bo.current) {
            return;
          }
          Ao.current?.();
          co(Pr);
        };
        ts(`rendering ${focused.messages.length} messages\u2026`);
        (async () => {
          try {
            let columns = Math.max(80, (process.stdout.columns ?? 80) - 6);
            let replaced = (
              await renderMessagesToPlainText(messages, focused.messages, tools, {
                columns,
                storageV5,
                viewedAgent: focused.task,
              })
            ).replace(/[ \t]+$/gm, "");
            let filePath = await writeTempFile("cc-transcript-", ".txt", replaced);
            let fileInExternalEditor = openFileInExternalEditor(filePath);
            ts(
              fileInExternalEditor ? `opening ${filePath}` : `wrote ${filePath} \xB7 no $VISUAL/$EDITOR set`,
            );
          } catch (error) {
            let _r = error;
            ts(`render failed: ${_r instanceof Error ? _r.message : String(_r)}`);
          }
          Bo.current = false;
          if (Ir !== bo.current) {
            return;
          }
          Ao.current = clock.setTimeout(() => co(""), 4000);
        })();
      }
    };
    $[12] = clock;
    $[13] = dumpMode;
    $[14] = embedded;
    $[15] = focused.messages;
    $[16] = focused.task;
    $[17] = onDumpToScrollback;
    $[18] = Yo;
    $[19] = messages;
    $[20] = storageV5;
    $[21] = tools;
    $[22] = Fr;
    $[23] = virtualScrollActive;
    $[24] = Zn;
  } else Zn = $[24];
  let onKeyDown = Zn;
  let Gn;
  let $r;
  if ($[25] !== No || $[26] !== setQuery || $[27] !== setPositions || $[28] !== virtualScrollActive) {
    Gn = () => {
      setQuery(virtualScrollActive ? No : "");
      if (!virtualScrollActive) setPositions(null);
    };
    $r = [virtualScrollActive, No, setQuery, setPositions];
    $[25] = No;
    $[26] = setQuery;
    $[27] = setPositions;
    $[28] = virtualScrollActive;
    $[29] = Gn;
    $[30] = $r;
  } else {
    Gn = $[29];
    $r = $[30];
  }
  P(Gn, $r);
  let Yr;
  let Er;
  if ($[31] !== setQuery || $[32] !== setPositions) {
    Yr = () => () => {
      setQuery("");
      setPositions(null);
    };
    Er = [setQuery, setPositions];
    $[31] = setQuery;
    $[32] = setPositions;
    $[33] = Yr;
    $[34] = Er;
  } else {
    Yr = $[33];
    Er = $[34];
  }
  P(Yr, Er);
  let Vr = dumpMode ? "uncapped" : io ? "all" : undefined;
  let ms;
  if ($[35] !== hideWelcomeChrome) {
    ms = jsxProd_default(LogoHeader, {
      hideWelcomeChrome,
    });
    $[35] = hideWelcomeChrome;
    $[36] = ms;
  } else ms = $[36];
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
  const scriptSources = Vr === undefined ? "collapsed" : "whole";
  let is;
  if (
    $[40] !== commands ||
    $[41] !== Vr ||
    $[42] !== reveal ||
    $[43] !== scrollViewport ||
    $[44] !== search ||
    $[45] !== source ||
    $[46] !== scriptSources ||
    $[47] !== tools
  ) {
    is = jsxProd_default(ExportTranscriptView, {
      source,
      tools,
      commands,
      screen: "transcript",
      history: Vr,
      scriptSources,
      scrollViewport,
      search,
      reveal,
    });
    $[40] = commands;
    $[41] = Vr;
    $[42] = reveal;
    $[43] = scrollViewport;
    $[44] = search;
    $[45] = source;
    $[46] = scriptSources;
    $[47] = tools;
    $[48] = is;
  } else is = $[48];
  let ws;
  if ($[49] !== ms || $[50] !== is) {
    ws = jsxProd_default_2(Fragment, {
      children: [ms, is],
    });
    $[49] = ms;
    $[50] = is;
    $[51] = ws;
  } else ws = $[51];
  let Ci = ws;
  let oi;
  if ($[52] !== focused.messages.length || $[53] !== onExit || $[54] !== io) {
    oi = jsxProd_default(GlobalKeybindingHandlers, {
      screen: "transcript",
      onToggleTranscript: onExit,
      showAllInTranscript: io,
      messageCount: focused.messages.length,
    });
    $[52] = focused.messages.length;
    $[53] = onExit;
    $[54] = io;
    $[55] = oi;
  } else oi = $[55];
  let onToggleShowAll;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    onToggleShowAll = () => Xt(notB);
    $[56] = onToggleShowAll;
  } else onToggleShowAll = $[56];
  let Hi;
  if (
    $[57] !== focused.messages.length ||
    $[58] !== onExit ||
    $[59] !== mn ||
    $[60] !== io ||
    $[61] !== virtualScrollActive
  ) {
    Hi = jsxProd_default(TranscriptModeHeader, {
      showAllInTranscript: io,
      onToggleShowAll,
      onExit,
      messageCount: focused.messages.length,
      virtualScrollActive,
      searchBarOpen: mn,
    });
    $[57] = focused.messages.length;
    $[58] = onExit;
    $[59] = mn;
    $[60] = io;
    $[61] = virtualScrollActive;
    $[62] = Hi;
  } else Hi = $[62];
  let Zi;
  if (
    $[63] !== onUserScroll ||
    $[64] !== reveal?.current ||
    $[65] !== scrollKeysActive ||
    $[66] !== scrollViewport ||
    $[67] !== mn
  ) {
    Zi = scrollViewport
      ? jsxProd_default(ScrollKeybindingHandler, {
          scrollViewport,
          isActive: scrollKeysActive,
          isModal: !mn,
          onScroll: (da) => {
            Wo.current?.disarmSearch();
            reveal?.current?.release();
            onUserScroll?.(da);
          },
        })
      : null;
    $[63] = onUserScroll;
    $[64] = reveal?.current;
    $[65] = scrollKeysActive;
    $[66] = scrollViewport;
    $[67] = mn;
    $[68] = Zi;
  } else Zi = $[68];
  let qn;
  if ($[69] !== onKeyDown) {
    qn = jsxProd_default(Box, {
      ref: Wn,
      tabIndex: -1,
      onKeyDown,
    });
    $[69] = onKeyDown;
    $[70] = qn;
  } else qn = $[70];
  let ps;
  if (
    $[71] !== dumpMode ||
    $[72] !== ao ||
    $[73] !== focused ||
    $[74] !== scrollViewport ||
    $[75] !== Yo ||
    $[76] !== Fn ||
    $[77] !== mn ||
    $[78] !== No ||
    $[79] !== setQuery ||
    $[80] !== io ||
    $[81] !== showSandboxViolations ||
    $[82] !== toolProgress ||
    $[83] !== so ||
    $[84] !== Ci
  ) {
    ps = scrollViewport
      ? jsxProd_default(FullscreenLayout, {
          scrollViewport,
          scrollable: jsxProd_default_2(Fragment, {
            children: [
              Ci,
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
          bottom: mn
            ? jsxProd_default(TranscriptSearchBar, {
                jumpRef: Wo,
                initialQuery: "",
                count: Yo,
                current: Fn,
                onClose: (xs) => {
                  vo(Yo > 0 ? xs : "");
                  Cn(false);
                  if (!xs) {
                    kn(0);
                    bn(0);
                    Wo.current?.setSearchQuery("");
                  }
                },
                onCancel: () => {
                  Cn(false);
                  Wo.current?.setSearchQuery("");
                  Wo.current?.setSearchQuery(No);
                  setQuery(No);
                },
                setHighlight: setQuery,
              })
            : so
              ? jsxProd_default(TranscriptHelpFooter, {})
              : jsxProd_default(TranscriptModeFooter, {
                  showAllInTranscript: io,
                  virtualScroll: true,
                  status: ao || undefined,
                  searchBadge:
                    No && Yo > 0
                      ? {
                          current: Fn,
                          count: Yo,
                        }
                      : undefined,
                }),
        })
      : jsxProd_default_2(Fragment, {
          children: [
            Ci,
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
              showAllInTranscript: io,
              virtualScroll: false,
              suppressShowAll: dumpMode,
              status: ao || undefined,
            }),
          ],
        });
    $[71] = dumpMode;
    $[72] = ao;
    $[73] = focused;
    $[74] = scrollViewport;
    $[75] = Yo;
    $[76] = Fn;
    $[77] = mn;
    $[78] = No;
    $[79] = setQuery;
    $[80] = io;
    $[81] = showSandboxViolations;
    $[82] = toolProgress;
    $[83] = so;
    $[84] = Ci;
    $[85] = ps;
  } else ps = $[85];
  let kr;
  if ($[86] !== oi || $[87] !== Hi || $[88] !== Zi || $[89] !== qn || $[90] !== ps) {
    kr = jsxProd_default_2(Fragment, {
      children: [oi, Hi, Zi, qn, ps],
    });
    $[86] = oi;
    $[87] = Hi;
    $[88] = Zi;
    $[89] = qn;
    $[90] = ps;
    $[91] = kr;
  } else kr = $[91];
  return kr;
}
//@ chunk-18hwfzwa.js:149068-149072 placement
init_react_production();
export { TranscriptView };
