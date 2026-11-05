/**
 * commands/focus/index.ts
 *
 * 2.1.316 新增：/focus 命令对象：切换只显示提示、摘要和回复的专注视图（需全屏渲染器）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { setViewMode, invalidateFocusModeSection } from "../../utils/focusMode.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { logError } from "../../utils/log.js";

//@ chunk-5xgkngpb.js:2106997-2108888 placement
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
      async call(args, context) {
        setViewMode(null);
        if (context.presentation !== "fullscreen") {
          if (getInitialSettings().viewMode === "focus") {
            args(
              `Focus view is set by "viewMode": "focus" in settings.json \u2014 remove it there and restart Claude Code to turn it off. ${"Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart."}`,
              {
                display: "system",
              },
            );
            return null;
          }
          if (context.getAppState().briefTranscript || getGlobalConfig().briefTranscript) {
            context.onQueryEvent?.({
              type: "apply_flag_settings",
              settings: {
                briefTranscript: false,
              },
            });
            if (getGlobalConfig().briefTranscript)
              await saveGlobalConfig(
                (state) => ({
                  ...state,
                  briefTranscript: false,
                }),
                context.storageV5,
              );
            invalidateFocusModeSection();
            let cleared = applyFocusViewToRemote(false);
            args(
              `Focus view disabled.${cleared ?? ""} Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.`,
              {
                display: "system",
              },
            );
            return null;
          }
          args(
            "Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.",
            {
              display: "system",
            },
          );
          return null;
        }
        let nextMode = !context.getAppState().briefTranscript;
        context.onQueryEvent?.({
          type: "apply_flag_settings",
          settings: {
            briefTranscript: nextMode,
          },
        });
        if (getGlobalConfig().briefTranscript !== nextMode)
          await saveGlobalConfig(
            (state) => ({
              ...state,
              briefTranscript: nextMode,
            }),
            context.storageV5,
          );
        invalidateFocusModeSection();
        let viewMode = getInitialSettings().viewMode;
        let synced = applyFocusViewToRemote(viewMode ? viewMode === "focus" : nextMode);
        args(`${nextMode ? "Focus view enabled" : "Focus view disabled"}${synced ?? ""}`, {
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
  load: () => import("./focus.js"),
};
var focusCommand = focusCommandDefinition;
//@ chunk-5xgkngpb.js:2108888-2109145 placement
/**
 * applyFocusViewToRemote：远程会话时通过 control request 下发 viewMode。
 */
function applyFocusViewToRemote(viewMode) {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps) return null;
  if (!isRemoteControlChannelAvailable())
    return " (applied locally \u2014 this remote transport can\u2019t update the remote session)";
  remoteCaps
    .sendControlRequest({
      subtype: "apply_flag_settings",
      settings: {
        viewMode: viewMode ? "focus" : null,
      },
    })
    .catch(logError);
  return null;
}
export { focusCommand, focusNonInteractiveCommand };
