/**
 * state/dialogQueue.ts
 *
 * 2.1.316 新增：创建对话框队列存储（排队、插入顺序、隐藏条件、事件）；按询问顺序插入对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2w2vg54f.js (20)
 * attribution: placement 20
 */
import {
  init_react_production,
  createContext,
  useContext,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { createStore } from "./store.js";
import { endAnnouncementHold } from "../utils/accessibility/screenReader.js";
import { createSignal } from "../utils/signal.js";
import { CountedAskQueue } from "../utils/countedAsk.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2w2vg54f.js:417-421 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2w2vg54f.js:417", () => {
  init_react_production();
});
//@ chunk-2w2vg54f.js:421-486 placement
/**
 * 最上层的非用户唤起对话框。
 */
function topAutoDialog(state) {
  return state.open.findLast((dialog) => !dialog.userInvoked) ?? null;
}
//@ chunk-2w2vg54f.js:486-556 placement
/**
 * 最上层的用户唤起对话框。
 */
function topUserDialog(state) {
  return state.open.findLast((dialog) => dialog.userInvoked === true) ?? null;
}
//@ chunk-2w2vg54f.js:556-610 placement
/**
 * 队列里是否有该类型的打开对话框。
 */
function hasOpenDialogOfKind(state, dialogKind) {
  return state.open.some((dialog) => dialog.kind === dialogKind);
}
//@ chunk-2w2vg54f.js:610-649 placement
/**
 * 是否有打开中的对话框。
 */
function hasOpenDialogs(state) {
  return state.open.length > 0;
}
//@ chunk-2w2vg54f.js:649-2296 placement
/**
 * 创建对话框队列存储（排队、插入顺序、隐藏条件、事件）。
 */
function createDialogStore(inputClock = () => Date.now()) {
  let store = createStore({
    open: [],
  });
  let previousTops = [topAutoDialog(store.getState()), topUserDialog(store.getState())];
  store.subscribe(() => {
    let currentTops = [topAutoDialog(store.getState()), topUserDialog(store.getState())];
    if (currentTops.some((top, index) => top !== null && top !== previousTops[index])) endAnnouncementHold();
    previousTops = currentTops;
  });
  let signal = createSignal();
  let askTally = new CountedAskQueue();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let revealed = new Set();
  let revealKey = (id, revision) => `${id}:${revision}`;
  let clearReveals = (id) => {
    for (let key of revealed) if (key.startsWith(`${id}:`)) revealed.delete(key);
  };
  let removeDialog = (id) => {
    let { removed, closedBlockingTopBare } = closeDialog(store, id);
    if (!removed) return false;
    if (closedBlockingTopBare) NEGATIVE_INFINITY = Date.now();
    clearReveals(id);
    return true;
  };
  let api = {
    getState: store.getState,
    subscribe: store.subscribe,
    onClosed: signal.subscribe,
    askTally,
    open(dialog) {
      if (dialog.countedAsk !== undefined) askTally.join(dialog.countedAsk);
      store.setState((state) => {
        let insertAt = dialog.place === "queue" ? insertDialog(state.open, dialog) : undefined;
        if (insertAt !== undefined)
          return {
            open: [...state.open.slice(0, insertAt), dialog, ...state.open.slice(insertAt)],
          };
        let top = topAutoDialog(state);
        let shouldGoOnTop =
          top?.holdsTop === true && sameUserInvoked(top, dialog) && dialog.succeeds !== true;
        if (
          (dialog.place === "under" || shouldGoOnTop) &&
          state.open.some((openDialog) => openDialog.userInvoked !== true)
        )
          return {
            open: [dialog, ...state.open],
          };
        let hasConflict =
          state.open.some((openDialog) => sameUserInvoked(openDialog, dialog)) ||
          (dialog.userInvoked !== true && state.open.some((openDialog) => openDialog.userInvoked === true));
        let isRecentInput = dialog.userInvoked !== true && isWithinRecentInput(inputClock, NEGATIVE_INFINITY);
        let entry =
          hasConflict || isRecentInput
            ? {
                ...dialog,
                shownAt: Date.now(),
              }
            : dialog;
        return {
          open: [...state.open, entry],
        };
      });
    },
    update(id, payload) {
      store.setState((state) => {
        let index = state.open.findIndex((openDialog) => openDialog.id === id);
        if (index === -1) return state;
        let sliced = state.open.slice();
        sliced[index] = {
          ...state.open[index],
          payload,
          shownAt: Date.now(),
        };
        return {
          open: sliced,
        };
      });
    },
    answer(id, result) {
      store
        .getState()
        .open.find((openDialog) => openDialog.id === id)
        ?.countedAsk?.settle();
      if (!removeDialog(id)) return;
      signal.emit({
        id,
        type: "answered",
        result,
      });
    },
    dismiss(id) {
      if (!removeDialog(id)) return;
      signal.emit({
        id,
        type: "dismissed",
      });
    },
    firstReveal(id, revision) {
      if (!store.getState().open.some((openDialog) => openDialog.id === id)) return false;
      let key = revealKey(id, revision);
      if (revealed.has(key)) return false;
      revealed.add(key);
      return true;
    },
    hasRevealed(id, revision) {
      return revealed.has(revealKey(id, revision));
    },
    dismissKind(kind) {
      for (let openDialog of store.getState().open) if (openDialog.kind === kind) api.dismiss(openDialog.id);
    },
  };
  return api;
}
//@ chunk-2w2vg54f.js:2296-2669 placement
/**
 * 关闭对话框并决定是否恢复下一个。
 */
