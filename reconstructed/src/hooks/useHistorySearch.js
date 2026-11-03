/**
 * hooks/useHistorySearch.ts
 *
 * Ctrl+R 历史搜索状态机：流式读取历史、增量匹配、接受/执行/取消，记录 history_search_* 事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useHistorySearch.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 2, layout 1, fingerprint 1
 */
import {
  isTransientHistoryReadError,
  parsePastedRefs,
  getHistory,
  expandHistoryDisplay,
  getPromptHistoryKey,
  renumberPastedContents,
} from "../history.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { ce, y, R, P, Q } from "../../vendor/react/cjs/react.production.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import {
  getModeFromInput as getModeFromInput_2,
  stripModePrefix,
} from "../components/PromptInput/inputModes.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";

//@ chunk-18hwfzwa.js:535581-535620 placement
var freeze = Object.freeze({ kind: "history" });
//@ chunk-18hwfzwa.js:535620-535718 placement
function Uce(h) {
  if (isTransientHistoryReadError(h)) {
    logForDebugging(`History search reader failed: ${errorMessage(h)}`, { level: "error" });
    return;
  }
  logError(h);
}
//@ chunk-18hwfzwa.js:535718-535949 layout
function findMatchCursorOffset(h, x, D) {
  let index = h.toLowerCase().lastIndexOf(D);
  if (index !== -1) return index;
  let last = parsePastedRefs(h).findLast((ke) => {
    let Re = x[ke.id];
    return Re?.type === "text" && !Re.unavailable && Re.content.toLowerCase().includes(D);
  });
  return last ? last.index : h.length;
}
/**
 * Ctrl+R 历史搜索：打开时流式读取全部历史（history_search_scan），输入时增量匹配（含粘贴文本内容），accept 把匹配填回输入框，execute 直接提交，cancel 恢复原输入；记录 history_search_open/accept/execute 事件。
 */
