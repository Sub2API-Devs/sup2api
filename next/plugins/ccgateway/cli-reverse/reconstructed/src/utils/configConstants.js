/**
 * utils/configConstants.ts
 *
 * 配置枚举常量（通知通道 auto/iterm2/kitty…、编辑器模式 normal/vim）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/configConstants.ts
 * pieces: chunk-18rrbwq1.js (1), chunk-3xmyjkbh.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolveSetting } from "./settings/userIntentSettings.js";
import { resolveAutoNotificationChannel, sendToChannel } from "../services/notifier.js";

//@ chunk-18rrbwq1.js:5869-5931 fingerprint (2.1.88 match: EDITOR_MODES, 0.782)
function EDITOR_MODES() {
  return resolveSetting("editorMode", "normal").value === "vim";
}
//@ chunk-3xmyjkbh.js:2370-2659 fingerprint (2.1.88 match: NOTIFICATION_CHANNELS, 0.954)
async function NOTIFICATION_CHANNELS(preferredChannel, opts, terminal) {
  if (preferredChannel === "auto") {
    let channel = await resolveAutoNotificationChannel();
    sendToChannel(channel, opts, terminal);
    return channel;
  }
  let channel;
  switch (preferredChannel) {
    case "iterm2":
    case "iterm2_with_bell":
    case "kitty":
    case "ghostty":
    case "terminal_bell":
      channel = preferredChannel;
      break;
    case "notifications_disabled":
      channel = "disabled";
      break;
    default:
      channel = "none";
  }
  try {
    sendToChannel(channel, opts, terminal);
    return channel;
  } catch {
    return "error";
  }
}
export { EDITOR_MODES, NOTIFICATION_CHANNELS };
