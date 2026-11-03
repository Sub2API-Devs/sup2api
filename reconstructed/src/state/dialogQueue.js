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
import { j, qt, Se, yt } from "../../vendor/react/cjs/react.production.js";
import { createStore } from "./store.js";
import { endAnnouncementHold } from "../utils/accessibility/screenReader.js";
import { createSignal } from "../utils/signal.js";
import { CountedAskQueue } from "../utils/countedAsk.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";

//@ chunk-1m6hq5zz.js:417-421 placement
j();
/**
 * 最上层的非用户唤起对话框。
 */
//@ chunk-1m6hq5zz.js:421-486 placement
function topAutoDialog(o) {
  return o.open.findLast((e) => !e.userInvoked) ?? null;
}
/**
 * 最上层的用户唤起对话框。
 */
//@ chunk-1m6hq5zz.js:486-556 placement
function topUserDialog(o) {
  return o.open.findLast((e) => e.userInvoked === !0) ?? null;
}
//@ chunk-1m6hq5zz.js:556-610 placement
function C0t(o, e) {
  return o.open.some((s) => s.kind === e);
}
//@ chunk-1m6hq5zz.js:610-649 placement
function Unn(o) {
  return o.open.length > 0;
}
/**
 * 创建对话框队列存储（排队、插入顺序、隐藏条件、事件）。
 */
//@ chunk-1m6hq5zz.js:649-2296 placement
function createDialogStore(o = () => Date.now()) {
  let e = createStore({ open: [] }),
    s = [topAutoDialog(e.getState()), topUserDialog(e.getState())];
  e.subscribe(() => {
    let t = [topAutoDialog(e.getState()), topUserDialog(e.getState())];
    if (t.some((n, a) => n !== null && n !== s[a])) endAnnouncementHold();
    s = t;
  });
  let l = createSignal(),
    d = new CountedAskQueue(),
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    i = new Set(),
    g = (t, n) => `${t}:${n}`,
    p = (t) => {
      for (let n of i) if (n.startsWith(`${t}:`)) i.delete(n);
    },
    r = (t) => {
      let { removed: removed, closedBlockingTopBare: closedBlockingTopBare } = closeDialog(e, t);
      if (!removed) return !1;
      if (closedBlockingTopBare) NEGATIVE_INFINITY = Date.now();
      return (p(t), !0);
    },
    u = {
      getState: e.getState,
      subscribe: e.subscribe,
      onClosed: l.subscribe,
      askTally: d,
      open(t) {
        if (t.countedAsk !== void 0) d.join(t.countedAsk);
        e.setState((n) => {
          let a = t.place === "queue" ? insertDialog(n.open, t) : void 0;
          if (a !== void 0) return { open: [...n.open.slice(0, a), t, ...n.open.slice(a)] };
          let f = topAutoDialog(n),
            k = f?.holdsTop === !0 && b(f, t) && t.succeeds !== !0;
          if ((t.place === "under" || k) && n.open.some((S) => S.userInvoked !== !0))
            return { open: [t, ...n.open] };
          let D =
              n.open.some((S) => b(S, t)) ||
              (t.userInvoked !== !0 && n.open.some((S) => S.userInvoked === !0)),
            m = t.userInvoked !== !0 && isWithinRecentInput(o, NEGATIVE_INFINITY),
            y = D || m ? { ...t, shownAt: Date.now() } : t;
          return { open: [...n.open, y] };
        });
      },
      update(t, n) {
        e.setState((a) => {
          let index = a.open.findIndex((D) => D.id === t);
          if (index === -1) return a;
          let sliced = a.open.slice();
          return ((sliced[index] = { ...a.open[index], payload: n, shownAt: Date.now() }), { open: sliced });
        });
      },
      answer(t, n) {
        if (
          (e
            .getState()
            .open.find((a) => a.id === t)
            ?.countedAsk?.settle(),
          !r(t))
        )
          return;
        l.emit({ id: t, type: "answered", result: n });
      },
      dismiss(t) {
        if (!r(t)) return;
        l.emit({ id: t, type: "dismissed" });
      },
      firstReveal(t, n) {
        if (!e.getState().open.some((f) => f.id === t)) return !1;
        let a = g(t, n);
        if (i.has(a)) return !1;
        return (i.add(a), !0);
      },
      hasRevealed(t, n) {
        return i.has(g(t, n));
      },
      dismissKind(t) {
        for (let n of e.getState().open) if (n.kind === t) u.dismiss(n.id);
      },
    };
  return u;
}
/**
 * 关闭对话框并决定是否恢复下一个。
 */
