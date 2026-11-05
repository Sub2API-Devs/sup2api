/**
 * services/mcp/googleConnectorAttachments.ts
 *
 * Google Drive/Gmail 连接器附件的识别与遥测：按 URL 与 MCP tool 名判定官方 drive/gmail server，记录附件送达/未保存/未读事件（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-323717f6.js (11)
 * attribution: placement 11
 */
import { claudeAiConnectorCapability } from "./fileReference/fileReferencePolicy.js";
import { connectorServerId } from "./claudeai.js";
import { isPluginServerConfig } from "./types.js";
import { isObjectBlock, recordNotRead, toolResultStoreOrNull } from "../../utils/toolResultStorage.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../analytics/index.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isGmailAttachmentTool } from "../../bootstrap/stateSlices.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-323717f6.js:11775-11875 placement
/**
 * Google Drive/Gmail 官方 MCP server 的主机名表与 download_file_content 工具名。
 */
var GOOGLE_MCP_HOSTS = {
  drive: "drivemcp.googleapis.com",
  gmail: "gmailmcp.googleapis.com",
};
var DOWNLOAD_FILE_CONTENT = "download_file_content";
//@ chunk-323717f6.js:11875-11961 placement
/**
 * 判定 URL 是否指向 Drive 或 Gmail 的官方 MCP 主机（且为 https）。
 */
function isGoogleMcpHostUrl(url, hostKey) {
  let parsed = URL.parse(url);
  return parsed?.protocol === "https:" && parsed.hostname === GOOGLE_MCP_HOSTS[hostKey];
}
//@ chunk-323717f6.js:11961-12232 placement
/**
 * 判定某个 MCP server 配置是否接入 Drive/Gmail 连接器（sdk、claudeai-proxy 或带 mcp_url 参数的动态 http）。
 */
function serverDialsGoogleHost(server, hostKey) {
  let { config } = server;
  return config.type === "sdk"
    ? claudeAiConnectorCapability(server) !== undefined
    : config.type === "claudeai-proxy"
      ? connectorServerId(config) !== undefined && isGoogleMcpHostUrl(config.url, hostKey)
      : config.type === "http" &&
        config.scope === "dynamic" &&
        !isPluginServerConfig(config) &&
        URL.parse(config.url, "https://no-origin.invalid")
          ?.searchParams.getAll("mcp_url")
          .some((nestedUrl) => isGoogleMcpHostUrl(nestedUrl, hostKey)) === true;
}
//@ chunk-323717f6.js:12232-12277 placement
/**
 * 判定这次 MCP 工具调用是否为 Drive 下载工具。
 */
function isDriveDownloadCall(server, toolName) {
  return toolName === DOWNLOAD_FILE_CONTENT && serverDialsGoogleHost(server, "drive");
}
//@ chunk-323717f6.js:12277-12441 placement
/**
 * Drive 下载且结果全是文本时把结果原样放行。
 */
function textResultToolUseId(server, toolName, toolUseId, result) {
  return isDriveDownloadCall(server, toolName) &&
    typeof result === "object" &&
    result !== null &&
    "content" in result &&
    Array.isArray(result.content) &&
    result.content.every((block) => isObjectBlock(block) && block.type === "text")
    ? toolUseId
    : undefined;
}
//@ chunk-323717f6.js:12441-12479 placement
/**
 * Drive 下载被裁掉时记一条未读遥测。
 */
function noteGmailAttachmentShown(client, tool, reason) {
  if (isDriveDownloadCall(client, tool)) recordNotRead(reason);
}
//@ chunk-323717f6.js:12479-12776 placement
/**
 * Gmail 附件去向的遥测事件名与按会话计数器。
 */
var GMAIL_ATTACHMENT_EVENTS; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var EMPTY_GMAIL_COUNTS;
var gmailCountsByHost;
deferInit("chunk-323717f6.js:12479", () => {
  GMAIL_ATTACHMENT_EVENTS = {
    shown: "tengu_mcp_gmail_attachment_delivered",
    saved: "tengu_mcp_gmail_attachment_delivered",
    not_kept: "tengu_mcp_gmail_attachment_not_kept",
    not_saved: "tengu_mcp_gmail_attachment_not_saved",
  };
  EMPTY_GMAIL_COUNTS = {
    shown: 0,
    saved: 0,
    not_kept: 0,
    attachment_not_read: 0,
    get_message_not_read: 0,
  };
  gmailCountsByHost = new SessionRootSlot(() => ({
    ...EMPTY_GMAIL_COUNTS,
  }));
});
//@ chunk-323717f6.js:12776-12835 placement
/**
 * 按是否保存过决定 Gmail 附件是 not_saved 还是 not_kept。
 */
function unreadOutcome() {
  return toolResultStoreOrNull() === undefined ? "not_saved" : "not_kept";
}
//@ chunk-323717f6.js:12835-12910 placement
/**
 * 记录一次 Gmail 附件结果（带字节数），非 not_saved 时计数。
 */
function noteAttachmentOutcome(outcome, sizeBytes) {
  logEvent(GMAIL_ATTACHMENT_EVENTS[outcome], {
    sizeBytes,
  });
  if (outcome !== "not_saved") gmailCountsByHost.of(getRootSession())[outcome]++;
}
//@ chunk-323717f6.js:12910-12966 placement
/**
 * Gmail 附件工具的记账函数，非 Gmail 连接器时返回 undefined。
 */
function attachmentNoteFor(server, toolName) {
  return isGmailAttachmentTool(toolName) && serverDialsGoogleHost(server, "gmail")
    ? noteAttachmentOutcome
    : undefined;
}
//@ chunk-323717f6.js:12966-13196 placement
/**
 * 记录 Gmail get_message 或附件未被读取的遥测与计数。
 */
function noteGmailAttachmentNotRead(client, tool, reason) {
  let isGetMessage = tool === "get_message";
  if ((isGetMessage || isGmailAttachmentTool(tool)) && serverDialsGoogleHost(client, "gmail")) {
    logEvent(isGetMessage ? "tengu_mcp_gmail_get_message_not_read" : "tengu_mcp_gmail_attachment_not_read", {
      reason: fromEnum(reason),
    });
    gmailCountsByHost.of(getRootSession())[isGetMessage ? "get_message_not_read" : "attachment_not_read"]++;
  }
}
export {
  unreadOutcome,
  attachmentNoteFor,
  textResultToolUseId,
  noteGmailAttachmentNotRead,
  noteGmailAttachmentShown,
};
