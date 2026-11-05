/**
 * hooks/useHistorySearch.ts
 *
 * Ctrl+R 历史搜索状态机：流式读取历史、增量匹配、接受/执行/取消，记录 history_search_* 事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useHistorySearch.ts
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 2, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import {
  getModeFromInput as getModeFromInput_2,
  stripModePrefix,
} from "../components/PromptInput/inputModes.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:556288-556327 placement
var historyPromptOrigin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:556288", () => {
  historyPromptOrigin = Object.freeze({
    kind: "history",
  });
});
//@ chunk-czq1j3j2.js:556327-556425 placement
function logHistoryReaderError(error) {
  if (isTransientHistoryReadError(error)) {
    logForDebugging(`History search reader failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  logError(error);
}
//@ chunk-czq1j3j2.js:556425-556656 layout
function findMatchCursorOffset(text, pastedContents, needle) {
  let index = text.toLowerCase().lastIndexOf(needle);
  if (index !== -1) return index;
  let last = parsePastedRefs(text).findLast((ref) => {
    let entry = pastedContents[ref.id];
    return entry?.type === "text" && !entry.unavailable && entry.content.toLowerCase().includes(needle);
  });
  return last ? last.index : text.length;
}
//@ chunk-czq1j3j2.js:556656-559534 fingerprint (2.1.88 match: useHistorySearch, 0.689)
/**
 * Ctrl+R 历史搜索：打开时流式读取全部历史（history_search_scan），输入时增量匹配（含粘贴文本内容），accept 把匹配填回输入框，execute 直接提交，cancel 恢复原输入；记录 history_search_open/accept/execute 事件。
 */
