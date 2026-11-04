/**
 * screens/repl/storeHooks.ts
 *
 * 2.1.316 新增。REPL 状态存储 hooks。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (18)
 * attribution: placement 18
 */
import { promptInputStoreFor } from "../../state/promptInputStore.js";
import { useSession } from "../../context/session.js";
import { useSyncExternalStore } from "../../../vendor/react/cjs/react.production.js";
import { uiSignals } from "../../state/uiSignals.js";
import { TMUX_SESSION } from "../../utils/terminalPanel.js";
import {
  useTopAutoDialogHidden,
  useTopAutoDialog,
  useTopAutoDialogKind,
  topAutoDialog,
  topUserDialog,
  isDialogHiddenWhile,
} from "../../state/dialogQueue.js";

//@ chunk-18hwfzwa.js:328747-328777 placement
function sessionStore() {
  return promptInputStoreFor(useSession());
}
//@ chunk-18hwfzwa.js:328777-328848 placement
function useStoreValue() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().value);
}
//@ chunk-18hwfzwa.js:328848-328873 placement
/**
 * 草稿值订阅的占位文案 "[longer input]"（超过 1 个字符时复用固定字符串减少重渲染）。
 */
var LONGER_INPUT_PLACEHOLDER = "[longer input]";
//@ chunk-18hwfzwa.js:328873-328978 placement
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
//@ chunk-18hwfzwa.js:328978-329051 placement
function useVimMode() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().vimMode);
}
//@ chunk-18hwfzwa.js:329051-329123 placement
function useActive() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().active);
}
//@ chunk-18hwfzwa.js:329123-329203 placement
function useLaunchWarning() {
  let store = sessionStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().launchWarning);
}
//@ chunk-18hwfzwa.js:329203-329283 placement
function setBlockingToolProgress(pauseAnimation) {
  uiSignals.blockingToolProgress.setState((state) =>
    state.active === pauseAnimation
      ? state
      : {
          active: pauseAnimation,
        },
  );
}
//@ chunk-18hwfzwa.js:329283-329347 placement
function getBlockingToolProgress() {
  return uiSignals.blockingToolProgress.getState().active;
}
//@ chunk-18hwfzwa.js:329347-329411 placement
function useBlockingToolProgress() {
  return useSyncExternalStore(uiSignals.blockingToolProgress.subscribe, getBlockingToolProgress);
}
//@ chunk-18hwfzwa.js:329411-329496 placement
function setDialogHostUnmounted(unmounted) {
  uiSignals.dialogHostUnmounted.setState((state) =>
    state.unmounted === unmounted
      ? state
      : {
          unmounted,
        },
  );
}
//@ chunk-18hwfzwa.js:329496-329562 placement
function isDialogHostUnmounted() {
  return uiSignals.dialogHostUnmounted.getState().unmounted;
}
//@ chunk-18hwfzwa.js:329562-329625 placement
function useDialogHostUnmounted() {
  return useSyncExternalStore(uiSignals.dialogHostUnmounted.subscribe, isDialogHostUnmounted);
}
//@ chunk-18hwfzwa.js:329625-329730 placement
function getActiveBottomSurface() {
  let blockingToolProgress = useBlockingToolProgress();
  let active = useActive();
  let tmux = TMUX_SESSION();
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
//@ chunk-18hwfzwa.js:329787-329889 placement
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
//@ chunk-18hwfzwa.js:329999-330066 placement
function useAutoDialogKind() {
  let topAutoDialog = useTopAutoDialog();
  let activeBottomSurface = getActiveBottomSurface();
  let dialogHostUnmounted = useDialogHostUnmounted();
  return activeBottomSurface !== null || dialogHostUnmounted ? null : topAutoDialog;
}
//@ chunk-18hwfzwa.js:330066-330135 placement
function useAutoDialogKindAlt() {
  let topAutoDialogKind = useTopAutoDialogKind();
  let activeBottomSurface = getActiveBottomSurface();
  let dialogHostUnmounted = useDialogHostUnmounted();
  return activeBottomSurface !== null || dialogHostUnmounted ? undefined : topAutoDialogKind;
}
//@ chunk-18hwfzwa.js:330135-330496 placement
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
  sessionStore,
  useActive,
  useShortDraftValue,
  useAutoDialogKindAlt,
  useVimMode,
  setDialogHostUnmounted,
  setBlockingToolProgress,
  getActiveBottomSurface,
  createAutoDialogSelector,
  useLaunchWarning,
  useStoreValue,
  useAutoDialogKind,
};
