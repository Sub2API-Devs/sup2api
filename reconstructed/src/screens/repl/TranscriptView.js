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
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { y, R, P, j } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useSearchHighlight } from "../../ink/hooks/use-search-highlight.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { FOt, BOt, TranscriptSearchBar, TranscriptHelpFooter, TranscriptModeFooter } from "../REPL.js";
import { renderMessagesToPlainText, ExportTranscriptView } from "../../utils/exportRenderer.js";
import { writeTempFile } from "../../utils/tempFiles.js";
import { openFileInExternalEditor } from "../../utils/editor.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LogoHeader } from "../../components/Messages.js";
import { GlobalKeybindingHandlers } from "../../hooks/useGlobalKeybindings.js";
import { ScrollKeybindingHandler } from "../../components/ScrollKeybindingHandler.js";
import { Box } from "../../ink/components/Text.js";
import { FullscreenLayout } from "../../components/FullscreenLayout.js";
import { AgentWaitingMessages } from "../../components/PromptInput/WaitingMessages.js";
import { SandboxViolationExpandedView } from "../../components/SandboxViolationExpandedView.js";

//@ chunk-18hwfzwa.js:142030-142807 placement
function TranscriptModeHeader(h) {
  let $ = w(12),
    {
      showAllInTranscript: showAllInTranscript,
      onToggleShowAll: onToggleShowAll,
      onExit: onExit,
      messageCount: messageCount,
      virtualScrollActive: virtualScrollActive,
      searchBarOpen: searchBarOpen,
    } = h,
    He;
  if ($[0] !== messageCount || $[1] !== onToggleShowAll || $[2] !== showAllInTranscript)
    ((He = () => {
      (logEvent("tengu_transcript_toggle_show_all", {
        is_expanding: !showAllInTranscript,
        message_count: messageCount,
      }),
        onToggleShowAll());
    }),
      ($[0] = messageCount),
      ($[1] = onToggleShowAll),
      ($[2] = showAllInTranscript),
      ($[3] = He));
  else He = $[3];
  let We = He,
    ze;
  if ($[4] !== messageCount || $[5] !== onExit || $[6] !== showAllInTranscript)
    ((ze = () => {
      (logEvent("tengu_transcript_exit", { show_all: showAllInTranscript, message_count: messageCount }),
        onExit());
    }),
      ($[4] = messageCount),
      ($[5] = onExit),
      ($[6] = showAllInTranscript),
      ($[7] = ze));
  else ze = $[7];
  let Xe = ze;
  const rt = !virtualScrollActive;
  let kt;
  if ($[8] !== rt) ((kt = { context: "Transcript", isActive: rt }), ($[8] = rt), ($[9] = kt));
  else kt = $[9];
  useKeybinding("transcript:toggleShowAll", We, kt);
  const At = !searchBarOpen;
  let It;
  if ($[10] !== At) ((It = { context: "Transcript", isActive: At }), ($[10] = At), ($[11] = It));
  else It = $[11];
  return (useKeybinding("transcript:exit", Xe, It), null);
}
/**
 * 转录模式（ctrl+o）视图：虚拟滚动渲染全部消息，支持显示全部/退出快捷键，把转录写入临时文件 cc-transcript-*.txt 并用 $VISUAL/$EDITOR 打开。
 */
