/**
 * commands/focus/index.ts
 *
 * 2.1.316 新增：/focus 命令对象：切换只显示提示、摘要和回复的专注视图（需全屏渲染器）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { setViewMode, invalidateFocusModeSection } from "../../utils/focusMode.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:2050855-2052746 placement
/**
 * /focus 命令对象（local-jsx）；描述：Toggle focus view: just your prompt, summary, and response。
 */
var focusCommandDefinition = {
  type: "local-jsx",
  name: "focus",
  description: "Toggle focus view: just your prompt, summary, and response",
  immediate: true,
  requires: {
    ink: true,
  },
  terminalOriented: true,
  load: () =>
    Promise.resolve({
      async call(e, n) {
        setViewMode(null);
        if (n.presentation !== "fullscreen") {
          if (getInitialSettings_2().viewMode === "focus") {
            e(
              `Focus view is set by "viewMode": "focus" in settings.json \u2014 remove it there and restart Claude Code to turn it off. ${"Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart."}`,
              {
                display: "system",
              },
            );
            return null;
          }
          if (n.getAppState().briefTranscript || getGlobalConfig().briefTranscript) {
            n.onQueryEvent?.({
              type: "apply_flag_settings",
              settings: {
                briefTranscript: false,
              },
            });
            if (getGlobalConfig().briefTranscript)
              await saveGlobalConfig(
                (w) => ({
                  ...w,
                  briefTranscript: false,
                }),
                n.storageV5,
              );
            invalidateFocusModeSection();
            let S = applyFocusViewToRemote(false);
            e(
              `Focus view disabled.${S ?? ""} Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.`,
              {
                display: "system",
              },
            );
            return null;
          }
          e(
            "Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.",
            {
              display: "system",
            },
          );
          return null;
        }
        let s = !n.getAppState().briefTranscript;
        n.onQueryEvent?.({
          type: "apply_flag_settings",
          settings: {
            briefTranscript: s,
          },
        });
        if (getGlobalConfig().briefTranscript !== s)
          await saveGlobalConfig(
            (S) => ({
              ...S,
              briefTranscript: s,
            }),
            n.storageV5,
          );
        invalidateFocusModeSection();
        let viewMode = getInitialSettings_2().viewMode;
        let y = applyFocusViewToRemote(viewMode ? viewMode === "focus" : s);
        e(`${s ? "Focus view enabled" : "Focus view disabled"}${y ?? ""}`, {
          display: "system",
        });
        return null;
      },
    }),
};
var focusNonInteractiveCommand = {
  type: "local",
  name: "focus",
  terminalOriented: true,
  advertisedOnHostedSessions: true,
  supportsNonInteractive: true,
  description: "Toggle focus view: just your prompt, summary, and response",
  argumentHint: "[on|off]",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./chunk-fv21ck8e.js"),
};
var focusCommand = focusCommandDefinition;
//@ chunk-e6aww6q8.js:2052746-2053003 placement
/**
 * applyFocusViewToRemote：远程会话时通过 control request 下发 viewMode。
 */
function applyFocusViewToRemote(e) {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps) return null;
  if (!isRemoteControlChannelAvailable())
    return " (applied locally \u2014 this remote transport can\u2019t update the remote session)";
  remoteCaps
    .sendControlRequest({
      subtype: "apply_flag_settings",
      settings: {
        viewMode: e ? "focus" : null,
      },
    })
    .catch(logError);
  return null;
}
export { focusCommand, focusNonInteractiveCommand };
