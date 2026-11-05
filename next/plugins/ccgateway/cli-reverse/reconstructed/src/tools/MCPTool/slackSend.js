/**
 * tools/MCPTool/slackSend.ts
 *
 * Slack 发送消息的 MCP 工具识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xdsy7f3d.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripControlChars, renderToolUseMessage_4 } from "./UI.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xdsy7f3d.js:232-260 placement
/**
 * 匹配 Slack 频道 id（C/D/G 开头、至少 7 位）。
 */
var SLACK_CHANNEL_ID_RE = /^[CDG][A-Z0-9]{6,}$/;
//@ chunk-xdsy7f3d.js:260-369 placement
function slackChannelUrl(channel) {
  let replaced = channel.replace(/^#/, "");
  return SLACK_CHANNEL_ID_RE.test(replaced) ? `https://slack.com/app_redirect?channel=${replaced}` : null;
}
//@ chunk-xdsy7f3d.js:369-449 placement
/**
 * Slack 发送类工具的 MCP 工具名集合。
 */
var SLACK_SEND_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MCP_SLACK_SEND;
deferInit("chunk-xdsy7f3d.js:369", () => {
  SLACK_SEND_TOOL_NAMES = new Set(["slack_send_message", "slack_post_message"]);
  MCP_SLACK_SEND = "mcp-slack-send";
});
//@ chunk-xdsy7f3d.js:449-481 placement
/**
 * 判断工具名是否属于 Slack 发送类工具。
 */
function isSlackSendToolName(name) {
  return SLACK_SEND_TOOL_NAMES.has(name);
}
//@ chunk-xdsy7f3d.js:481-643 placement
/**
 * 从 Slack 发送输入中取频道并生成 #频道 标签与链接。
 */
function getSlackChannelLink(input) {
  let channelValue = input.channel_id ?? input.channel;
  if (typeof channelValue !== "string") return null;
  let channelName = stripControlChars(channelValue);
  if (!channelName) return null;
  return {
    label: `#${channelName.replace(/^#/, "")}`,
    url: slackChannelUrl(channelValue),
  };
}
//@ chunk-xdsy7f3d.js:643-771 placement
/**
 * 创建 Slack 发送工具的界面定义（名称 Slacked、详细模式下才显示调用）。
 */
function createSlackSendToolUi() {
  return {
    uiTableKey: MCP_SLACK_SEND,
    userFacingName() {
      return "Slacked";
    },
    renderToolUseMessage(input, options) {
      return options.verbose ? renderToolUseMessage_4(input, options) : "";
    },
  };
}
export { isSlackSendToolName, createSlackSendToolUi, slackChannelUrl, getSlackChannelLink, MCP_SLACK_SEND };
