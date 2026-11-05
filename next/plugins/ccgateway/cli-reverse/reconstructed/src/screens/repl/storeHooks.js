/**
 * screens/repl/storeHooks.ts
 *
 * 2.1.316 新增。REPL 状态存储 hooks。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (12), chunk-hnxhr3bs.js (7)
 * attribution: placement 18, layout 1
 */
import { promptInputStoreFor } from "../../state/promptInputStore.js";
import { useSession } from "../../context/session.js";
import { useSyncExternalStore } from "../../../vendor/react/cjs/react.production.js";
import { uiSignals } from "../../state/uiSignals.js";
import {
  useTopAutoDialogHidden,
  useTopUserDialog,
  useTopAutoDialog,
  useTopAutoDialogKind,
  topAutoDialog,
  topUserDialog,
  isDialogHiddenWhile,
} from "../../state/dialogQueue.js";

//@ chunk-hnxhr3bs.js:94177-94207 placement
function sessionStore() {
  return promptInputStoreFor(useSession());
}
//@ chunk-hnxhr3bs.js:94207-94279 placement
function useStoreValue() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().value);
}
//@ chunk-hnxhr3bs.js:94279-94303 placement
/**
 * 草稿值订阅的占位文案 "[longer input]"（超过 1 个字符时复用固定字符串减少重渲染）。
 */
var LONGER_INPUT_PLACEHOLDER = "[longer input]";
//@ chunk-hnxhr3bs.js:94303-94408 placement
/**
 * 订阅草稿值（超过 1 个字符时返回固定占位，减少重渲染）。
 */
function useShortDraftValue() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => {
    let { value } = store.getState();
    return value.length <= 1 ? value : LONGER_INPUT_PLACEHOLDER;
  });
}
//@ chunk-hnxhr3bs.js:94408-94482 placement
function useVimMode() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().vimMode);
}
//@ chunk-hnxhr3bs.js:94482-94555 placement
function useActive() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().active);
}
//@ chunk-hnxhr3bs.js:94555-94635 placement
function useLaunchWarning() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().launchWarning);
}
//@ chunk-czq1j3j2.js:368227-368307 placement
function setBlockingToolProgress(pauseAnimation) {
  uiSignals.blockingToolProgress.setState((state) =>
    state.active === pauseAnimation
      ? state
      : {
          active: pauseAnimation,
        },
  );
}
//@ chunk-czq1j3j2.js:368307-368371 placement
function getBlockingToolProgress() {
  return uiSignals.blockingToolProgress.getState().active;
}
//@ chunk-czq1j3j2.js:368371-368435 placement
function useBlockingToolProgress() {
  return useSyncExternalStore(uiSignals.blockingToolProgress.subscribe, getBlockingToolProgress);
}
//@ chunk-czq1j3j2.js:368435-368520 placement
function setDialogHostUnmounted(unmounted) {
  uiSignals.dialogHostUnmounted.setState((state) =>
    state.unmounted === unmounted
      ? state
      : {
          unmounted,
        },
  );
}
//@ chunk-czq1j3j2.js:368520-368586 placement
function isDialogHostUnmounted() {
  return uiSignals.dialogHostUnmounted.getState().unmounted;
}
//@ chunk-czq1j3j2.js:368586-368649 placement
function useDialogHostUnmounted() {
  return useSyncExternalStore(uiSignals.dialogHostUnmounted.subscribe, isDialogHostUnmounted);
}
//@ chunk-czq1j3j2.js:368649-368755 placement
function getActiveBottomSurface() {
  let blockingToolProgress = useBlockingToolProgress();
  let active = useActive();
  let tmux = isPanelObscured();
  let hasDraftText = useHasDraftText();
  return blockingToolProgress
    ? "progress"
    : tmux
      ? "panel"
      : hasDraftText
        ? "draft"
        : active
          ? "typing"
          : null;
}
//@ chunk-czq1j3j2.js:368755-368812 layout
function isPanelObscured() {
  let topAutoDialogHidden = useTopAutoDialogHidden("panel");
  return useTopUserDialog() !== null && topAutoDialogHidden;
}
//@ chunk-czq1j3j2.js:368812-368914 placement
/**
 * 草稿区域可见且有非空文本。
 */
function useHasDraftText() {
  let topAutoDialogHidden = useTopAutoDialogHidden("draft");
  let store = sessionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => topAutoDialogHidden && store.getState().value.trim() !== "",
  );
}
//@ chunk-czq1j3j2.js:369024-369091 placement
function useAutoDialogKind() {
  let topAutoDialog = useTopAutoDialog();
  let activeBottomSurface = getActiveBottomSurface();
  let dialogHostUnmounted = useDialogHostUnmounted();
  return activeBottomSurface !== null || dialogHostUnmounted ? null : topAutoDialog;
}
//@ chunk-czq1j3j2.js:369091-369160 placement
function useAutoDialogKindAlt() {
  let topAutoDialogKind = useTopAutoDialogKind();
  let activeBottomSurface = getActiveBottomSurface();
  let dialogHostUnmounted = useDialogHostUnmounted();
  return activeBottomSurface !== null || dialogHostUnmounted ? undefined : topAutoDialogKind;
}
//@ chunk-czq1j3j2.js:369160-369521 placement
/**
 * 订阅对话框与草稿，计算当前可以自动弹出的对话框种类。
 */
function createAutoDialogSelector(dialogStore, store) {
  return {
    subscribe(listener) {
      let unsubscribers = [
        dialogStore.subscribe(listener),
        store.subscribe(listener),
        uiSignals.blockingToolProgress.subscribe(listener),
        uiSignals.dialogHostUnmounted.subscribe(listener),
      ];
      return () => {
        for (let unsubscribe of unsubscribers) unsubscribe();
      };
    },
    get() {
      let state = dialogStore.getState();
      let autoDialog = topAutoDialog(state);
      let panelHidden = topUserDialog(state) !== null && isDialogHiddenWhile(autoDialog, "panel");
      let state_2 = store.getState();
      let draftHidden = state_2.value.trim() !== "" && isDialogHiddenWhile(autoDialog, "draft");
      return getBlockingToolProgress() ||
        panelHidden ||
        draftHidden ||
        state_2.active ||
        isDialogHostUnmounted()
        ? undefined
        : autoDialog?.kind;
    },
  };
}
export {
  getActiveBottomSurface,
  sessionStore,
  useShortDraftValue,
  useAutoDialogKindAlt,
  useVimMode,
  setDialogHostUnmounted,
  setBlockingToolProgress,
  useActive,
  createAutoDialogSelector,
  useLaunchWarning,
  useStoreValue,
  useAutoDialogKind,
};
