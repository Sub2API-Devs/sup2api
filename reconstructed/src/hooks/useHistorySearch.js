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
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
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
var IT = Object.freeze({
  kind: "history",
});
//@ chunk-18hwfzwa.js:535620-535718 placement
function logHistoryReaderError(h) {
  if (isTransientHistoryReadError(h)) {
    logForDebugging(`History search reader failed: ${errorMessage(h)}`, {
      level: "error",
    });
    return;
  }
  logError(h);
}
//@ chunk-18hwfzwa.js:535718-535949 layout
function findMatchCursorOffset(h, pastedContents, D) {
  let index = h.toLowerCase().lastIndexOf(D);
  if (index !== -1) return index;
  let last = parsePastedRefs(h).findLast((ke) => {
    let Re = pastedContents[ke.id];
    return Re?.type === "text" && !Re.unavailable && Re.content.toLowerCase().includes(D);
  });
  return last ? last.index : h.length;
}
//@ chunk-18hwfzwa.js:535949-538827 fingerprint = useHistorySearch (0.689)
/**
 * Ctrl+R 历史搜索：打开时流式读取全部历史（history_search_scan），输入时增量匹配（含粘贴文本内容），accept 把匹配填回输入框，execute 直接提交，cancel 恢复原输入；记录 history_search_open/accept/execute 事件。
 */
function useHistorySearch(props, x) {
  let { storageV5 } = useTheme_2();
  let L = ce((Ro) => props.attribute(IT, () => props.setValue(Ro)), [props]);
  let { setCursorOffset, setMode, setPastedContents } = props;
  let [Be, He] = y(false);
  let [We, ze] = y("");
  let [Xe, rt] = y(false);
  let [kt, At] = y(undefined);
  let historyReader = R(null);
  let seenPrompts = R(false);
  let historyReader_2 = R(undefined);
  let seenPrompts_2 = R(new Set());
  let closeHistoryReader = ce(() => {
    if (historyReader_2.current) {
      historyReader_2.current.return(undefined).catch(logHistoryReaderError);
      historyReader_2.current = undefined;
    }
  }, []);
  let reset = ce(
    (Ro) => {
      L(Ro.value);
      setCursorOffset(Ro.cursorOffset);
      setMode(Ro.mode);
      setPastedContents(Ro.pastedContents);
    },
    [L, setCursorOffset, setMode, setPastedContents],
  );
  let searchHistory = ce(() => {
    historyReader.current = null;
    He(false);
    ze("");
    rt(false);
    At(undefined);
    closeHistoryReader();
    seenPrompts_2.current.clear();
  }, [closeHistoryReader]);
  let io = ce(
    async (resume, signal) => {
      let Io = historyReader.current;
      if (Io === null) return;
      if (We.length === 0) {
        closeHistoryReader();
        seenPrompts_2.current.clear();
        At(undefined);
        rt(false);
        reset(Io);
        return;
      }
      if (!resume) {
        closeHistoryReader();
        historyReader_2.current = getHistory(storageV5);
        seenPrompts_2.current.clear();
      }
      if (!historyReader_2.current) return;
      let Wo = historyReader_2.current;
      let lower = We.toLowerCase();
      while (true) {
        if (signal?.aborted) return;
        let item = await Wo.next();
        if (claimOnce().claim("history_search_scan_ok")) logFeatureOk("history_search_scan");
        if (historyReader_2.current !== Wo) return;
        if (item.done) {
          rt(true);
          return;
        }
        let { display, pastedContents } = item.value;
        let matchPosition =
          display.toLowerCase().includes(lower) ||
          expandHistoryDisplay(display, pastedContents).toLowerCase().includes(lower);
        let promptHistoryKey = getPromptHistoryKey(display, pastedContents);
        if (matchPosition && !seenPrompts_2.current.has(promptHistoryKey)) {
          seenPrompts_2.current.add(promptHistoryKey);
          At(item.value);
          rt(false);
          let mode = getModeFromInput_2(display);
          setMode(mode);
          L(display);
          setCursorOffset(findMatchCursorOffset(stripModePrefix(display), pastedContents, lower));
          return;
        }
      }
    },
    [We, closeHistoryReader, reset, L, setCursorOffset, setMode, storageV5],
  );
  let handleStartSearch = ce(() => {
    logFeatureOk("history_search_open");
    historyReader.current = props.getSnapshot();
    seenPrompts.current = false;
    He(true);
    historyReader_2.current = getHistory(storageV5);
    seenPrompts_2.current.clear();
  }, [props, storageV5]);
  let handleNextMatch = ce(() => {
    io(true).catch(logHistoryReaderError);
  }, [io]);
  let handleAccept = ce(() => {
    let Ro = historyReader.current;
    if (!Ro) return;
    if (kt) {
      logFeatureOk("history_search_accept");
      let mode = renumberPastedContents({
        display: kt.display,
        pastedContents: kt.pastedContents,
      });
      let value = getModeFromInput_2(mode.display);
      let value_2 = stripModePrefix(mode.display);
      L(value_2);
      setCursorOffset(findMatchCursorOffset(value_2, mode.pastedContents, We.toLowerCase()));
      setMode(value);
      setPastedContents(mode.pastedContents);
    } else {
      if (We.length > 0) logFeatureSad("history_search_accept", "accept_no_match");
      setPastedContents(Ro.pastedContents);
    }
    searchHistory();
  }, [kt, We, setCursorOffset, L, setMode, setPastedContents, searchHistory]);
  let handleCancel = ce(() => {
    let Ro = historyReader.current;
    if (Ro) reset(Ro);
    searchHistory();
  }, [reset, searchHistory]);
  P(
    () => () => {
      let Ro = historyReader.current;
      if (Ro) {
        reset(Ro);
        closeHistoryReader();
      }
    },
    [reset, closeHistoryReader],
  );
  let handleExecute = ce(() => {
    if (seenPrompts.current) return;
    let Ro = historyReader.current;
    if (We.length === 0) {
      if (Ro) {
        seenPrompts.current = true;
        x({
          display: Ro.value,
          pastedContents: Ro.pastedContents,
        });
      }
    } else if (kt) {
      logFeatureOk("history_search_execute");
      let mode = renumberPastedContents({
        display: kt.display,
        pastedContents: kt.pastedContents,
      });
      let value = getModeFromInput_2(mode.display);
      let Wo = stripModePrefix(mode.display);
      L(Wo);
      setMode(value);
      seenPrompts.current = true;
      x({
        display: Wo,
        pastedContents: mode.pastedContents,
      });
    } else logFeatureSad("history_search_execute", "execute_no_match");
    searchHistory();
  }, [We, kt, x, L, setMode, searchHistory]);
  useKeybinding("history:search", handleStartSearch, {
    context: "Global",
    isActive: isFullscreenActive() ? false : !Be,
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
  MessageActionsKeybindings(historySearchHandlers, {
    context: "HistorySearch",
    isActive: Be,
  });
  let handleKeyDown = ce(
    (e) => {
      if (!Be) return;
      if (e.key === "backspace" && We === "") {
        e.preventDefault();
        handleCancel();
      }
    },
    [Be, We, handleCancel],
  );
  P(() => {
    let controller = new AbortController();
    io(false, controller.signal).catch(logHistoryReaderError);
    return () => {
      controller.abort();
    };
  }, [io]);
  return {
    isSearching: Be,
    historyQuery: We,
    setHistoryQuery: ze,
    historyMatch: kt,
    historyFailedMatch: Xe,
    handleKeyDown,
    openSearch: handleStartSearch,
  };
}
export { useHistorySearch, IT };
