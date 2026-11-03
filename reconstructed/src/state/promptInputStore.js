/**
 * state/promptInputStore.ts
 *
 * 2.1.316 新增：提示输入存储
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8swanma2.js (15)
 * attribution: placement 15
 */
import { createStore } from "./store.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

/**
 * 输入框状态存储的初始值。
 */
//@ chunk-8swanma2.js:263-419 placement
function createPromptInputStore() {
  return createStore({
    value: "",
    active: !1,
    launchWarning: null,
    linkSuppliedTexts: new Set(),
    submittedLinkPrefill: null,
    vimMode: "INSERT",
    stash: null,
    cameBack: !1,
  });
}
//@ chunk-8swanma2.js:419-441 placement
var a = new SessionRootSlot(() => createPromptInputStore());
//@ chunk-8swanma2.js:441-471 placement
function bM(n) {
  return a.of(n);
}
//@ chunk-8swanma2.js:471-517 placement
function f7e(n) {
  return bM(n).getState().value;
}
/**
 * 设置输入值；清空时记录深链预填文本并清除启动警告。
 */
//@ chunk-8swanma2.js:517-885 placement
function setPromptValue(n, e) {
  n.setState((t) => {
    if (t.value === e) return t;
    if (t.value !== "" && e === "") {
      let trimmed = t.value.trim(),
        r =
          t.launchWarning?.type === "deep-link" && t.launchWarning.text === void 0
            ? new Set(t.linkSuppliedTexts).add(trimmed)
            : t.linkSuppliedTexts;
      return {
        ...t,
        value: e,
        launchWarning: null,
        linkSuppliedTexts: r,
        submittedLinkPrefill: r.has(trimmed) ? t.value : null,
        cameBack: !1,
      };
    }
    return { ...t, value: e };
  });
}
//@ chunk-8swanma2.js:885-946 placement
function $Po(n) {
  return bM(n).getState().submittedLinkPrefill;
}
/**
 * 用户编辑由深链提供的文本后仍记为深链文本。
 */
//@ chunk-8swanma2.js:946-1154 placement
function noteLinkSuppliedEdit(n, e, t) {
  bM(n).setState((o) => {
    let trimmed = t.trim();
    if (trimmed === "" || o.linkSuppliedTexts.has(trimmed) || !o.linkSuppliedTexts.has(e.trim())) return o;
    return { ...o, linkSuppliedTexts: new Set(o.linkSuppliedTexts).add(trimmed) };
  });
}
//@ chunk-8swanma2.js:1154-1185 placement
function M1s(n, e) {
  setPromptValue(bM(n), e);
}
//@ chunk-8swanma2.js:1185-1249 placement
function UPo(n, e) {
  n.setState((t) => (t.stash === e ? t : { ...t, stash: e }));
}
//@ chunk-8swanma2.js:1249-1315 placement
function Z2n(n, e) {
  n.setState((t) => (t.active === e ? t : { ...t, active: e }));
}
//@ chunk-8swanma2.js:1315-1346 placement
function dHr(n, e) {
  Z2n(bM(n), e);
}
/**
 * 设置“回到输入框”标记（有内容时）。
 */
//@ chunk-8swanma2.js:1346-1447 placement
function setCameBack(n, e) {
  n.setState((t) => {
    let o = e && t.value !== "";
    return t.cameBack === o ? t : { ...t, cameBack: o };
  });
}
//@ chunk-8swanma2.js:1447-1519 placement
function van(n, e) {
  bM(n).setState((t) => (t.vimMode === e ? t : { ...t, vimMode: e }));
}
/**
 * 设置启动警告（深链时记录预填文本）。
 */
//@ chunk-8swanma2.js:1519-1899 placement
function setLaunchWarning(n, e) {
  n.setState((t) => {
    let o = e.type === "deep-link" ? e.text?.trim() : void 0,
      r =
        o === void 0 || t.linkSuppliedTexts.has(o)
          ? t.linkSuppliedTexts
          : new Set(t.linkSuppliedTexts).add(o),
      i =
        t.launchWarning?.type === e.type && t.launchWarning.prefillLength === e.prefillLength
          ? t.launchWarning
          : e;
    return i === t.launchWarning && r === t.linkSuppliedTexts
      ? t
      : { ...t, launchWarning: i, linkSuppliedTexts: r };
  });
}
//@ chunk-8swanma2.js:1899-1930 placement
function BPo(n, e) {
  setLaunchWarning(bM(n), e);
}

export {
  BPo,
  bM,
  setPromptValue,
  van,
  f7e,
  setCameBack,
  Z2n,
  UPo,
  setLaunchWarning,
  noteLinkSuppliedEdit,
  dHr,
  M1s,
  $Po,
};
