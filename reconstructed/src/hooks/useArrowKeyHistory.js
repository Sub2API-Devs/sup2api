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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { Text } from "../ink/components/Text.js";
import { getModeFromInput as getModeFromInput_2 } from "../components/PromptInput/inputModes.js";
import { HostScoped } from "../utils/hostScoped.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { selectDraftValue } from "../screens/repl/PromptDraft.js";
import { y, R, ce } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import {
  collapseSmallPastedBlocks,
  renumberPastedContents,
  Aer,
  g4r,
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
  #o = void 0;
  #n = 0;
  get pending() {
    return this.#e;
  }
  async load(h, x, D, L) {
    let ee = Math.ceil(h / HISTORY_BATCH_SIZE) * HISTORY_BATCH_SIZE;
    while (this.#e) {
      if (this.#t >= ee && this.#o === x && this.#n === D) return this.#e;
      await this.#e;
    }
    ((this.#t = ee), (this.#o = x), (this.#n = D));
    let ke = (async () => {
      let Re = [],
        Be = 0;
      for await (let He of L()) {
        if (x) {
          if (getModeFromInput_2(He.display) !== x) continue;
        }
        if ((Re.push(He), Be++, Be >= ee)) break;
      }
      return Re;
    })();
    this.#e = ke;
    try {
      return await ke;
    } finally {
      if (this.#e === ke) ((this.#e = null), (this.#t = 0), (this.#o = void 0), (this.#n = 0));
    }
  }
}
//@ chunk-18hwfzwa.js:859366-859393 layout
var historyLoaderByHost = new HostScoped(() => new HistoryLoader());
//@ chunk-18hwfzwa.js:859393-859603 layout
function findHistoryOverlapIndex(h, x) {
  if (x.length === 0) return 0;
  for (let D = 0; D < h.length; D++) {
    let min = Math.min(x.length, h.length - D),
      ee = !0;
    for (let ke = 0; ke < min; ke++)
      if (h[D + ke]?.display !== x[ke]?.display) {
        ee = !1;
        break;
      }
    if (ee) return D;
  }
  return -1;
}
/**
 * 上下箭头历史：按批（10 条）从历史文件加载，按 bash/prompt 模式过滤，记住当前草稿以便回到底部；第一次使用时弹出 "ctrl+r to search history" 提示；返回 onHistoryUp/Down/Reset。
 */
//@ chunk-18hwfzwa.js:859603-864032 fingerprint = useArrowKeyHistory (0.743)
function useArrowKeyHistory(h, x, D) {
  let { storageV5: storageV5 } = Me(),
    of = historyLoaderByHost.of(useHost()),
    value = useStoreSelector(h, selectDraftValue),
    Re = D !== void 0,
    [Be, He] = y(0),
    [We, ze] = y(null),
    hasShownSearchHintRef = R(0),
    rt = R(!1),
    kt = R(null),
    At = R(!1),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    historyCache = R([]),
    historyCacheModeFilter = R(void 0),
    historyIndexRef = R(0),
    initialModeFilterRef = R(0),
    currentInputRef = R(null),
    pastedContentsRef = R(void 0),
    currentModeRef = R(new Map()),
    po = R(0),
    ao = R(!1),
    co = R(0),
    setInputWithCursor = ce(
      (value, mode, contents, bn) => {
        ((value = value.replaceAll("\t", "    ")),
          (currentInputRef.current = value),
          x(value, mode, contents, bn === "end" ? value.length : 0));
      },
      [x],
    ),
    updateInput = ce(
      (input, kn) => {
        if (!input || !input.display) return !1;
        let Fn = Re ? collapseSmallPastedBlocks(input.display) : { text: input.display, pastedContents: {} },
          mode_0 = renumberPastedContents({ display: Fn.text, pastedContents: input.pastedContents ?? {} }),
          Go = mergeTurnTags(mode_0.pastedContents, Object.values(Fn.pastedContents)),
          hn = getModeFromInput_2(input.display),
          Mn = hn === "bash" ? mode_0.display.slice(1) : mode_0.display;
        return (setInputWithCursor(Mn, hn, Go, kn), !0);
      },
      [setInputWithCursor, Re],
    ),
    showSearchHint = ce(
      (Yo, kn) => {
        let Fn = currentModeRef.current.get(Yo);
        if (Fn) return (setInputWithCursor(Fn.display, Fn.mode, Fn.pastedContents, kn), !0);
        return updateInput(historyCache.current[Yo], kn);
      },
      [setInputWithCursor, updateInput],
    ),
    onHistoryUp = ce(() => {
      addNotification({
        key: "search-history-hint",
        kind: "contextual",
        jsx: e(Text, {
          dimColor: !0,
          children: e(ConfigurableShortcutHint, {
            action: "history:search",
            context: "Global",
            fallback: "ctrl+r",
            description: "search history",
          }),
        }),
        priority: "immediate",
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
      });
    }, [addNotification]),
    Ho = ce(() => {
      let targetIndex = kt.current;
      if (targetIndex)
        setInputWithCursor(targetIndex.display, targetIndex.mode, targetIndex.pastedContents ?? {}, "start");
      else setInputWithCursor("", pastedContentsRef.current ?? "prompt", {}, "start");
    }, [setInputWithCursor]),
    Io = ce(
      (Yo) => {
        let kn = findHistoryOverlapIndex(Yo, historyCache.current);
        if (((historyCache.current = Yo), kn === 0)) return kn;
        if ((hasShownSearchHintRef.current++, (rt.current = !1), kn < 0)) {
          if (po.current > 0 && h.value === currentInputRef.current) Ho();
          return (
            (initialModeFilterRef.current = 0),
            He(0),
            (po.current = 0),
            currentModeRef.current.clear(),
            ze(null),
            kn
          );
        }
        if ((ze((Fn) => (Fn === null ? Fn : Fn + kn)), initialModeFilterRef.current > 0))
          ((initialModeFilterRef.current += kn), He(initialModeFilterRef.current));
        if (po.current > 0) po.current += kn;
        if (currentModeRef.current.size > 0)
          currentModeRef.current = new Map([...currentModeRef.current].map(([Fn, bn]) => [Fn + kn, bn]));
        return kn;
      },
      [h, Ho],
    ),
    Wo = ce(
      async (Yo, kn, Fn) => {
        for (;;) {
          let bn = Aer(),
            load = await of.load(
              Math.max(Fn() + 1, historyCache.current.length + HISTORY_BATCH_SIZE),
              kn,
              bn,
              () => g4r(storageV5, { withClearedDrafts: !0 }),
            );
          if (co.current !== Yo) return "cancelled";
          if (Aer() !== bn) continue;
          if (
            historyCacheModeFilter.current !== kn ||
            (load.length <= historyCache.current.length && historyIndexRef.current === bn)
          )
            return "unchanged";
          let hn = Io(load);
          if (((historyIndexRef.current = bn), hn < 0)) return "restarted";
          if (hn > 0 && Fn() >= load.length) continue;
          return "adopted";
        }
      },
      [Io, of, storageV5],
    ),
    mn = ce(() => {
      let inputAtPress = initialModeFilterRef.current,
        { value: kn, pastedContents: pastedContents, mode: mode } = h.getSnapshot(),
        Go = po.current === 0;
      if (inputAtPress === 0) pastedContentsRef.current = mode === "bash" ? mode : void 0;
      let pastedContentsAtPress = pastedContentsRef.current,
        Mn = Aer();
      if (
        historyCacheModeFilter.current !== pastedContentsAtPress ||
        (inputAtPress === 0 && !D && historyIndexRef.current !== Mn)
      )
        ((historyCache.current = []),
          (historyCacheModeFilter.current = pastedContentsAtPress),
          (historyIndexRef.current = Mn),
          currentModeRef.current.clear(),
          hasShownSearchHintRef.current++,
          (rt.current = !1),
          ze(null));
      let Xo = D;
      if (Xo) {
        let on = pastedContentsAtPress
            ? Xo.filter((cn) => getModeFromInput_2(cn.display) === pastedContentsAtPress)
            : Xo,
          _o = !1;
        if (on.length > historyCache.current.length)
          ((_o = Io(on) < 0), (inputAtPress = initialModeFilterRef.current));
        if ((ze(historyCache.current.length), _o)) return;
      }
      if (inputAtPress === 0 && !Xo && !rt.current) {
        rt.current = !0;
        let modeAtPress = hasShownSearchHintRef.current;
        countHistoryForProject(
          pastedContentsAtPress ? (_o) => getModeFromInput_2(_o) === pastedContentsAtPress : void 0,
          storageV5,
        ).then((_o) => {
          if (hasShownSearchHintRef.current !== modeAtPress) return;
          ((rt.current = !1), ze(_o));
        });
      }
      let Sn = () => {
        if (initialModeFilterRef.current !== inputAtPress) return;
        if (inputAtPress >= historyCache.current.length) return;
        if (inputAtPress === 0) {
          if (Go && kn.trim() !== "")
            kt.current = { display: kn, pastedContents: pastedContents, mode: mode };
        } else if (inputAtPress === po.current)
          currentModeRef.current.set(inputAtPress - 1, {
            display: kn,
            pastedContents: pastedContents,
            mode: mode,
          });
        let on = inputAtPress + 1;
        if (((initialModeFilterRef.current = on), He(on), showSearchHint(inputAtPress, "end")))
          po.current = on;
        if (on >= 2 && !Xo && !At.current) ((At.current = !0), onHistoryUp());
      };
      if (Xo || (inputAtPress < historyCache.current.length && historyIndexRef.current === Mn)) {
        Sn();
        return;
      }
      ao.current = !0;
      let $n = ++co.current;
      (async () => {
        try {
          let on = await Wo($n, pastedContentsAtPress, () => initialModeFilterRef.current);
          if (on === "cancelled" || on === "restarted") return;
          if (on === "adopted") inputAtPress = initialModeFilterRef.current;
          if (h.value !== kn) return;
          Sn();
        } catch {
        } finally {
          if (co.current === $n) ao.current = !1;
        }
      })();
    }, [h, D, Io, Wo, showSearchHint, onHistoryUp, storageV5]),
    Cn = ce(() => {
      let modeFilter = ao.current;
      if (modeFilter) (co.current++, (ao.current = !1));
      let kn = initialModeFilterRef.current;
      if (kn > 0 && kn === po.current) {
        let { value: bn, pastedContents: pastedContents, mode: mode } = h.getSnapshot();
        currentModeRef.current.set(kn - 1, { display: bn, pastedContents: pastedContents, mode: mode });
      }
      let Fn = () => {
        let currentIndex = initialModeFilterRef.current;
        if (currentIndex > 1) {
          if (
            ((initialModeFilterRef.current = currentIndex - 1),
            He(currentIndex - 1),
            showSearchHint(currentIndex - 2, "start"))
          )
            po.current = currentIndex - 1;
        } else if (currentIndex === 1) ((initialModeFilterRef.current = 0), He(0), Ho(), (po.current = 0));
      };
      if (kn > 0 && !D && historyIndexRef.current !== Aer()) {
        let bn = ++co.current,
          Go = h.value;
        return (
          Wo(bn, pastedContentsRef.current, () => Math.max(initialModeFilterRef.current - 2, 0)).then(
            (hn) => {
              if ((hn === "adopted" || hn === "unchanged") && h.value === Go) Fn();
            },
            () => {},
          ),
          !1
        );
      }
      return (Fn(), kn <= 0 && !modeFilter);
    }, [h, D, Wo, Ho, showSearchHint]),
    resetHistory = ce(() => {
      ((kt.current = null),
        He(0),
        ze(null),
        hasShownSearchHintRef.current++,
        (rt.current = !1),
        (initialModeFilterRef.current = 0),
        (po.current = 0),
        co.current++,
        (ao.current = !1),
        (currentInputRef.current = null),
        (pastedContentsRef.current = void 0),
        removeNotification("search-history-hint"),
        (historyCache.current = []),
        (historyCacheModeFilter.current = void 0),
        currentModeRef.current.clear());
    }, [removeNotification]),
    dismissSearchHint = ce(() => {
      removeNotification("search-history-hint");
    }, [removeNotification]);
  return {
    historyIndex: Be,
    historyTotal: We,
    historyEdited: Be > 0 && value !== currentInputRef.current,
    onHistoryUp: mn,
    onHistoryDown: Cn,
    resetHistory: resetHistory,
    dismissSearchHint: dismissSearchHint,
  };
}

export { useArrowKeyHistory };