//@ chunk-1m6hq5zz.js:2296-2669 placement
function closeDialog(o, e) {
  let s = !1,
    l = !1;
  return (
    o.setState((d) => {
      let found = d.open.find((u) => u.id === e);
      if (!found) return d;
      s = !0;
      let filtered = d.open.filter((u) => u !== found),
        filtered_2 = d.open.filter((u) => b(u, found)),
        p = filtered_2.at(-1) === found,
        at = filtered_2.at(-2);
      if (((l = p && !at && found.userInvoked !== !0), !p || !at)) return { open: filtered };
      return {
        open: filtered.map((u) =>
          u === at ? { ...at, shownAt: Date.now(), revealSeq: (at.revealSeq ?? 0) + 1 } : u,
        ),
      };
    }),
    { removed: s, closedBlockingTopBare: l }
  );
}
/**
 * 按询问顺序插入对话框。
 */
//@ chunk-1m6hq5zz.js:2669-3252 placement
function insertDialog(o, e) {
  let s = e.askOrder ?? Number.POSITIVE_INFINITY,
    index = o.findIndex((i) => i.place !== void 0 && i.askOrder !== void 0 && i.askOrder <= s);
  if (index === -1) {
    let lastIndex = o.findLastIndex((r) => r.place === "queue" && r.askOrder !== void 0),
      lastIndex_2 = o.findLastIndex((r) => r.place !== void 0 && r.askOrder !== void 0),
      any = o
        .slice(lastIndex_2 + 1)
        .some((r) => r.askOrder === void 0 && r.holdsTop !== !0 && r.userInvoked !== !0);
    index =
      lastIndex !== -1 && !any
        ? lastIndex_2 + 1
        : o.findIndex((r) => r.place === void 0 && r.askOrder !== void 0);
  }
  if (index === -1) return;
  let index_2 = o.findIndex((i) => i.place === void 0 && i.askOrder !== void 0);
  if (index_2 !== -1 && index_2 < index) index = index_2;
  return o.slice(index).some((i) => i.userInvoked !== !0) ? index : void 0;
}
//@ chunk-1m6hq5zz.js:3252-3317 placement
function b(o, e) {
  return (o.userInvoked === !0) === (e.userInvoked === !0);
}
/**
 * 对话框存储的 React 上下文。
 */
//@ chunk-1m6hq5zz.js:3317-3333 placement
var DialogStoreContext = qt(null);
/**
 * 取对话框存储（必须在 Provider 内）。
 */
//@ chunk-1m6hq5zz.js:3333-3506 placement
function useDialogStore() {
  let o = Se(DialogStoreContext);
  if (!o)
    throw ReferenceError(
      "useDialogStore cannot be called outside of a DialogStoreContext provider (mounted by <AppStateProvider />)",
    );
  return o;
}
/**
 * 是否有打开的对话框。
 */
//@ chunk-1m6hq5zz.js:3506-3583 placement
function useHasOpenDialog() {
  let o = useDialogStore(),
    e = () => Unn(o.getState());
  return yt(o.subscribe, e, e);
}
/**
 * 是否有自动对话框。
 */
//@ chunk-1m6hq5zz.js:3583-3665 placement
function useHasAutoDialog() {
  let o = useDialogStore(),
    e = () => topAutoDialog(o.getState()) !== null;
  return yt(o.subscribe, e, e);
}
/**
 * 是否打开了某种对话框。
 */
//@ chunk-1m6hq5zz.js:3665-3744 placement
function useDialogOfKind(o) {
  let e = useDialogStore(),
    s = () => C0t(e.getState(), o);
  return yt(e.subscribe, s, s);
}
/**
 * 最上层的用户对话框。
 */
//@ chunk-1m6hq5zz.js:3744-3821 placement
function useTopUserDialog() {
  let o = useDialogStore(),
    e = () => topUserDialog(o.getState());
  return yt(o.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3821-3897 placement
function ZPs() {
  let o = useDialogStore(),
    e = () => topAutoDialog(o.getState());
  return yt(o.subscribe, e, e);
}
//@ chunk-1m6hq5zz.js:3897-3981 placement
function O_o(o) {
  let e = useDialogStore(),
    s = () => isDialogHiddenWhile(topAutoDialog(e.getState()), o);
  return yt(e.subscribe, s, s);
}
/**
 * 对话框在某状态下是否隐藏。
 */
//@ chunk-1m6hq5zz.js:3981-4037 placement
function isDialogHiddenWhile(o, e) {
  return o?.hideWhile?.includes(e) === !0;
}
//@ chunk-1m6hq5zz.js:4037-4119 placement
function bUn() {
  let o = useDialogStore(),
    e = () => topAutoDialog(o.getState())?.kind;
  return yt(o.subscribe, e, e);
}
/**
 * 订阅对话框存储的选择器。
 */
//@ chunk-1m6hq5zz.js:4119-4194 placement
function useDialogSelector(o) {
  let e = useDialogStore(),
    s = () => o(e.getState());
  return yt(e.subscribe, s, s);
}

export {
  useDialogOfKind,
  useDialogStore,
  useHasOpenDialog,
  Unn,
  useHasAutoDialog,
  useDialogSelector,
  topAutoDialog,
  bUn,
  O_o,
  ZPs,
  topUserDialog,
  isDialogHiddenWhile,
  useTopUserDialog,
  C0t,
  DialogStoreContext,
  createDialogStore,
};
