/**
 * bridge/bridgeStatusUtil.ts
 *
 * 并入远程控制状态行文案与常量（失败后禁用提示、开始时间等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeStatusUtil.ts
 * pieces: chunk-czq1j3j2.js (1), chunk-h6n138yz.js (15)
 * attribution: fingerprint 4, placement 6, layout 6
 */
import { formatRelativeTimeAgo } from "../utils/format.js";
import { getClaudeAiBaseUrl } from "../constants/product.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getGraphemeSegmenter } from "../utils/intl.js";
import { BRIDGE_MALFORMED_RESPONSE_HINT, BRIDGE_SIGNATURE_WANTED_HINT } from "./types.js";

//@ chunk-h6n138yz.js:377-509 placement
/**
 * 桥接状态行常量：重复失败被禁用后的footer 文案、"Remote Control 未在此启动"文案与状态宽度等。
 */
var BRIDGE_STATUS_CONSTANTS = 30000;
var BRIDGE_FAILED = "bridge-failed";
var BRIDGE_FAILED_FOOTER_TEXT = "disabled after repeated failures \xB7 restart to retry";
var REMOTE_CONTROL_NOT_STARTED_TEXT = "Remote Control not started here";
//@ chunk-h6n138yz.js:509-917 placement
function bridgeStatusLines(bridge, { crossSessionMessaging }, now = new Date()) {
  let startedSuffix =
    bridge.startedAt > 0 && bridge.startedAt <= now.getTime()
      ? ` (started ${formatRelativeTimeAgo(new Date(bridge.startedAt), {
          now,
        })})`
      : "";
  return `${REMOTE_CONTROL_NOT_STARTED_TEXT} \xB7 another Claude Code on this machine${startedSuffix} already has Remote Control for this conversation${crossSessionMessaging ? ", so this terminal can't see your sessions on other machines and they can't reach it" : ""} \xB7 run /remote-control to move it to this terminal`;
}
//@ chunk-h6n138yz.js:917-929 placement
var BRIDGE_STATUS_MAX_WIDTH = 150;
//@ chunk-h6n138yz.js:929-1103 placement (2.1.88 match: timestamp, 1)
/**
 * 当前本地时间 HH:MM:SS。
 */
function timestamp() {
  let now = new Date();
  let padded = String(now.getHours()).padStart(2, "0");
  let m = String(now.getMinutes()).padStart(2, "0");
  let padded_2 = String(now.getSeconds()).padStart(2, "0");
  return `${padded}:${m}:${padded_2}`;
}
//@ chunk-h6n138yz.js:1103-1168 placement
/**
 * claude.ai 的 /code?environment=… 连接地址。
 */
function buildBridgeConnectUrl(environmentId, ingressUrl) {
  return `${getClaudeAiBaseUrl(undefined, ingressUrl)}/code?environment=${environmentId}`;
}
//@ chunk-h6n138yz.js:1168-1213 placement
/**
 * 计算 shimmer 动画当前高亮位置。
 */
function computeGlimmerIndex(tick, messageWidth) {
  let cycleLength = messageWidth + 20;
  return messageWidth + 10 - (tick % cycleLength);
}
//@ chunk-h6n138yz.js:1213-1476 fingerprint (2.1.88 match: computeShimmerSegments, 1)
/**
 * 把文本按显示宽度切成 before / shimmer / after 三段（高亮当前位置附近字符）。
 */
function computeShimmerSegments(text, glimmerIndex) {
  let messageWidth = bunStringWidth(text);
  let shimmerStart = glimmerIndex - 1;
  let shimmerEnd = glimmerIndex + 1;
  if (shimmerStart >= messageWidth || shimmerEnd < 0)
    return {
      before: text,
      shimmer: "",
      after: "",
    };
  let clampedStart = Math.max(0, shimmerStart);
  let colPos = 0;
  let before = "";
  let shimmer = "";
  let after = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let segWidth = bunStringWidth(segment);
    if (colPos + segWidth <= clampedStart) before += segment;
    else if (colPos > shimmerEnd) after += segment;
    else shimmer += segment;
    colPos += segWidth;
  }
  return {
    before,
    shimmer,
    after,
  };
}
//@ chunk-h6n138yz.js:1476-1650 layout
/**
 * /rc 状态标签：failed、reconnecting、active、connecting。
 */
