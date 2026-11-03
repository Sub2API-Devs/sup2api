/**
 * services/notifier.ts
 *
 * 桌面通知：执行 Notification hooks 后按 preferredNotifChannel（auto/iterm2/iterm2_with_bell/kitty/ghostty/terminal_bell）用终端转义序列发送
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/notifier.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-q6rfp6n3.js (6)
 * attribution: fingerprint 5, affinity 1, callgraph-fingerprint 1
 */
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { executeNotificationHooks } from "../utils/hooks.js";
import { getSessionIdentity } from "../utils/shutdown/pendingWrites.js";
import { NOTIFICATION_CHANNELS } from "../utils/configConstants.js";
import { logFeatureBad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum } from "./analytics/safeMetadata.js";
import { NOTIFICATION_CHANNELS as NOTIFICATION_CHANNELS_2 } from "../utils/config.js";
import { sanitizeTerminalName } from "../utils/terminalProbe.js";
import { env } from "../utils/env.js";
import { getAttacherCaps } from "../bootstrap/state.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { parsePlistXml, isPlainObjectPlist } from "../utils/plistParser.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-q6rfp6n3.js:1867-2350 fingerprint = sendNotification (0.49)
/**
 * 发送桌面通知：先执行 Notification hooks，再按 preferredNotifChannel（默认 auto）选择通道发送，打 tengu_notification_method_used（通道、类型、终端）。
 */
async function sendNotification(
  notification,
  terminal,
  { storageV5: o, credentials: r, hookOrigin: s } = {},
) {
  let preferredChannel = resolveSetting("preferredNotifChannel", "auto").value;
  await executeNotificationHooks(getSessionIdentity(), notification, {
    storageV5: o,
    credentials: r,
    hookOrigin: s,
  });
  let methodUsed = await NOTIFICATION_CHANNELS(preferredChannel, notification, terminal);
  if (methodUsed === "error") logFeatureBad("notification_show", "send_failed");
  else logFeatureOk("notification_show");
  logEvent("tengu_notification_method_used", {
    configured_channel: fromEnum(
      NOTIFICATION_CHANNELS_2.includes(preferredChannel) ? preferredChannel : "invalid",
    ),
    notification_type: fromEnum(notification.notificationType),
    method_used: fromEnum(methodUsed),
    term: sanitizeTerminalName(env.terminal),
    attacher_term: sanitizeTerminalName(getAttacherCaps()?.terminal),
  });
  return methodUsed;
}
//@ chunk-q6rfp6n3.js:2350-2370 affinity = DEFAULT_TITLE (1)
var DEFAULT_TITLE_2 = "Claude Code";
//@ chunk-q6rfp6n3.js:2659-2913 fingerprint = sendAuto (0.848)
/**
 * auto 通道解析：Apple Terminal（铃声被关时用 terminal_bell）、iTerm2、kitty、ghostty 各用专有转义序列，其他终端无可用方式。
 */
async function resolveAutoNotificationChannel() {
  switch (getAttacherCaps()?.terminal ?? env.terminal) {
    case "Apple_Terminal":
      return (await isAppleTerminalBellDisabled()) ? "terminal_bell" : "no_method_available";
    case "iTerm.app":
      return "iterm2";
    case "kitty":
      return "kitty";
    case "ghostty":
      return "ghostty";
    default:
      return "no_method_available";
  }
}
//@ chunk-q6rfp6n3.js:2913-3271 fingerprint = sendToChannel (0.849)
/**
 * 按通道发送通知：iterm2（OSC 9）、iterm2_with_bell、kitty（OSC 99，带随机 id）、ghostty、terminal_bell；disabled/none 不发。
 */
function sendToChannel(channel, opts, terminal) {
  switch (channel) {
    case "iterm2":
      terminal.notifyITerm2(opts);
      return;
    case "iterm2_with_bell":
      terminal.notifyITerm2(opts);
      terminal.notifyBell();
      return;
    case "kitty":
      terminal.notifyKitty({
        ...opts,
        title: opts.title || DEFAULT_TITLE_2,
        id: generateKittyId(),
      });
      return;
    case "ghostty":
      terminal.notifyGhostty({
        ...opts,
        title: opts.title || DEFAULT_TITLE_2,
      });
      return;
    case "terminal_bell":
      terminal.notifyBell();
      return;
    case "disabled":
    case "none":
    case "no_method_available":
      return;
  }
}
//@ chunk-q6rfp6n3.js:3271-3321 callgraph-fingerprint = generateKittyId (1)
function generateKittyId() {
  return Math.floor(Math.random() * 1e4);
}
//@ chunk-q6rfp6n3.js:3321-4001 fingerprint = isAppleTerminalBellDisabled (0.718)
/**
 * 用 osascript/defaults 读 Apple Terminal 当前配置文件，判断是否关闭了响铃。
 */
async function isAppleTerminalBellDisabled() {
  try {
    let currentProfile = (
      await execFileNoThrow("osascript", [
        "-e",
        'tell application "Terminal" to name of current settings of front window',
      ])
    ).stdout.trim();
    if (!currentProfile) return false;
    let defaultsOutput = await execFileNoThrow("defaults", ["export", "com.apple.Terminal", "-"]);
    if (defaultsOutput.code !== 0) return false;
    let plistXml = parsePlistXml(defaultsOutput.stdout);
    if (!isPlainObjectPlist(plistXml)) {
      logForDebugging("Failed to read Apple Terminal bell setting: defaults export is not a plist dict");
      return false;
    }
    let windowSettings = plistXml["Window Settings"];
    let profileSettings = isPlainObjectPlist(windowSettings) ? windowSettings[currentProfile] : undefined;
    if (!isPlainObjectPlist(profileSettings)) {
      logForDebugging("Failed to read Apple Terminal bell setting: no settings dict for the current profile");
      return false;
    }
    return profileSettings.Bell === false;
  } catch (error) {
    logForDebugging(
      `Failed to read Apple Terminal bell setting: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-18hwfzwa.js:173849-173871 fingerprint = DEFAULT_TITLE (1)
var DEFAULT_TITLE = "Claude Code";
export { DEFAULT_TITLE, sendNotification, resolveAutoNotificationChannel, sendToChannel };
