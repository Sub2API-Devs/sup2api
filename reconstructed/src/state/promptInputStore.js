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
import { deferInit } from "../../runtime/deferred-init.js";

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
var promptInputStoreSlots; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8swanma2.js:419", () => {
  promptInputStoreSlots = new SessionRootSlot(() => createPromptInputStore());
});
//@ chunk-8swanma2.js:441-471 placement
/**
 * 取某会话的输入框状态存储。
 */
function promptInputStoreFor(session) {
  return promptInputStoreSlots.of(session);
}
//@ chunk-8swanma2.js:471-517 placement
/**
 * 取输入框当前文本。
 */
function promptInputValue(session) {
  return promptInputStoreFor(session).getState().value;
}
//@ chunk-8swanma2.js:517-885 placement
/**
 * 设置输入值；清空时记录深链预填文本并清除启动警告。
 */
function setPromptValue(store, value) {
  store.setState((state) => {
    if (state.value === value) return state;
    if (state.value !== "" && value === "") {
      let trimmed = state.value.trim();
      let linkSuppliedTexts =
        state.launchWarning?.type === "deep-link" && state.launchWarning.text === undefined
          ? new Set(state.linkSuppliedTexts).add(trimmed)
          : state.linkSuppliedTexts;
      return {
        ...state,
        value,
        launchWarning: null,
        linkSuppliedTexts,
        submittedLinkPrefill: linkSuppliedTexts.has(trimmed) ? state.value : null,
        cameBack: false,
      };
    }
    return {
      ...state,
      value,
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
function noteLinkSuppliedEdit(session, previousText, nextText) {
  promptInputStoreFor(session).setState((state) => {
    let trimmed = nextText.trim();
    if (
      trimmed === "" ||
      state.linkSuppliedTexts.has(trimmed) ||
      !state.linkSuppliedTexts.has(previousText.trim())
    )
      return state;
    return {
      ...state,
      linkSuppliedTexts: new Set(state.linkSuppliedTexts).add(trimmed),
    };
  });
}
//@ chunk-8swanma2.js:1154-1185 placement
/**
 * 设置草稿暂存内容。
 */
function setPromptStash(sessionOrUndefined, value) {
  setPromptValue(promptInputStoreFor(sessionOrUndefined), value);
}
//@ chunk-8swanma2.js:1185-1249 placement
/**
 * 设置输入框是否激活。
 */
function setPromptActive(store, stashValue) {
  store.setState((state) =>
    state.stash === stashValue
      ? state
      : {
          ...state,
          stash: stashValue,
        },
  );
}
//@ chunk-8swanma2.js:1249-1315 placement
/**
 * 设置某会话输入框的激活状态。
 */
function setPromptActiveFor(store, active) {
  store.setState((state) =>
    state.active === active
      ? state
      : {
          ...state,
          active,
        },
  );
}
//@ chunk-8swanma2.js:1315-1346 placement
/**
 * 设置 Vim 模式。
 */
function setPromptVimMode(session, vimMode) {
  setPromptActiveFor(promptInputStoreFor(session), vimMode);
}
//@ chunk-8swanma2.js:1346-1447 placement
/**
 * 设置“回到输入框”标记（有内容时）。
 */
function setCameBack(store, cameBack) {
  store.setState((state) => {
    let nextCameBack = cameBack && state.value !== "";
    return state.cameBack === nextCameBack
      ? state
      : {
          ...state,
          cameBack: nextCameBack,
        };
  });
}
//@ chunk-8swanma2.js:1447-1519 placement
/**
 * 设置某会话的启动警告。
 */
function setLaunchWarningFor(session, vimMode) {
  promptInputStoreFor(session).setState((state) =>
    state.vimMode === vimMode
      ? state
      : {
          ...state,
          vimMode,
        },
  );
}
//@ chunk-8swanma2.js:1519-1899 placement
/**
 * 设置启动警告（深链时记录预填文本）。
 */
function setLaunchWarning(store, warning) {
  store.setState((state) => {
    let linkText = warning.type === "deep-link" ? warning.text?.trim() : undefined;
    let linkSuppliedTexts =
      linkText === undefined || state.linkSuppliedTexts.has(linkText)
        ? state.linkSuppliedTexts
        : new Set(state.linkSuppliedTexts).add(linkText);
    let nextWarning =
      state.launchWarning?.type === warning.type &&
      state.launchWarning.prefillLength === warning.prefillLength
        ? state.launchWarning
        : warning;
    return nextWarning === state.launchWarning && linkSuppliedTexts === state.linkSuppliedTexts
      ? state
      : {
          ...state,
          launchWarning: nextWarning,
          linkSuppliedTexts,
        };
  });
}
//@ chunk-8swanma2.js:1899-1930 placement
/**
 * 设置某会话的启动警告（会话版入口）。
 */
function setPromptLaunchWarning(session, warning) {
  setLaunchWarning(promptInputStoreFor(session), warning);
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
