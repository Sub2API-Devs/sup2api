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
import { setViewMode, $4t } from "../../utils/focusMode.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { Jn, ml } from "../../remote/remoteMode.js";
import { logError } from "../../utils/log.js";

/**
 * /focus 命令对象（local-jsx）；描述：Toggle focus view: just your prompt, summary, and response。
 */
//@ chunk-e6aww6q8.js:2050855-2052746 placement
var focusCommandDefinition = {
    type: "local-jsx",
    name: "focus",
    description: "Toggle focus view: just your prompt, summary, and response",
    immediate: !0,
    requires: { ink: !0 },
    terminalOriented: !0,
    load: () =>
      Promise.resolve({
        async call(e, n) {
          if ((setViewMode(null), n.presentation !== "fullscreen")) {
            if (getInitialSettings_2().viewMode === "focus")
              return (
                e(
                  `Focus view is set by "viewMode": "focus" in settings.json \u2014 remove it there and restart Claude Code to turn it off. ${"Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart."}`,
                  { display: "system" },
                ),
                null
              );
            if (n.getAppState().briefTranscript || getGlobalConfig().briefTranscript) {
              if (
                (n.onQueryEvent?.({ type: "apply_flag_settings", settings: { briefTranscript: !1 } }),
                getGlobalConfig().briefTranscript)
              )
                await saveGlobalConfig((w) => ({ ...w, briefTranscript: !1 }), n.storageV5);
              $4t();
              let S = applyFocusViewToRemote(!1);
              return (
                e(
                  `Focus view disabled.${S ?? ""} Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.`,
                  { display: "system" },
                ),
                null
              );
            }
            return (
              e(
                "Focus view needs the fullscreen renderer. Run /tui fullscreen to switch (this restarts and resumes your session), or set CLAUDE_CODE_NO_FLICKER=1 and restart.",
                { display: "system" },
              ),
              null
            );
          }
          let s = !n.getAppState().briefTranscript;
          if (
            (n.onQueryEvent?.({ type: "apply_flag_settings", settings: { briefTranscript: s } }),
            getGlobalConfig().briefTranscript !== s)
          )
            await saveGlobalConfig((S) => ({ ...S, briefTranscript: s }), n.storageV5);
          $4t();
          let viewMode = getInitialSettings_2().viewMode,
            y = applyFocusViewToRemote(viewMode ? viewMode === "focus" : s);
          return (
            e(`${s ? "Focus view enabled" : "Focus view disabled"}${y ?? ""}`, { display: "system" }),
            null
          );
        },
      }),
  },
  focusNonInteractiveCommand = {
    type: "local",
    name: "focus",
    terminalOriented: !0,
    advertisedOnHostedSessions: !0,
    supportsNonInteractive: !0,
    description: "Toggle focus view: just your prompt, summary, and response",
    argumentHint: "[on|off]",
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-fv21ck8e.js"),
  },
  focusCommand = focusCommandDefinition;
/**
 * applyFocusViewToRemote：远程会话时通过 control request 下发 viewMode。
 */
//@ chunk-e6aww6q8.js:2052746-2053003 placement
function applyFocusViewToRemote(e) {
  let n = Jn();
  if (!n) return null;
  if (!ml()) return " (applied locally \u2014 this remote transport can\u2019t update the remote session)";
  return (
    n
      .sendControlRequest({ subtype: "apply_flag_settings", settings: { viewMode: e ? "focus" : null } })
      .catch(logError),
    null
  );
}

export { focusCommand, focusNonInteractiveCommand };