var STATUS_FAILED = {
  label: "/rc failed",
  color: "error",
};
var STATUS_RECONNECTING = {
  label: "/rc reconnecting",
  color: "warning",
};
var STATUS_ACTIVE = {
  label: "/rc active",
  color: "success",
};
var STATUS_CONNECTING = {
  label: "/rc connecting\u2026",
  color: "warning",
};
//@ chunk-h6n138yz.js:1650-1771 fingerprint (2.1.88 match: getBridgeStatus, 0.839)
/**
 * 桥状态标签：error → 失败、reconnecting → 重连中、已连接或会话活动 → 活动、否则空闲。
 */
function getBridgeStatus({ error, connected, sessionActive, reconnecting }) {
  if (error) return STATUS_FAILED;
  if (reconnecting) return STATUS_RECONNECTING;
  if (sessionActive || connected) return STATUS_ACTIVE;
  return STATUS_CONNECTING;
}
//@ chunk-h6n138yz.js:1771-1844 layout
/**
 * 空闲时页脚提示："Code anywhere with the Claude mobile app or <链接>"。
 */
function buildIdleFooterText(url) {
  return `Code anywhere with the Claude mobile app or ${url}`;
}
//@ chunk-h6n138yz.js:1844-1923 layout
/**
 * 页脚补充提示：也可以在 claude.ai 项目里让 Claude 在此文件夹工作。
 */
var PROJECTS_HINT_TEXT = "Or ask Claude to work in this folder from your projects on claude.ai";
//@ chunk-h6n138yz.js:1923-1996 layout
/**
 * 活动时页脚提示："Continue coding in the Claude mobile app or <链接>"。
 */
function buildActiveFooterText(url) {
  return `Continue coding in the Claude mobile app or ${url}`;
}
//@ chunk-h6n138yz.js:1996-2035 layout
/**
 * 失败时页脚提示："Run /remote-control to retry"。
 */
var FAILED_FOOTER_TEXT = "Run /remote-control to retry";
//@ chunk-h6n138yz.js:2035-2225 layout
function isActionableHint(message) {
  return (
    message === BRIDGE_MALFORMED_RESPONSE_HINT ||
    message === BRIDGE_SIGNATURE_WANTED_HINT ||
    message?.includes("/login") === true ||
    message?.includes("/remote-control") === true ||
    message?.includes("restart") === true ||
    message?.includes("policy") === true ||
    message?.includes("update") === true
  );
}
//@ chunk-h6n138yz.js:2225-2284 fingerprint (2.1.88 match: wrapWithOsc8Link, 1)
/**
 * 用 OSC 8 转义序列把文字包成终端超链接。
 */
function wrapWithOsc8Link(text, url) {
  return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`;
}
//@ chunk-czq1j3j2.js:108653-108834 fingerprint (2.1.88 match: timestamp, 1)
function formatClockTime(now) {
  let hour12 = now.getHours() % 12 || 12;
  let m = String(now.getMinutes()).padStart(2, "0");
  let padded = String(now.getSeconds()).padStart(2, "0");
  let meridiem = now.getHours() < 12 ? "am" : "pm";
  return `${hour12}:${m}:${padded}${meridiem}`;
}
export {
  buildBridgeConnectUrl,
  BRIDGE_FAILED,
  isActionableHint,
  getBridgeStatus,
  BRIDGE_FAILED_FOOTER_TEXT,
  FAILED_FOOTER_TEXT,
  buildActiveFooterText,
  buildIdleFooterText,
  wrapWithOsc8Link,
  BRIDGE_STATUS_CONSTANTS,
  PROJECTS_HINT_TEXT,
  timestamp,
  bridgeStatusLines,
  REMOTE_CONTROL_NOT_STARTED_TEXT,
  formatClockTime,
  computeGlimmerIndex,
  BRIDGE_STATUS_MAX_WIDTH,
  computeShimmerSegments,
};
