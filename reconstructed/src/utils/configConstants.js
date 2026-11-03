/**
 * utils/configConstants.ts
 *
 * 配置枚举常量（通知通道 auto/iterm2/kitty…、编辑器模式 normal/vim）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/configConstants.ts
 * pieces: chunk-q6rfp6n3.js (1), chunk-tzghj6zv.js (1)
 * attribution: fingerprint 2
 */
import { resolveAutoNotificationChannel, sendToChannel } from "../services/notifier.js";
import { resolveSetting } from "./settings/userIntentSettings.js";

//@ chunk-q6rfp6n3.js:2370-2659 fingerprint = NOTIFICATION_CHANNELS (0.954)
async function NOTIFICATION_CHANNELS(e, n, o) {
  if (e === "auto") {
    let s = await resolveAutoNotificationChannel();
    return (sendToChannel(s, n, o), s);
  }
  let r;
  switch (e) {
    case "iterm2":
    case "iterm2_with_bell":
    case "kitty":
    case "ghostty":
    case "terminal_bell":
      r = e;
      break;
    case "notifications_disabled":
      r = "disabled";
      break;
    default:
      r = "none";
  }
  try {
    return (sendToChannel(r, n, o), r);
  } catch {
    return "error";
  }
}
//@ chunk-tzghj6zv.js:5760-5821 fingerprint = EDITOR_MODES (0.782)
function EDITOR_MODES() {
  return resolveSetting("editorMode", "normal").value === "vim";
}

export { EDITOR_MODES, NOTIFICATION_CHANNELS };
