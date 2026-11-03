/**
 * hooks/useArrowKeyHistory.tsx
 *
 * 上下箭头浏览 prompt 历史：分批加载历史、按模式（bash/prompt）过滤、首次使用时提示 Ctrl+R 搜索。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useArrowKeyHistory.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: affinity 1, fingerprint 2, layout 2
 */
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { string } from "../../vendor/zod/v4/classic/schemas.js";
import { Text } from "../ink/components/Text.js";
import { getModeFromInput as getModeFromInput_2 } from "../components/PromptInput/inputModes.js";
import { HostScoped } from "../utils/hostScoped.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { selectDraftValue } from "../screens/repl/PromptDraft.js";
import { y, R, ce } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import {
  collapseSmallPastedBlocks,
  renumberPastedContents,
  getHistoryGeneration,
  readProjectHistory,
  countHistoryForProject,
} from "../history.js";
import { mergeTurnTags } from "../utils/userTurnTags.js";
import { ConfigurableShortcutHint } from "../components/ConfigurableShortcutHint.js";
import { NOTIFICATION_TIMEOUT_MS } from "../components/PromptInput/Notifications.js";

//@ chunk-18hwfzwa.js:858877-858888 affinity
var HISTORY_BATCH_SIZE = 10;
//@ chunk-18hwfzwa.js:858888-859366 fingerprint = loadHistoryEntries (0.663)
class HistoryLoader {
  #e = null;
  #t = 0;
  #o = undefined;
  #n = 0;
  get pending() {
    return this.#e;
  }
  async load(minCount, x, D, L) {
    let ee = Math.ceil(minCount / HISTORY_BATCH_SIZE) * HISTORY_BATCH_SIZE;
    while (this.#e) {
      if (this.#t >= ee && this.#o === x && this.#n === D) return this.#e;
      await this.#e;
    }
    this.#t = ee;
    this.#o = x;
    this.#n = D;
    let ke = (async () => {
      let entries = [];
      let loaded = 0;
      for await (let entry of L()) {
        if (x) {
          if (getModeFromInput_2(entry.display) !== x) continue;
        }
        entries.push(entry);
        loaded++;
        if (loaded >= ee) break;
      }
      return entries;
    })();
    this.#e = ke;
    try {
      return await ke;
    } finally {
      if (this.#e === ke) {
        this.#e = null;
        this.#t = 0;
        this.#o = undefined;
        this.#n = 0;
      }
    }
  }
}
//@ chunk-18hwfzwa.js:859366-859393 layout
var historyLoaderByHost = new HostScoped(() => new HistoryLoader());
//@ chunk-18hwfzwa.js:859393-859603 layout
function findHistoryOverlapIndex(h, x) {
  if (x.length === 0) return 0;
  for (let idx = 0; idx < h.length; idx++) {
    let min = Math.min(x.length, h.length - idx);
    let ee = true;
    for (let idx_2 = 0; idx_2 < min; idx_2++)
      if (h[idx + idx_2]?.display !== x[idx_2]?.display) {
        ee = false;
        break;
      }
    if (ee) return idx;
  }
  return -1;
}
//@ chunk-18hwfzwa.js:859603-864032 fingerprint = useArrowKeyHistory (0.743)
/**
 * 上下箭头历史：按批（10 条）从历史文件加载，按 bash/prompt 模式过滤，记住当前草稿以便回到底部；第一次使用时弹出 "ctrl+r to search history" 提示；返回 onHistoryUp/Down/Reset。
 */
function useArrowKeyHistory(draft, x, D) {
  let { storageV5 } = useTheme_2();
  let ee = historyLoaderByHost.of(useHost());
  let value = useStoreSelector(draft, selectDraftValue);
  let Re = D !== undefined;
  let [Be, He] = y(0);
  let [We, ze] = y(null);
  let hasShownSearchHintRef = R(0);
  let rt = R(false);
  let kt = R(null);
  let At = R(false);
  let { addNotification, removeNotification } = useNotifications();
  let historyCache = R([]);
  let historyCacheModeFilter = R(undefined);
  let historyIndexRef = R(0);
  let initialModeFilterRef = R(0);
  let currentInputRef = R(null);
  let pastedContentsRef = R(undefined);
  let currentModeRef = R(new Map());
  let historyOverlapIndexRef = R(0);
  let ao = R(false);
  let co = R(0);
  let setInputWithCursor = ce(
    (value, mode, contents, cursorToStart) => {
      value = value.replaceAll("\t", "    ");
      currentInputRef.current = value;
      x(value, mode, contents, cursorToStart === "end" ? value.length : 0);
    },
    [x],
  );
  let updateInput = ce(
    (input, cursorToStart) => {
      if (!input || !input.display) return false;
      let Fn = Re
        ? collapseSmallPastedBlocks(input.display)
        : {
            text: input.display,
            pastedContents: {},
          };
      let mode_0 = renumberPastedContents({
        display: Fn.text,
        pastedContents: input.pastedContents ?? {},
      });
      let Go = mergeTurnTags(mode_0.pastedContents, Object.values(Fn.pastedContents));
      let modeFromInput = getModeFromInput_2(input.display);
      let value = modeFromInput === "bash" ? mode_0.display.slice(1) : mode_0.display;
      setInputWithCursor(value, modeFromInput, Go, cursorToStart);
      return true;
    },
    [setInputWithCursor, Re],
  );
  let showSearchHint = ce(
    (Yo, kn) => {
      let Fn = currentModeRef.current.get(Yo);
      if (Fn) {
        setInputWithCursor(Fn.display, Fn.mode, Fn.pastedContents, kn);
        return true;
      }
      return updateInput(historyCache.current[Yo], kn);
    },
    [setInputWithCursor, updateInput],
  );
  let onHistoryUp = ce(() => {
    addNotification({
      key: "search-history-hint",
      kind: "contextual",
      jsx: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(ConfigurableShortcutHint, {
          action: "history:search",
          context: "Global",
          fallback: "ctrl+r",
          description: "search history",
        }),
      }),
      priority: "immediate",
      timeoutMs: NOTIFICATION_TIMEOUT_MS,
    });
  }, [addNotification]);
  let Ho = ce(() => {
    let targetIndex = kt.current;
    if (targetIndex)
      setInputWithCursor(targetIndex.display, targetIndex.mode, targetIndex.pastedContents ?? {}, "start");
    else setInputWithCursor("", pastedContentsRef.current ?? "prompt", {}, "start");
  }, [setInputWithCursor]);
  let Io = ce(
    (Yo) => {
      let historyOverlapIndex = findHistoryOverlapIndex(Yo, historyCache.current);
      historyCache.current = Yo;
      if (historyOverlapIndex === 0) return historyOverlapIndex;
      hasShownSearchHintRef.current++;
      rt.current = false;
      if (historyOverlapIndex < 0) {
        if (historyOverlapIndexRef.current > 0 && draft.value === currentInputRef.current) Ho();
        initialModeFilterRef.current = 0;
        He(0);
        historyOverlapIndexRef.current = 0;
        currentModeRef.current.clear();
        ze(null);
        return historyOverlapIndex;
      }
      ze((Fn) => (Fn === null ? Fn : Fn + historyOverlapIndex));
      if (initialModeFilterRef.current > 0) {
        initialModeFilterRef.current += historyOverlapIndex;
        He(initialModeFilterRef.current);
      }
      if (historyOverlapIndexRef.current > 0) historyOverlapIndexRef.current += historyOverlapIndex;
      if (currentModeRef.current.size > 0)
        currentModeRef.current = new Map(
          [...currentModeRef.current].map(([Fn, bn]) => [Fn + historyOverlapIndex, bn]),
        );
      return historyOverlapIndex;
    },
    [draft, Ho],
  );
  let Wo = ce(
    async (Yo, kn, Fn) => {
      for (;;) {
        let historyGeneration = getHistoryGeneration();
        let Go = await ee.load(
          Math.max(Fn() + 1, historyCache.current.length + HISTORY_BATCH_SIZE),
          kn,
          historyGeneration,
          () =>
            readProjectHistory(storageV5, {
              withClearedDrafts: true,
            }),
        );
        if (co.current !== Yo) return "cancelled";
        if (getHistoryGeneration() !== historyGeneration) continue;
        if (
          historyCacheModeFilter.current !== kn ||
          (Go.length <= historyCache.current.length && historyIndexRef.current === historyGeneration)
        )
          return "unchanged";
        let hn = Io(Go);
        historyIndexRef.current = historyGeneration;
        if (hn < 0) return "restarted";
        if (hn > 0 && Fn() >= Go.length) continue;
        return "adopted";
      }
    },
    [Io, ee, storageV5],
  );
  let onHistoryUp_2 = ce(() => {
    let inputAtPress = initialModeFilterRef.current;
    let { value: kn, pastedContents, mode } = draft.getSnapshot();
    let Go = historyOverlapIndexRef.current === 0;
    if (inputAtPress === 0) pastedContentsRef.current = mode === "bash" ? mode : undefined;
    let pastedContentsAtPress = pastedContentsRef.current;
    let historyGeneration = getHistoryGeneration();
    if (
      historyCacheModeFilter.current !== pastedContentsAtPress ||
      (inputAtPress === 0 && !D && historyIndexRef.current !== historyGeneration)
    ) {
      historyCache.current = [];
      historyCacheModeFilter.current = pastedContentsAtPress;
      historyIndexRef.current = historyGeneration;
      currentModeRef.current.clear();
      hasShownSearchHintRef.current++;
      rt.current = false;
      ze(null);
    }
    let Xo = D;
    if (Xo) {
      let on = pastedContentsAtPress
        ? Xo.filter((cn) => getModeFromInput_2(cn.display) === pastedContentsAtPress)
        : Xo;
      let _o = false;
      if (on.length > historyCache.current.length) {
        _o = Io(on) < 0;
        inputAtPress = initialModeFilterRef.current;
      }
      ze(historyCache.current.length);
      if (_o) return;
    }
    if (inputAtPress === 0 && !Xo && !rt.current) {
      rt.current = true;
      let modeAtPress = hasShownSearchHintRef.current;
      countHistoryForProject(
        pastedContentsAtPress ? (_o) => getModeFromInput_2(_o) === pastedContentsAtPress : undefined,
        storageV5,
      ).then((_o) => {
        if (hasShownSearchHintRef.current !== modeAtPress) return;
        rt.current = false;
        ze(_o);
      });
    }
    let Sn = () => {
      if (initialModeFilterRef.current !== inputAtPress) return;
      if (inputAtPress >= historyCache.current.length) return;
      if (inputAtPress === 0) {
        if (Go && kn.trim() !== "")
          kt.current = {
            display: kn,
            pastedContents,
            mode,
          };
      } else if (inputAtPress === historyOverlapIndexRef.current)
        currentModeRef.current.set(inputAtPress - 1, {
          display: kn,
          pastedContents,
          mode,
        });
      let on = inputAtPress + 1;
      initialModeFilterRef.current = on;
      He(on);
      if (showSearchHint(inputAtPress, "end")) historyOverlapIndexRef.current = on;
      if (on >= 2 && !Xo && !At.current) {
        At.current = true;
        onHistoryUp();
      }
    };
    if (Xo || (inputAtPress < historyCache.current.length && historyIndexRef.current === historyGeneration)) {
      Sn();
      return;
    }
    ao.current = true;
    let $n = ++co.current;
    (async () => {
      try {
        let on = await Wo($n, pastedContentsAtPress, () => initialModeFilterRef.current);
        if (on === "cancelled" || on === "restarted") return;
        if (on === "adopted") inputAtPress = initialModeFilterRef.current;
        if (draft.value !== kn) return;
        Sn();
      } catch {
      } finally {
        if (co.current === $n) ao.current = false;
      }
    })();
  }, [draft, D, Io, Wo, showSearchHint, onHistoryUp, storageV5]);
  let onHistoryDown = ce(() => {
    let modeFilter = ao.current;
    if (modeFilter) {
      co.current++;
      ao.current = false;
    }
    let kn = initialModeFilterRef.current;
    if (kn > 0 && kn === historyOverlapIndexRef.current) {
      let { value: bn, pastedContents, mode } = draft.getSnapshot();
      currentModeRef.current.set(kn - 1, {
        display: bn,
        pastedContents,
        mode,
      });
    }
    let Fn = () => {
      let currentIndex = initialModeFilterRef.current;
      if (currentIndex > 1) {
        initialModeFilterRef.current = currentIndex - 1;
        He(currentIndex - 1);
        if (showSearchHint(currentIndex - 2, "start")) historyOverlapIndexRef.current = currentIndex - 1;
      } else if (currentIndex === 1) {
        initialModeFilterRef.current = 0;
        He(0);
        Ho();
        historyOverlapIndexRef.current = 0;
      }
    };
    if (kn > 0 && !D && historyIndexRef.current !== getHistoryGeneration()) {
      let bn = ++co.current;
      let Go = draft.value;
      Wo(bn, pastedContentsRef.current, () => Math.max(initialModeFilterRef.current - 2, 0)).then(
        (hn) => {
          if ((hn === "adopted" || hn === "unchanged") && draft.value === Go) Fn();
        },
        () => {},
      );
      return false;
    }
    Fn();
    return kn <= 0 && !modeFilter;
  }, [draft, D, Wo, Ho, showSearchHint]);
  let resetHistory = ce(() => {
    kt.current = null;
    He(0);
    ze(null);
    hasShownSearchHintRef.current++;
    rt.current = false;
    initialModeFilterRef.current = 0;
    historyOverlapIndexRef.current = 0;
    co.current++;
    ao.current = false;
    currentInputRef.current = null;
    pastedContentsRef.current = undefined;
    removeNotification("search-history-hint");
    historyCache.current = [];
    historyCacheModeFilter.current = undefined;
    currentModeRef.current.clear();
  }, [removeNotification]);
  let dismissSearchHint = ce(() => {
    removeNotification("search-history-hint");
  }, [removeNotification]);
  return {
    historyIndex: Be,
    historyTotal: We,
    historyEdited: Be > 0 && value !== currentInputRef.current,
    onHistoryUp: onHistoryUp_2,
    onHistoryDown,
    resetHistory,
    dismissSearchHint,
  };
}
export { useArrowKeyHistory };