function closeDialog(store, id) {
  let removed = false;
  let closedBlockingTopBare = false;
  store.setState((state) => {
    let found = state.open.find((openDialog) => openDialog.id === id);
    if (!found) return state;
    removed = true;
    let filtered = state.open.filter((openDialog) => openDialog !== found);
    let filtered_2 = state.open.filter((openDialog) => sameUserInvoked(openDialog, found));
    let isLast = filtered_2.at(-1) === found;
    let previous = filtered_2.at(-2);
    closedBlockingTopBare = isLast && !previous && found.userInvoked !== true;
    if (!isLast || !previous)
      return {
        open: filtered,
      };
    return {
      open: filtered.map((openDialog) =>
        openDialog === previous
          ? {
              ...previous,
              shownAt: Date.now(),
              revealSeq: (previous.revealSeq ?? 0) + 1,
            }
          : openDialog,
      ),
    };
  });
  return {
    removed,
    closedBlockingTopBare,
  };
}
//@ chunk-2w2vg54f.js:2669-3252 placement
/**
 * 按询问顺序插入对话框。
 */
function insertDialog(open, dialog) {
  let askOrder = dialog.askOrder ?? Number.POSITIVE_INFINITY;
  let index = open.findIndex(
    (openDialog) =>
      openDialog.place !== undefined && openDialog.askOrder !== undefined && openDialog.askOrder <= askOrder,
  );
  if (index === -1) {
    let lastIndex = open.findLastIndex(
      (openDialog) => openDialog.place === "queue" && openDialog.askOrder !== undefined,
    );
    let lastIndex_2 = open.findLastIndex(
      (openDialog) => openDialog.place !== undefined && openDialog.askOrder !== undefined,
    );
    let any = open
      .slice(lastIndex_2 + 1)
      .some(
        (openDialog) =>
          openDialog.askOrder === undefined &&
          openDialog.holdsTop !== true &&
          openDialog.userInvoked !== true,
      );
    index =
      lastIndex !== -1 && !any
        ? lastIndex_2 + 1
        : open.findIndex((openDialog) => openDialog.place === undefined && openDialog.askOrder !== undefined);
  }
  if (index === -1) return;
  let index_2 = open.findIndex(
    (openDialog) => openDialog.place === undefined && openDialog.askOrder !== undefined,
  );
  if (index_2 !== -1 && index_2 < index) index = index_2;
  return open.slice(index).some((openDialog) => openDialog.userInvoked !== true) ? index : undefined;
}
//@ chunk-2w2vg54f.js:3252-3317 placement
/**
 * 两个对话框的 userInvoked 标记是否相同。
 */