//@ chunk-18hwfzwa.js:535949-538827 fingerprint = useHistorySearch (0.689)
function useHistorySearch(h, x) {
  let { storageV5: storageV5 } = Me(),
    L = ce((Ro) => h.attribute(freeze, () => h.setValue(Ro)), [h]),
    { setCursorOffset: setCursorOffset, setMode: setMode, setPastedContents: setPastedContents } = h,
    [Be, He] = y(!1),
    [We, ze] = y(""),
    [Xe, rt] = y(!1),
    [kt, At] = y(void 0),
    historyReader = R(null),
    seenPrompts = R(!1),
    searchAbortController = R(void 0),
    Dt = R(new Set()),
    closeHistoryReader = ce(() => {
      if (searchAbortController.current)
        (searchAbortController.current.return(void 0).catch(Uce), (searchAbortController.current = void 0));
    }, []),
    reset = ce(
      (Ro) => {
        (L(Ro.value),
          setCursorOffset(Ro.cursorOffset),
          setMode(Ro.mode),
          setPastedContents(Ro.pastedContents));
      },
      [L, setCursorOffset, setMode, setPastedContents],
    ),
    searchHistory = ce(() => {
      ((historyReader.current = null),
        He(!1),
        ze(""),
        rt(!1),
        At(void 0),
        closeHistoryReader(),
        Dt.current.clear());
    }, [closeHistoryReader]),
    io = ce(
      async (resume, signal) => {
        let Io = historyReader.current;
        if (Io === null) return;
        if (We.length === 0) {
          (closeHistoryReader(), Dt.current.clear(), At(void 0), rt(!1), reset(Io));
          return;
        }
        if (!resume)
          (closeHistoryReader(), (searchAbortController.current = getHistory(storageV5)), Dt.current.clear());
        if (!searchAbortController.current) return;
        let Wo = searchAbortController.current,
          lower = We.toLowerCase();
        while (!0) {
          if (signal?.aborted) return;
          let item = await Wo.next();
          if (claimOnce().claim("history_search_scan_ok")) logFeatureOk("history_search_scan");
          if (searchAbortController.current !== Wo) return;
          if (item.done) {
            rt(!0);
            return;
          }
          let { display: display, pastedContents: pastedContents } = item.value,
            Yo =
              display.toLowerCase().includes(lower) ||
              expandHistoryDisplay(display, pastedContents).toLowerCase().includes(lower),
            kn = getPromptHistoryKey(display, pastedContents);
          if (Yo && !Dt.current.has(kn)) {
            (Dt.current.add(kn), At(item.value), rt(!1));
            let mode = getModeFromInput_2(display);
            (setMode(mode),
              L(display),
              setCursorOffset(findMatchCursorOffset(stripModePrefix(display), pastedContents, lower)));
            return;
          }
        }
      },
      [We, closeHistoryReader, reset, L, setCursorOffset, setMode, storageV5],
    ),
    handleStartSearch = ce(() => {
      (logFeatureOk("history_search_open"),
        (historyReader.current = h.getSnapshot()),
        (seenPrompts.current = !1),
        He(!0),
        (searchAbortController.current = getHistory(storageV5)),
        Dt.current.clear());
    }, [h, storageV5]),
    handleNextMatch = ce(() => {
      io(!0).catch(Uce);
    }, [io]),
    handleAccept = ce(() => {
      let Ro = historyReader.current;
      if (!Ro) return;
      if (kt) {
        logFeatureOk("history_search_accept");
        let mode = renumberPastedContents({ display: kt.display, pastedContents: kt.pastedContents }),
          value = getModeFromInput_2(mode.display),
          Wo = stripModePrefix(mode.display);
        (L(Wo),
          setCursorOffset(findMatchCursorOffset(Wo, mode.pastedContents, We.toLowerCase())),
          setMode(value),
          setPastedContents(mode.pastedContents));
      } else {
        if (We.length > 0) logFeatureSad("history_search_accept", "accept_no_match");
        setPastedContents(Ro.pastedContents);
      }
      searchHistory();
    }, [kt, We, setCursorOffset, L, setMode, setPastedContents, searchHistory]),
    handleCancel = ce(() => {
      let Ro = historyReader.current;
      if (Ro) reset(Ro);
      searchHistory();
    }, [reset, searchHistory]);
  P(
    () => () => {
      let Ro = historyReader.current;
      if (Ro) (reset(Ro), closeHistoryReader());
    },
    [reset, closeHistoryReader],
  );
  let handleExecute = ce(() => {
    if (seenPrompts.current) return;
    let Ro = historyReader.current;
    if (We.length === 0) {
      if (Ro) ((seenPrompts.current = !0), x({ display: Ro.value, pastedContents: Ro.pastedContents }));
    } else if (kt) {
      logFeatureOk("history_search_execute");
      let mode = renumberPastedContents({ display: kt.display, pastedContents: kt.pastedContents }),
        value = getModeFromInput_2(mode.display),
        Wo = stripModePrefix(mode.display);
      (L(Wo),
        setMode(value),
        (seenPrompts.current = !0),
        x({ display: Wo, pastedContents: mode.pastedContents }));
    } else logFeatureSad("history_search_execute", "execute_no_match");
    searchHistory();
  }, [We, kt, x, L, setMode, searchHistory]);
  useKeybinding("history:search", handleStartSearch, {
    context: "Global",
    isActive: isFullscreenActive() ? !1 : !Be,
  });
  let historySearchHandlers = Q(
    () => ({
      "historySearch:next": handleNextMatch,
      "historySearch:accept": handleAccept,
      "historySearch:cancel": handleCancel,
      "historySearch:execute": handleExecute,
    }),
    [handleNextMatch, handleAccept, handleCancel, handleExecute],
  );
  MessageActionsKeybindings(historySearchHandlers, { context: "HistorySearch", isActive: Be });
  let Bo = ce(
    (Ro) => {
      if (!Be) return;
      if (Ro.key === "backspace" && We === "") (Ro.preventDefault(), handleCancel());
    },
    [Be, We, handleCancel],
  );
  return (
    P(() => {
      let controller = new AbortController();
      return (
        io(!1, controller.signal).catch(Uce),
        () => {
          controller.abort();
        }
      );
    }, [io]),
    {
      isSearching: Be,
      historyQuery: We,
      setHistoryQuery: ze,
      historyMatch: kt,
      historyFailedMatch: Xe,
      handleKeyDown: Bo,
      openSearch: handleStartSearch,
    }
  );
}

export { freeze, useHistorySearch };