//@ chunk-18hwfzwa.js:142807-149068 placement
function TranscriptView(h) {
  let $ = w(92),
    {
      focused: focused,
      tools: tools,
      commands: commands,
      turn: turn,
      hideWelcomeChrome: hideWelcomeChrome,
      toolProgress: toolProgress,
      scrollViewport: scrollViewport,
      reveal: reveal,
      onUserScroll: onUserScroll,
      virtualScrollActive: virtualScrollActive,
      embedded: embedded,
      scrollKeysActive: scrollKeysActive,
      showSandboxViolations: showSandboxViolations,
      dumpMode: dumpMode,
      onDumpToScrollback: onDumpToScrollback,
      onExit: onExit,
    } = h,
    Et = useSession(),
    { storageV5: storageV5 } = Me(),
    Lt = useClock(),
    [oo, Xt] = y(!1),
    io = oo || dumpMode,
    [so, po] = y(!1),
    [ao, co] = y(""),
    bo = R(0),
    Ao = R(void 0),
    Bo = R(!1),
    Ho,
    Io;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Ho = () => () => {
      ((bo.current = bo.current + 1), Ao.current?.());
    }),
      (Io = []),
      ($[0] = Ho),
      ($[1] = Io));
  else ((Ho = $[0]), (Io = $[1]));
  P(Ho, Io);
  let Wo = R(null),
    [mn, Cn] = y(!1),
    [No, vo] = y(""),
    [Yo, kn] = y(0),
    [Fn, bn] = y(0),
    Go;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((Go = (hn, Mn) => {
      (kn(hn), bn(Mn));
    }),
      ($[2] = Go));
  else Go = $[2];
  let Xo = Go,
    { setQuery: setQuery, scanElement: scanElement, setPositions: setPositions } = useSearchHighlight(),
    _o;
  if ($[3] !== scanElement || $[4] !== setPositions)
    ((_o = { jumpRef: Wo, onSearchMatchesChange: Xo, scanElement: scanElement, setPositions: setPositions }),
      ($[3] = scanElement),
      ($[4] = setPositions),
      ($[5] = _o));
  else _o = $[5];
  let cn = _o,
    { columns: columns } = useTerminalSize(),
    wn = R(columns),
    mr,
    Kn;
  if ($[6] !== mn || $[7] !== No || $[8] !== setQuery || $[9] !== columns)
    ((mr = () => {
      if (wn.current !== columns) {
        if (((wn.current = columns), No || mn))
          (Cn(!1), vo(""), kn(0), bn(0), Wo.current?.disarmSearch(), setQuery(""));
      }
    }),
      (Kn = [columns, No, mn, setQuery]),
      ($[6] = mn),
      ($[7] = No),
      ($[8] = setQuery),
      ($[9] = columns),
      ($[10] = mr),
      ($[11] = Kn));
  else ((mr = $[10]), (Kn = $[11]));
  P(mr, Kn);
  let Wn = R(null),
    Fr = !mn;
  useFocusOnMount(Wn, Fr, !0);
  let Zn;
  if (
    $[12] !== Lt ||
    $[13] !== dumpMode ||
    $[14] !== embedded ||
    $[15] !== focused.messages ||
    $[16] !== focused.task ||
    $[17] !== onDumpToScrollback ||
    $[18] !== Yo ||
    $[19] !== Et ||
    $[20] !== storageV5 ||
    $[21] !== tools ||
    $[22] !== Fr ||
    $[23] !== virtualScrollActive
  )
    ((Zn = function fr(Un) {
      if (!Fr || !virtualScrollActive) {
        return;
      }
      if (Un.ctrl || Un.meta) {
        return;
      }
      if (Un.key === "?" && !dumpMode) {
        (po(FOt), Un.preventDefault());
        return;
      }
      if (Un.key === "/" && !dumpMode) {
        (Wo.current?.setAnchor(), Cn(!0), po(!1), Un.preventDefault());
        return;
      }
      let dr = Un.key[0];
      if (!dumpMode && (dr === "n" || dr === "N") && Un.key === dr.repeat(Un.key.length) && Yo > 0) {
        let or = dr === "n" ? Wo.current?.nextMatch : Wo.current?.prevMatch;
        if (or) {
          for (let pr = 0; pr < Un.key.length; pr++) or();
        }
        Un.preventDefault();
        return;
      }
      if (!dumpMode && (dr === "{" || dr === "}") && Un.key === dr.repeat(Un.key.length)) {
        let Qn = dr === "}" ? Wo.current?.nextMessage : Wo.current?.prevMessage;
        if (Qn) {
          for (let ur = 0; ur < Un.key.length; ur++) Qn();
        }
        Un.preventDefault();
        return;
      }
      if (Un.key === "[" && !dumpMode && !embedded) {
        (onDumpToScrollback(), po(!1), Un.preventDefault());
        return;
      }
      if (Un.key === "v") {
        if ((Un.preventDefault(), po(!1), Bo.current)) {
          return;
        }
        Bo.current = !0;
        let Ir = bo.current;
        let ts = (Pr) => {
          if (Ir !== bo.current) {
            return;
          }
          (Ao.current?.(), co(Pr));
        };
        (ts(`rendering ${focused.messages.length} messages\u2026`),
          (async () => {
            try {
              let max = Math.max(80, (process.stdout.columns ?? 80) - 6);
              let replaced = (
                await renderMessagesToPlainText(Et, focused.messages, tools, {
                  columns: max,
                  storageV5: storageV5,
                  viewedAgent: focused.task,
                })
              ).replace(/[ \t]+$/gm, "");
              let wr = await writeTempFile("cc-transcript-", ".txt", replaced);
              let zr = openFileInExternalEditor(wr);
              ts(zr ? `opening ${wr}` : `wrote ${wr} \xB7 no $VISUAL/$EDITOR set`);
            } catch (error) {
              let _r = error;
              ts(`render failed: ${_r instanceof Error ? _r.message : String(_r)}`);
            }
            if (((Bo.current = !1), Ir !== bo.current)) {
              return;
            }
            Ao.current = Lt.setTimeout(() => co(""), 4000);
          })());
      }
    }),
      ($[12] = Lt),
      ($[13] = dumpMode),
      ($[14] = embedded),
      ($[15] = focused.messages),
      ($[16] = focused.task),
      ($[17] = onDumpToScrollback),
      ($[18] = Yo),
      ($[19] = Et),
      ($[20] = storageV5),
      ($[21] = tools),
      ($[22] = Fr),
      ($[23] = virtualScrollActive),
      ($[24] = Zn));
  else Zn = $[24];
  let fr = Zn,
    Gn,
    $r;
  if ($[25] !== No || $[26] !== setQuery || $[27] !== setPositions || $[28] !== virtualScrollActive)
    ((Gn = () => {
      if ((setQuery(virtualScrollActive ? No : ""), !virtualScrollActive)) setPositions(null);
    }),
      ($r = [virtualScrollActive, No, setQuery, setPositions]),
      ($[25] = No),
      ($[26] = setQuery),
      ($[27] = setPositions),
      ($[28] = virtualScrollActive),
      ($[29] = Gn),
      ($[30] = $r));
  else ((Gn = $[29]), ($r = $[30]));
  P(Gn, $r);
  let Yr, Er;
  if ($[31] !== setQuery || $[32] !== setPositions)
    ((Yr = () => () => {
      (setQuery(""), setPositions(null));
    }),
      (Er = [setQuery, setPositions]),
      ($[31] = setQuery),
      ($[32] = setPositions),
      ($[33] = Yr),
      ($[34] = Er));
  else ((Yr = $[33]), (Er = $[34]));
  P(Yr, Er);
  let Vr = dumpMode ? "uncapped" : io ? "all" : void 0,
    ms;
  if ($[35] !== hideWelcomeChrome)
    ((ms = e(LogoHeader, { hideWelcomeChrome: hideWelcomeChrome })),
      ($[35] = hideWelcomeChrome),
      ($[36] = ms));
  else ms = $[36];
  let Xs;
  if ($[37] !== focused || $[38] !== turn)
    ((Xs = { kind: "live", focused: focused, turn: turn }), ($[37] = focused), ($[38] = turn), ($[39] = Xs));
  else Xs = $[39];
  const Ls = Vr === void 0 ? "collapsed" : "whole";
  let is;
  if (
    $[40] !== commands ||
    $[41] !== Vr ||
    $[42] !== reveal ||
    $[43] !== scrollViewport ||
    $[44] !== cn ||
    $[45] !== Xs ||
    $[46] !== Ls ||
    $[47] !== tools
  )
    ((is = e(ExportTranscriptView, {
      source: Xs,
      tools: tools,
      commands: commands,
      screen: "transcript",
      history: Vr,
      scriptSources: Ls,
      scrollViewport: scrollViewport,
      search: cn,
      reveal: reveal,
    })),
      ($[40] = commands),
      ($[41] = Vr),
      ($[42] = reveal),
      ($[43] = scrollViewport),
      ($[44] = cn),
      ($[45] = Xs),
      ($[46] = Ls),
      ($[47] = tools),
      ($[48] = is));
  else is = $[48];
  let ws;
  if ($[49] !== ms || $[50] !== is)
    ((ws = r(Fragment, { children: [ms, is] })), ($[49] = ms), ($[50] = is), ($[51] = ws));
  else ws = $[51];
  let Ci = ws,
    oi;
  if ($[52] !== focused.messages.length || $[53] !== onExit || $[54] !== io)
    ((oi = e(GlobalKeybindingHandlers, {
      screen: "transcript",
      onToggleTranscript: onExit,
      showAllInTranscript: io,
      messageCount: focused.messages.length,
    })),
      ($[52] = focused.messages.length),
      ($[53] = onExit),
      ($[54] = io),
      ($[55] = oi));
  else oi = $[55];
  let Oi;
  if ($[56] === MEMO_CACHE_SENTINEL) ((Oi = () => Xt(BOt)), ($[56] = Oi));
  else Oi = $[56];
  let Hi;
  if (
    $[57] !== focused.messages.length ||
    $[58] !== onExit ||
    $[59] !== mn ||
    $[60] !== io ||
    $[61] !== virtualScrollActive
  )
    ((Hi = e(TranscriptModeHeader, {
      showAllInTranscript: io,
      onToggleShowAll: Oi,
      onExit: onExit,
      messageCount: focused.messages.length,
      virtualScrollActive: virtualScrollActive,
      searchBarOpen: mn,
    })),
      ($[57] = focused.messages.length),
      ($[58] = onExit),
      ($[59] = mn),
      ($[60] = io),
      ($[61] = virtualScrollActive),
      ($[62] = Hi));
  else Hi = $[62];
  let Zi;
  if (
    $[63] !== onUserScroll ||
    $[64] !== reveal?.current ||
    $[65] !== scrollKeysActive ||
    $[66] !== scrollViewport ||
    $[67] !== mn
  )
    ((Zi = scrollViewport
      ? e(ScrollKeybindingHandler, {
          scrollViewport: scrollViewport,
          isActive: scrollKeysActive,
          isModal: !mn,
          onScroll: (da) => {
            (Wo.current?.disarmSearch(), reveal?.current?.release(), onUserScroll?.(da));
          },
        })
      : null),
      ($[63] = onUserScroll),
      ($[64] = reveal?.current),
      ($[65] = scrollKeysActive),
      ($[66] = scrollViewport),
      ($[67] = mn),
      ($[68] = Zi));
  else Zi = $[68];
  let qn;
  if ($[69] !== fr) ((qn = e(Box, { ref: Wn, tabIndex: -1, onKeyDown: fr })), ($[69] = fr), ($[70] = qn));
  else qn = $[70];
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
  )
    ((ps = scrollViewport
      ? e(FullscreenLayout, {
          scrollViewport: scrollViewport,
          scrollable: r(Fragment, {
            children: [
              Ci,
              toolProgress,
              e(AgentWaitingMessages, { focused: focused }, focused.conversationKey),
              showSandboxViolations && e(SandboxViolationExpandedView, {}),
            ],
          }),
          bottom: mn
            ? e(TranscriptSearchBar, {
                jumpRef: Wo,
                initialQuery: "",
                count: Yo,
                current: Fn,
                onClose: (xs) => {
                  if ((vo(Yo > 0 ? xs : ""), Cn(!1), !xs)) (kn(0), bn(0), Wo.current?.setSearchQuery(""));
                },
                onCancel: () => {
                  (Cn(!1), Wo.current?.setSearchQuery(""), Wo.current?.setSearchQuery(No), setQuery(No));
                },
                setHighlight: setQuery,
              })
            : so
              ? e(TranscriptHelpFooter, {})
              : e(TranscriptModeFooter, {
                  showAllInTranscript: io,
                  virtualScroll: !0,
                  status: ao || void 0,
                  searchBadge: No && Yo > 0 ? { current: Fn, count: Yo } : void 0,
                }),
        })
      : r(Fragment, {
          children: [
            Ci,
            toolProgress,
            e(AgentWaitingMessages, { focused: focused }, focused.conversationKey),
            showSandboxViolations && e(SandboxViolationExpandedView, {}),
            e(TranscriptModeFooter, {
              showAllInTranscript: io,
              virtualScroll: !1,
              suppressShowAll: dumpMode,
              status: ao || void 0,
            }),
          ],
        })),
      ($[71] = dumpMode),
      ($[72] = ao),
      ($[73] = focused),
      ($[74] = scrollViewport),
      ($[75] = Yo),
      ($[76] = Fn),
      ($[77] = mn),
      ($[78] = No),
      ($[79] = setQuery),
      ($[80] = io),
      ($[81] = showSandboxViolations),
      ($[82] = toolProgress),
      ($[83] = so),
      ($[84] = Ci),
      ($[85] = ps));
  else ps = $[85];
  let kr;
  if ($[86] !== oi || $[87] !== Hi || $[88] !== Zi || $[89] !== qn || $[90] !== ps)
    ((kr = r(Fragment, { children: [oi, Hi, Zi, qn, ps] })),
      ($[86] = oi),
      ($[87] = Hi),
      ($[88] = Zi),
      ($[89] = qn),
      ($[90] = ps),
      ($[91] = kr));
  else kr = $[91];
  return kr;
}
//@ chunk-18hwfzwa.js:149068-149072 placement
j();

export { TranscriptView };
