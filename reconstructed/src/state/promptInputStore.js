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

//@ chunk-8swanma2.js:263-419 placement
/**
 * 输入框状态存储的初始值。
 */
function createPromptInputStore() {
  return createStore({
    value: "",
    active: false,
    launchWarning: null,
    linkSuppliedTexts: new Set(),
    submittedLinkPrefill: null,
    vimMode: "INSERT",
    stash: null,
    cameBack: false,
  });
}
//@ chunk-8swanma2.js:419-441 placement
/**
 * 按会话保存的输入框状态存储容器。
 */
var promptInputStoreSlots = new SessionRootSlot(() => createPromptInputStore());
//@ chunk-8swanma2.js:441-471 placement
/**
 * 取某会话的输入框状态存储。
 */
function promptInputStoreFor(n) {
  return promptInputStoreSlots.of(n);
}
//@ chunk-8swanma2.js:471-517 placement
/**
 * 取输入框当前文本。
 */
function promptInputValue(n) {
  return promptInputStoreFor(n).getState().value;
}
//@ chunk-8swanma2.js:517-885 placement
/**
 * 设置输入值；清空时记录深链预填文本并清除启动警告。
 */
function setPromptValue(n, e) {
  n.setState((t) => {
    if (t.value === e) return t;
    if (t.value !== "" && e === "") {
      let trimmed = t.value.trim();
      let r =
        t.launchWarning?.type === "deep-link" && t.launchWarning.text === undefined
          ? new Set(t.linkSuppliedTexts).add(trimmed)
          : t.linkSuppliedTexts;
      return {
        ...t,
        value: e,
        launchWarning: null,
        linkSuppliedTexts: r,
        submittedLinkPrefill: r.has(trimmed) ? t.value : null,
        cameBack: false,
      };
    }
    return {
      ...t,
      value: e,
    };
  });
}
//@ chunk-8swanma2.js:885-946 placement
/**
 * 设置某会话的输入值。
 */
function setPromptValueFor(sessionOrUndefined) {
  return promptInputStoreFor(sessionOrUndefined).getState().submittedLinkPrefill;
}
//@ chunk-8swanma2.js:946-1154 placement
/**
 * 用户编辑由深链提供的文本后仍记为深链文本。
 */
function noteLinkSuppliedEdit(session, e, t) {
  promptInputStoreFor(session).setState((o) => {
    let trimmed = t.trim();
    if (trimmed === "" || o.linkSuppliedTexts.has(trimmed) || !o.linkSuppliedTexts.has(e.trim())) return o;
    return {
      ...o,
      linkSuppliedTexts: new Set(o.linkSuppliedTexts).add(trimmed),
    };
  });
}
//@ chunk-8swanma2.js:1154-1185 placement
/**
 * 设置草稿暂存内容。
 */
function setPromptStash(sessionOrUndefined, e) {
  setPromptValue(promptInputStoreFor(sessionOrUndefined), e);
}
//@ chunk-8swanma2.js:1185-1249 placement
/**
 * 设置输入框是否激活。
 */
function setPromptActive(n, e) {
  n.setState((t) =>
    t.stash === e
      ? t
      : {
          ...t,
          stash: e,
        },
  );
}
//@ chunk-8swanma2.js:1249-1315 placement
/**
 * 设置某会话输入框的激活状态。
 */
function setPromptActiveFor(n, e) {
  n.setState((t) =>
    t.active === e
      ? t
      : {
          ...t,
          active: e,
        },
  );
}
//@ chunk-8swanma2.js:1315-1346 placement
/**
 * 设置 Vim 模式。
 */
function setPromptVimMode(session, e) {
  setPromptActiveFor(promptInputStoreFor(session), e);
}
//@ chunk-8swanma2.js:1346-1447 placement
/**
 * 设置“回到输入框”标记（有内容时）。
 */
function setCameBack(n, cameBack) {
  n.setState((t) => {
    let o = cameBack && t.value !== "";
    return t.cameBack === o
      ? t
      : {
          ...t,
          cameBack: o,
        };
  });
}
//@ chunk-8swanma2.js:1447-1519 placement
/**
 * 设置某会话的启动警告。
 */
function setLaunchWarningFor(session, e) {
  promptInputStoreFor(session).setState((t) =>
    t.vimMode === e
      ? t
      : {
          ...t,
          vimMode: e,
        },
  );
}
//@ chunk-8swanma2.js:1519-1899 placement
/**
 * 设置启动警告（深链时记录预填文本）。
 */
function setLaunchWarning(n, launchWarning) {
  n.setState((t) => {
    let o = launchWarning.type === "deep-link" ? launchWarning.text?.trim() : undefined;
    let r =
      o === undefined || t.linkSuppliedTexts.has(o)
        ? t.linkSuppliedTexts
        : new Set(t.linkSuppliedTexts).add(o);
    let i =
      t.launchWarning?.type === launchWarning.type &&
      t.launchWarning.prefillLength === launchWarning.prefillLength
        ? t.launchWarning
        : launchWarning;
    return i === t.launchWarning && r === t.linkSuppliedTexts
      ? t
      : {
          ...t,
          launchWarning: i,
          linkSuppliedTexts: r,
        };
  });
}
//@ chunk-8swanma2.js:1899-1930 placement
/**
 * 设置某会话的启动警告（会话版入口）。
 */
function setPromptLaunchWarning(n, e) {
  setLaunchWarning(promptInputStoreFor(n), e);
}
export {
  setPromptLaunchWarning,
  setLaunchWarningFor,
  promptInputStoreFor,
  noteLinkSuppliedEdit,
  setPromptValue,
  promptInputValue,
  setCameBack,
  setPromptActiveFor,
  setPromptActive,
  setLaunchWarning,
  setPromptVimMode,
  setPromptStash,
  setPromptValueFor,
};
