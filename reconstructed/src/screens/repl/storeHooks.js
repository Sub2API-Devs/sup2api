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
import { bM } from "../../state/promptInputStore.js";
import { useSession } from "../../context/session.js";
import { yt } from "../../../vendor/react/cjs/react.production.js";
import { uiSignals } from "../../state/uiSignals.js";
import { TMUX_SESSION } from "../../utils/terminalPanel.js";
import { O_o, ZPs, bUn, topAutoDialog, topUserDialog, isDialogHiddenWhile } from "../../state/dialogQueue.js";

//@ chunk-18hwfzwa.js:328747-328777 placement
function op() {
  return bM(useSession());
}
//@ chunk-18hwfzwa.js:328777-328848 placement
function ZD() {
  let h = op();
  return yt(h.subscribe, () => h.getState().value);
}
//@ chunk-18hwfzwa.js:328848-328873 placement
var nBt = "[longer input]";
/**
 * 订阅草稿值（超过 1 个字符时返回固定占位，减少重渲染）。
 */
//@ chunk-18hwfzwa.js:328873-328978 placement
function useShortDraftValue() {
  let h = op();
  return yt(h.subscribe, () => {
    let { value: x } = h.getState();
    return x.length <= 1 ? x : nBt;
  });
}
//@ chunk-18hwfzwa.js:328978-329051 placement
function yv() {
  let h = op();
  return yt(h.subscribe, () => h.getState().vimMode);
}
//@ chunk-18hwfzwa.js:329051-329123 placement
function Aw() {
  let h = op();
  return yt(h.subscribe, () => h.getState().active);
}
//@ chunk-18hwfzwa.js:329123-329203 placement
function vae() {
  let h = op();
  return yt(h.subscribe, () => h.getState().launchWarning);
}
//@ chunk-18hwfzwa.js:329203-329283 placement
function jH(h) {
  uiSignals.blockingToolProgress.setState((x) => (x.active === h ? x : { active: h }));
}
//@ chunk-18hwfzwa.js:329283-329347 placement
function QUe() {
  return uiSignals.blockingToolProgress.getState().active;
}
//@ chunk-18hwfzwa.js:329347-329411 placement
function rBt() {
  return yt(uiSignals.blockingToolProgress.subscribe, QUe);
}
//@ chunk-18hwfzwa.js:329411-329496 placement
function $H(h) {
  uiSignals.dialogHostUnmounted.setState((x) => (x.unmounted === h ? x : { unmounted: h }));
}
//@ chunk-18hwfzwa.js:329496-329562 placement
function YUe() {
  return uiSignals.dialogHostUnmounted.getState().unmounted;
}
//@ chunk-18hwfzwa.js:329562-329625 placement
function JUe() {
  return yt(uiSignals.dialogHostUnmounted.subscribe, YUe);
}
//@ chunk-18hwfzwa.js:329625-329730 placement
function getActiveBottomSurface() {
  let h = rBt(),
    x = Aw(),
    D = TMUX_SESSION(),
    L = useHasDraftText();
  return h ? "progress" : D ? "panel" : L ? "draft" : x ? "typing" : null;
}
/**
 * 草稿区域可见且有非空文本。
 */
//@ chunk-18hwfzwa.js:329787-329889 placement
function useHasDraftText() {
  let h = O_o("draft"),
    x = op();
  return yt(x.subscribe, () => h && x.getState().value.trim() !== "");
}
//@ chunk-18hwfzwa.js:329999-330066 placement
function tO() {
  let h = ZPs(),
    x = getActiveBottomSurface(),
    D = JUe();
  return x !== null || D ? null : h;
}
//@ chunk-18hwfzwa.js:330066-330135 placement
function KH() {
  let h = bUn(),
    x = getActiveBottomSurface(),
    D = JUe();
  return x !== null || D ? void 0 : h;
}
/**
 * 订阅对话框与草稿，计算当前可以自动弹出的对话框种类。
 */
//@ chunk-18hwfzwa.js:330135-330496 placement
function createAutoDialogSelector(h, x) {
  return {
    subscribe(D) {
      let L = [
        h.subscribe(D),
        x.subscribe(D),
        uiSignals.blockingToolProgress.subscribe(D),
        uiSignals.dialogHostUnmounted.subscribe(D),
      ];
      return () => {
        for (let ee of L) ee();
      };
    },
    get() {
      let state = h.getState(),
        L = topAutoDialog(state),
        ke = topUserDialog(state) !== null && isDialogHiddenWhile(L, "panel"),
        state_2 = x.getState(),
        Be = state_2.value.trim() !== "" && isDialogHiddenWhile(L, "draft");
      return QUe() || ke || Be || state_2.active || YUe() ? void 0 : L?.kind;
    },
  };
}

export {
  op,
  Aw,
  useShortDraftValue,
  KH,
  $H,
  jH,
  yv,
  getActiveBottomSurface,
  createAutoDialogSelector,
  vae,
  ZD,
  tO,
};
