/**
 * state/applySessionSettingsPatch.ts
 *
 * 2.1.316 新增：应用会话设置补丁
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cdj2k0y0.js (1)
 * attribution: placement 1
 */
import { isDeepStrictEqual } from "util";
import { readAutoCompactWindowSetting } from "../services/compact/autoCompactWindow.js";

//@ chunk-cdj2k0y0.js:269-1172 placement
/**
 * 把会话设置补丁写入 AppState：逐项处理 cacheBreakerPhrase、autoCompactWindow、briefTranscript、isBriefOnly、slackTagConnected、fastMode 与 model（同时更新会话主循环模型），值未变化时保持原对象。
 */
function applySessionSettingsPatch(patch, setAppState) {
  setAppState((nextState) => {
    let patchedState = nextState;
    if ("cacheBreakerPhrase" in patch) {
      let cacheBreakerPhrase = patch.cacheBreakerPhrase;
      let value = cacheBreakerPhrase == null ? undefined : String(cacheBreakerPhrase);
      if (patchedState.cacheBreakerPhrase !== value)
        patchedState = {
          ...patchedState,
          cacheBreakerPhrase: value,
        };
    }
    if ("autoCompactWindow" in patch) {
      let autoCompactWindow = patch.autoCompactWindow;
      let value = autoCompactWindow == null ? readAutoCompactWindowSetting() : Number(autoCompactWindow);
      if (!isDeepStrictEqual(patchedState.autoCompactWindow, value))
        patchedState = {
          ...patchedState,
          autoCompactWindow: value,
        };
    }
    if ("briefTranscript" in patch) {
      let value = Boolean(patch.briefTranscript);
      if (patchedState.briefTranscript !== value)
        patchedState = {
          ...patchedState,
          briefTranscript: value,
        };
    }
    if ("isBriefOnly" in patch) {
      let value = Boolean(patch.isBriefOnly);
      if (patchedState.isBriefOnly !== value)
        patchedState = {
          ...patchedState,
          isBriefOnly: value,
        };
    }
    if ("slackTagConnected" in patch) {
      let value = Boolean(patch.slackTagConnected);
      if (patchedState.slackTagConnected !== value)
        patchedState = {
          ...patchedState,
          slackTagConnected: value,
        };
    }
    if ("fastMode" in patch) {
      let value = Boolean(patch.fastMode);
      if (patchedState.fastMode !== value)
        patchedState = {
          ...patchedState,
          fastMode: value,
        };
    }
    if ("model" in patch) {
      let model = patch.model;
      let value = model == null ? null : String(model);
      if (patchedState.mainLoopModelForSession !== value)
        patchedState = {
          ...patchedState,
          mainLoopModelForSession: value,
        };
      if (patchedState.mainLoopModel !== value)
        patchedState = {
          ...patchedState,
          mainLoopModel: value,
        };
    }
    return patchedState;
  });
}
export { applySessionSettingsPatch };
