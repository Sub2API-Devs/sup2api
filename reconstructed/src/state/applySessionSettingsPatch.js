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
  setAppState((r) => {
    let o = r;
    if ("cacheBreakerPhrase" in patch) {
      let cacheBreakerPhrase = patch.cacheBreakerPhrase;
      let n = cacheBreakerPhrase == null ? undefined : String(cacheBreakerPhrase);
      if (o.cacheBreakerPhrase !== n)
        o = {
          ...o,
          cacheBreakerPhrase: n,
        };
    }
    if ("autoCompactWindow" in patch) {
      let autoCompactWindow = patch.autoCompactWindow;
      let n = autoCompactWindow == null ? readAutoCompactWindowSetting() : Number(autoCompactWindow);
      if (!isDeepStrictEqual(o.autoCompactWindow, n))
        o = {
          ...o,
          autoCompactWindow: n,
        };
    }
    if ("briefTranscript" in patch) {
      let e = Boolean(patch.briefTranscript);
      if (o.briefTranscript !== e)
        o = {
          ...o,
          briefTranscript: e,
        };
    }
    if ("isBriefOnly" in patch) {
      let e = Boolean(patch.isBriefOnly);
      if (o.isBriefOnly !== e)
        o = {
          ...o,
          isBriefOnly: e,
        };
    }
    if ("slackTagConnected" in patch) {
      let e = Boolean(patch.slackTagConnected);
      if (o.slackTagConnected !== e)
        o = {
          ...o,
          slackTagConnected: e,
        };
    }
    if ("fastMode" in patch) {
      let e = Boolean(patch.fastMode);
      if (o.fastMode !== e)
        o = {
          ...o,
          fastMode: e,
        };
    }
    if ("model" in patch) {
      let model = patch.model;
      let n = model == null ? null : String(model);
      if (o.mainLoopModelForSession !== n)
        o = {
          ...o,
          mainLoopModelForSession: n,
        };
      if (o.mainLoopModel !== n)
        o = {
          ...o,
          mainLoopModel: n,
        };
    }
    return o;
  });
}
export { applySessionSettingsPatch };