function useHistorySearch(props, onExecute) {
  let { storageV5 } = useTheme_2();
  let setValue = useCallback(
    (value) => props.attribute(historyPromptOrigin, () => props.setValue(value)),
    [props],
  );
  let { setCursorOffset, setMode, setPastedContents } = props;
  let [isSearching, setIsSearching] = useState(false);
  let [query, setQuery] = useState("");
  let [exhausted, setExhausted] = useState(false);
  let [matchedEntry, setMatchedEntry] = useState(undefined);
  let historyReader = useRef(null);
  let seenPrompts = useRef(false);
  let historyReader_2 = useRef(undefined);
  let seenPrompts_2 = useRef(new Set());
  let closeHistoryReader = useCallback(() => {
    if (historyReader_2.current) {
      historyReader_2.current.return(undefined).catch(logHistoryReaderError);
      historyReader_2.current = undefined;
    }
  }, []);
  let reset = useCallback(
    (snapshot) => {
      setValue(snapshot.value);
      setCursorOffset(snapshot.cursorOffset);
      setMode(snapshot.mode);
      setPastedContents(snapshot.pastedContents);
    },
    [setValue, setCursorOffset, setMode, setPastedContents],
  );
  let searchHistory = useCallback(() => {
    historyReader.current = null;
    setIsSearching(false);
    setQuery("");
    setExhausted(false);
    setMatchedEntry(undefined);
    closeHistoryReader();
    seenPrompts_2.current.clear();
  }, [closeHistoryReader]);
  let runSearch = useCallback(
    async (resume, signal) => {
      let reader = historyReader.current;
      if (reader === null) return;
      if (query.length === 0) {
        closeHistoryReader();
        seenPrompts_2.current.clear();
        setMatchedEntry(undefined);
        setExhausted(false);
        reset(reader);
        return;
      }
      if (!resume) {
        closeHistoryReader();
        historyReader_2.current = getHistory(storageV5);
        seenPrompts_2.current.clear();
      }
      if (!historyReader_2.current) return;
      let reader_ = historyReader_2.current;
      let needle = query.toLowerCase();
      while (true) {
        if (signal?.aborted) return;
        let item = await reader_.next();
        if (claimOnce().claim("history_search_scan_ok")) logFeatureOk("history_search_scan");
        if (historyReader_2.current !== reader_) return;
        if (item.done) {
          setExhausted(true);
          return;
        }
        let { display, pastedContents } = item.value;
        let matchPosition =
          display.toLowerCase().includes(needle) ||
          expandHistoryDisplay(display, pastedContents).toLowerCase().includes(needle);
        let promptHistoryKey = getPromptHistoryKey(display, pastedContents);
        if (matchPosition && !seenPrompts_2.current.has(promptHistoryKey)) {
          seenPrompts_2.current.add(promptHistoryKey);
          setMatchedEntry(item.value);
          setExhausted(false);
          let mode = getModeFromInput_2(display);
          setMode(mode);
          setValue(display);
          setCursorOffset(findMatchCursorOffset(stripModePrefix(display), pastedContents, needle));
          return;
        }
      }
    },
    [query, closeHistoryReader, reset, setValue, setCursorOffset, setMode, storageV5],
  );
  let handleStartSearch = useCallback(() => {
    logFeatureOk("history_search_open");
    historyReader.current = props.getSnapshot();
    seenPrompts.current = false;
    setIsSearching(true);
    historyReader_2.current = getHistory(storageV5);
    seenPrompts_2.current.clear();
  }, [props, storageV5]);
  let handleNextMatch = useCallback(() => {
    runSearch(true).catch(logHistoryReaderError);
  }, [runSearch]);
  let handleAccept = useCallback(() => {
    let reader = historyReader.current;
    if (!reader) return;
    if (matchedEntry) {
      logFeatureOk("history_search_accept");
      let mode = renumberPastedContents({
        display: matchedEntry.display,
        pastedContents: matchedEntry.pastedContents,
      });
      let value = getModeFromInput_2(mode.display);
      let value_2 = stripModePrefix(mode.display);
      setValue(value_2);
      setCursorOffset(findMatchCursorOffset(value_2, mode.pastedContents, query.toLowerCase()));
      setMode(value);
      setPastedContents(mode.pastedContents);
    } else {
      if (query.length > 0) logFeatureSad("history_search_accept", "accept_no_match");
      setPastedContents(reader.pastedContents);
    }
    searchHistory();
  }, [matchedEntry, query, setCursorOffset, setValue, setMode, setPastedContents, searchHistory]);
  let handleCancel = useCallback(() => {
    let reader = historyReader.current;
    if (reader) reset(reader);
    searchHistory();
  }, [reset, searchHistory]);
  useEffect(
    () => () => {
      let reader = historyReader.current;
      if (reader) {
        reset(reader);
        closeHistoryReader();
      }
    },
    [reset, closeHistoryReader],
  );
  let handleExecute = useCallback(() => {
    if (seenPrompts.current) return;
    let reader = historyReader.current;
    if (query.length === 0) {
      if (reader) {
        seenPrompts.current = true;
        onExecute({
          display: reader.value,
          pastedContents: reader.pastedContents,
        });
      }
    } else if (matchedEntry) {
      logFeatureOk("history_search_execute");
      let mode = renumberPastedContents({
        display: matchedEntry.display,
        pastedContents: matchedEntry.pastedContents,
      });
      let value = getModeFromInput_2(mode.display);
      let value_2 = stripModePrefix(mode.display);
      setValue(value_2);
      setMode(value);
      seenPrompts.current = true;
      onExecute({
        display: value_2,
        pastedContents: mode.pastedContents,
      });
    } else logFeatureSad("history_search_execute", "execute_no_match");
    searchHistory();
  }, [query, matchedEntry, onExecute, setValue, setMode, searchHistory]);
  useKeybinding("history:search", handleStartSearch, {
    context: "Global",
    isActive: isFullscreenActive() ? false : !isSearching,
  });
  let historySearchHandlers = useMemo(
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
    isActive: isSearching,
  });
  let handleKeyDown = useCallback(
    (e) => {
      if (!isSearching) return;
      if (e.key === "backspace" && query === "") {
        e.preventDefault();
        handleCancel();
      }
    },
    [isSearching, query, handleCancel],
  );
  useEffect(() => {
    let controller = new AbortController();
    runSearch(false, controller.signal).catch(logHistoryReaderError);
    return () => {
      controller.abort();
    };
  }, [runSearch]);
  return {
    isSearching,
    historyQuery: query,
    setHistoryQuery: setQuery,
    historyMatch: matchedEntry,
    historyFailedMatch: exhausted,
    handleKeyDown,
    openSearch: handleStartSearch,
  };
}
export { useHistorySearch, historyPromptOrigin };