function sameUserInvoked(left, right) {
  return (left.userInvoked === true) === (right.userInvoked === true);
}
//@ chunk-2w2vg54f.js:3317-3333 placement
/**
 * 对话框存储的 React 上下文。
 */
var DialogStoreContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2w2vg54f.js:3317", () => {
  DialogStoreContext = createContext(null);
});
//@ chunk-2w2vg54f.js:3333-3506 placement
/**
 * 取对话框存储（必须在 Provider 内）。
 */
function useDialogStore() {
  let value = useContext(DialogStoreContext);
  if (!value)
    throw ReferenceError(
      "useDialogStore cannot be called outside of a DialogStoreContext provider (mounted by <AppStateProvider />)",
    );
  return value;
}
//@ chunk-2w2vg54f.js:3506-3583 placement
/**
 * 是否有打开的对话框。
 */
function useHasOpenDialog() {
  let dialogStore = useDialogStore();
  let read = () => hasOpenDialogs(dialogStore.getState());
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-2w2vg54f.js:3583-3665 placement
/**
 * 是否有自动对话框。
 */
function useHasAutoDialog() {
  let dialogStore = useDialogStore();
  let read = () => topAutoDialog(dialogStore.getState()) !== null;
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-2w2vg54f.js:3665-3744 placement
/**
 * 是否打开了某种对话框。
 */
function useDialogOfKind(kind) {
  let dialogStore = useDialogStore();
  let read = () => hasOpenDialogOfKind(dialogStore.getState(), kind);
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-2w2vg54f.js:3744-3821 placement
/**
 * 最上层的用户对话框。
 */
function useTopUserDialog() {
  let dialogStore = useDialogStore();
  let read = () => topUserDialog(dialogStore.getState());
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-2w2vg54f.js:3821-3897 placement
/**
 * 订阅当前最上层的自动对话框。
 */
function useTopAutoDialog() {
  let dialogStore = useDialogStore();
  let readTopDialog = () => topAutoDialog(dialogStore.getState());
  return useSyncExternalStore(dialogStore.subscribe, readTopDialog, readTopDialog);
}
//@ chunk-2w2vg54f.js:3897-3981 placement
/**
 * 订阅「最上层自动对话框在给定状态下是否被隐藏」。
 */
function useTopAutoDialogHidden(hidden) {
  let dialogStore = useDialogStore();
  let readHidden = () => isDialogHiddenWhile(topAutoDialog(dialogStore.getState()), hidden);
  return useSyncExternalStore(dialogStore.subscribe, readHidden, readHidden);
}
//@ chunk-2w2vg54f.js:3981-4037 placement
/**
 * 对话框在某状态下是否隐藏。
 */
function isDialogHiddenWhile(dialog, kind) {
  return dialog?.hideWhile?.includes(kind) === true;
}
//@ chunk-2w2vg54f.js:4037-4119 placement
/**
 * 订阅最上层自动对话框的种类。
 */
function useTopAutoDialogKind() {
  let dialogStore = useDialogStore();
  let readTopKind = () => topAutoDialog(dialogStore.getState())?.kind;
  return useSyncExternalStore(dialogStore.subscribe, readTopKind, readTopKind);
}
//@ chunk-2w2vg54f.js:4119-4194 placement
/**
 * 订阅对话框存储的选择器。
 */
function useDialogSelector(selector) {
  let dialogStore = useDialogStore();
  let readSelected = () => selector(dialogStore.getState());
  return useSyncExternalStore(dialogStore.subscribe, readSelected, readSelected);
}
export {
  useHasAutoDialog,
  useTopUserDialog,
  useDialogOfKind,
  useHasOpenDialog,
  createDialogStore,
  DialogStoreContext,
  useDialogSelector,
  topAutoDialog,
  useDialogStore,
  useTopAutoDialogKind,
  isDialogHiddenWhile,
  useTopAutoDialogHidden,
  useTopAutoDialog,
  topUserDialog,
  hasOpenDialogs,
  hasOpenDialogOfKind,
};
