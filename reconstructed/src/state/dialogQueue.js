/**
 * state/dialogQueue.ts
 *
 * 2.1.316 新增：创建对话框队列存储（排队、插入顺序、隐藏条件、事件）；按询问顺序插入对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1m6hq5zz.js (20)
 * attribution: placement 20
 */
import { init_react_production, qt, Se, yt } from "../../vendor/react/cjs/react.production.js";
import { createStore } from "./store.js";
import { endAnnouncementHold } from "../utils/accessibility/screenReader.js";
import { createSignal } from "../utils/signal.js";
import { CountedAskQueue } from "../utils/countedAsk.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";

//@ chunk-1m6hq5zz.js:417-421 placement
init_react_production();
//@ chunk-1m6hq5zz.js:421-486 placement
/**
 * 最上层的非用户唤起对话框。
 */
function topAutoDialog(o) {
  return o.open.findLast((e) => !e.userInvoked) ?? null;
}
//@ chunk-1m6hq5zz.js:486-556 placement
/**
 * 最上层的用户唤起对话框。
 */
function topUserDialog(state) {
  return state.open.findLast((e) => e.userInvoked === true) ?? null;
}
//@ chunk-1m6hq5zz.js:556-610 placement
/**
 * 队列里是否有该类型的打开对话框。
 */
function hasOpenDialogOfKind(state, kind) {
  return state.open.some((s) => s.kind === kind);
}
//@ chunk-1m6hq5zz.js:610-649 placement
/**
 * 是否有打开中的对话框。
 */
function hasOpenDialogs(state) {
  return state.open.length > 0;
}
//@ chunk-1m6hq5zz.js:649-2296 placement
/**
 * 创建对话框队列存储（排队、插入顺序、隐藏条件、事件）。
 */
function createDialogStore(inputClock = () => Date.now()) {
  let store = createStore({
    open: [],
  });
  let s = [topAutoDialog(store.getState()), topUserDialog(store.getState())];
  store.subscribe(() => {
    let t = [topAutoDialog(store.getState()), topUserDialog(store.getState())];
    if (t.some((n, a) => n !== null && n !== s[a])) endAnnouncementHold();
    s = t;
  });
  let signal = createSignal();
  let d = new CountedAskQueue();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let i = new Set();
  let g = (t, n) => `${t}:${n}`;
  let p = (t) => {
    for (let n of i) if (n.startsWith(`${t}:`)) i.delete(n);
  };
  let r = (t) => {
    let { removed, closedBlockingTopBare } = closeDialog(store, t);
    if (!removed) return false;
    if (closedBlockingTopBare) NEGATIVE_INFINITY = Date.now();
    p(t);
    return true;
  };
  let u = {
    getState: store.getState,
    subscribe: store.subscribe,
    onClosed: signal.subscribe,
    askTally: d,
    open(t) {
      if (t.countedAsk !== undefined) d.join(t.countedAsk);
      store.setState((n) => {
        let a = t.place === "queue" ? insertDialog(n.open, t) : undefined;
        if (a !== undefined)
          return {
            open: [...n.open.slice(0, a), t, ...n.open.slice(a)],
          };
        let f = topAutoDialog(n);
        let k = f?.holdsTop === true && sameUserInvoked(f, t) && t.succeeds !== true;
        if ((t.place === "under" || k) && n.open.some((S) => S.userInvoked !== true))
          return {
            open: [t, ...n.open],
          };
        let D =
          n.open.some((S) => sameUserInvoked(S, t)) ||
          (t.userInvoked !== true && n.open.some((S) => S.userInvoked === true));
        let m = t.userInvoked !== true && isWithinRecentInput(inputClock, NEGATIVE_INFINITY);
        let y =
          D || m
            ? {
                ...t,
                shownAt: Date.now(),
              }
            : t;
        return {
          open: [...n.open, y],
        };
      });
    },
    update(t, payload) {
      store.setState((a) => {
        let index = a.open.findIndex((D) => D.id === t);
        if (index === -1) return a;
        let sliced = a.open.slice();
        sliced[index] = {
          ...a.open[index],
          payload,
          shownAt: Date.now(),
        };
        return {
          open: sliced,
        };
      });
    },
    answer(t, result) {
      store
        .getState()
        .open.find((a) => a.id === t)
        ?.countedAsk?.settle();
      if (!r(t)) return;
      signal.emit({
        id: t,
        type: "answered",
        result,
      });
    },
    dismiss(t) {
      if (!r(t)) return;
      signal.emit({
        id: t,
        type: "dismissed",
      });
    },
    firstReveal(t, n) {
      if (!store.getState().open.some((f) => f.id === t)) return false;
      let a = g(t, n);
      if (i.has(a)) return false;
      i.add(a);
      return true;
    },
    hasRevealed(t, n) {
      return i.has(g(t, n));
    },
    dismissKind(t) {
      for (let n of store.getState().open) if (n.kind === t) u.dismiss(n.id);
    },
  };
  return u;
}
//@ chunk-1m6hq5zz.js:2296-2669 placement
/**
 * 关闭对话框并决定是否恢复下一个。
 */
