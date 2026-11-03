/**
 * tools/MCPTool/slackSend.ts
 *
 * Slack 发送消息的 MCP 工具识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4bsqyjz4.js (6)
 * attribution: placement 6
 */
import { stripControlChars, renderToolUseMessage_3 } from "./UI.js";

//@ chunk-4bsqyjz4.js:232-260 placement
var l = /^[CDG][A-Z0-9]{6,}$/;
//@ chunk-4bsqyjz4.js:260-369 placement
function slackChannelUrl(e) {
  let replaced = e.replace(/^#/, "");
  return l.test(replaced) ? `https://slack.com/app_redirect?channel=${replaced}` : null;
}
//@ chunk-4bsqyjz4.js:369-449 placement
var t = new Set(["slack_send_message", "slack_post_message"]),
  MCP_SLACK_SEND = "mcp-slack-send";
//@ chunk-4bsqyjz4.js:449-481 placement
function k4n(e) {
  return t.has(e);
}
/**
 * 从 Slack 发送输入中取频道并生成 #频道 标签与链接。
 */
//@ chunk-4bsqyjz4.js:481-643 placement
function getSlackChannelLink(e) {
  let n = e.channel_id ?? e.channel;
  if (typeof n !== "string") return null;
  let r = stripControlChars(n);
  if (!r) return null;
  return { label: `#${r.replace(/^#/, "")}`, url: slackChannelUrl(n) };
}
/**
 * 创建 Slack 发送工具的界面定义（名称 Slacked、详细模式下才显示调用）。
 */
//@ chunk-4bsqyjz4.js:643-771 placement
function createSlackSendToolUi() {
  return {
    uiTableKey: MCP_SLACK_SEND,
    userFacingName() {
      return "Slacked";
    },
    renderToolUseMessage(e, n) {
      return n.verbose ? renderToolUseMessage_3(e, n) : "";
    },
  };
}

export { slackChannelUrl, getSlackChannelLink, k4n, createSlackSendToolUi, MCP_SLACK_SEND };