function closeDialog(store, e) {
  let removed = false;
  let closedBlockingTopBare = false;
  store.setState((d) => {
    let found = d.open.find((u) => u.id === e);
    if (!found) return d;
    removed = true;
    let filtered = d.open.filter((u) => u !== found);
    let filtered_2 = d.open.filter((u) => sameUserInvoked(u, found));
    let p = filtered_2.at(-1) === found;
    let r = filtered_2.at(-2);
    closedBlockingTopBare = p && !r && found.userInvoked !== true;
    if (!p || !r)
      return {
        open: filtered,
      };
    return {
      open: filtered.map((u) =>
        u === r
          ? {
              ...r,
              shownAt: Date.now(),
              revealSeq: (r.revealSeq ?? 0) + 1,
            }
          : u,
      ),
    };
  });
  return {
    removed,
    closedBlockingTopBare,
  };
}
//@ chunk-1m6hq5zz.js:2669-3252 placement
/**
 * 按询问顺序插入对话框。
 */
function insertDialog(open, e) {
  let s = e.askOrder ?? Number.POSITIVE_INFINITY;
  let index = open.findIndex((i) => i.place !== undefined && i.askOrder !== undefined && i.askOrder <= s);
  if (index === -1) {
    let lastIndex = open.findLastIndex((r) => r.place === "queue" && r.askOrder !== undefined);
    let lastIndex_2 = open.findLastIndex((r) => r.place !== undefined && r.askOrder !== undefined);
    let any = open
      .slice(lastIndex_2 + 1)
      .some((r) => r.askOrder === undefined && r.holdsTop !== true && r.userInvoked !== true);
    index =
      lastIndex !== -1 && !any
        ? lastIndex_2 + 1
        : open.findIndex((r) => r.place === undefined && r.askOrder !== undefined);
  }
  if (index === -1) return;
  let index_2 = open.findIndex((i) => i.place === undefined && i.askOrder !== undefined);
  if (index_2 !== -1 && index_2 < index) index = index_2;
  return open.slice(index).some((i) => i.userInvoked !== true) ? index : undefined;
}
//@ chunk-1m6hq5zz.js:3252-3317 placement
/**
 * 两个对话框的 userInvoked 标记是否相同。
 */
function sameUserInvoked(o, e) {
  return (o.userInvoked === true) === (e.userInvoked === true);
}
//@ chunk-1m6hq5zz.js:3317-3333 placement
/**
 * 对话框存储的 React 上下文。
 */
var DialogStoreContext = qt(null);
//@ chunk-1m6hq5zz.js:3333-3506 placement
/**
 * 取对话框存储（必须在 Provider 内）。
 */
function useDialogStore() {
  let o = Se(DialogStoreContext);
  if (!o)
    throw ReferenceError(
      "useDialogStore cannot be called outside of a DialogStoreContext provider (mounted by <AppStateProvider />)",
    );
  return o;
}
//@ chunk-1m6hq5zz.js:3506-3583 placement
/**
 * 是否有打开的对话框。
 */
function useHasOpenDialog() {
  let dialogStore = useDialogStore();
  let e = () => hasOpenDialogs(dialogStore.getState());
  return yt(dialogStore.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3583-3665 placement
/**
 * 是否有自动对话框。
 */
function useHasAutoDialog() {
  let dialogStore = useDialogStore();
  let e = () => topAutoDialog(dialogStore.getState()) !== null;
  return yt(dialogStore.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3665-3744 placement
/**
 * 是否打开了某种对话框。
 */
function useDialogOfKind(kind) {
  let dialogStore = useDialogStore();
  let s = () => hasOpenDialogOfKind(dialogStore.getState(), kind);
  return yt(dialogStore.subscribe, s, s);
}
//@ chunk-1m6hq5zz.js:3744-3821 placement
/**
 * 最上层的用户对话框。
 */
function useTopUserDialog() {
  let dialogStore = useDialogStore();
  let e = () => topUserDialog(dialogStore.getState());
  return yt(dialogStore.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3821-3897 placement
/**
 * 订阅当前最上层的自动对话框。
 */
function useTopAutoDialog() {
  let dialogStore = useDialogStore();
  let e = () => topAutoDialog(dialogStore.getState());
  return yt(dialogStore.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3897-3981 placement
/**
 * 订阅「最上层自动对话框在给定状态下是否被隐藏」。
 */
function useTopAutoDialogHidden(o) {
  let dialogStore = useDialogStore();
  let s = () => isDialogHiddenWhile(topAutoDialog(dialogStore.getState()), o);
  return yt(dialogStore.subscribe, s, s);
}
//@ chunk-1m6hq5zz.js:3981-4037 placement
/**
 * 对话框在某状态下是否隐藏。
 */
function isDialogHiddenWhile(o, e) {
  return o?.hideWhile?.includes(e) === true;
}
//@ chunk-1m6hq5zz.js:4037-4119 placement
/**
 * 订阅最上层自动对话框的种类。
 */
function useTopAutoDialogKind() {
  let dialogStore = useDialogStore();
  let e = () => topAutoDialog(dialogStore.getState())?.kind;
  return yt(dialogStore.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:4119-4194 placement
/**
 * 订阅对话框存储的选择器。
 */
function useDialogSelector(o) {
  let dialogStore = useDialogStore();
  let s = () => o(dialogStore.getState());
  return yt(dialogStore.subscribe, s, s);
}
export {
  useDialogOfKind,
  useDialogStore,
  useHasOpenDialog,
  hasOpenDialogs,
  useHasAutoDialog,
  useDialogSelector,
  topAutoDialog,
  useTopAutoDialogKind,
  useTopAutoDialogHidden,
  useTopAutoDialog,
  topUserDialog,
  isDialogHiddenWhile,
  useTopUserDialog,
  hasOpenDialogOfKind,
  DialogStoreContext,
  createDialogStore,
};
