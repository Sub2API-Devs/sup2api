/**
 * tools/FetchInboxMessageTool/FetchInboxMessageTool.ts
 *
 * 2.1.316 新增：FetchInboxMessage 工具：读取关联线程中继来的收件箱消息；FetchInboxMessage 工具输入/输出 schema等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-psktkvhp.js (9)
 * attribution: placement 9
 */
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  INBOX_FILE_ID_PATTERN,
  renderInboxContentEnvelope,
  inboxSenderProvenanceCaption,
  foldSenderDisplayBrackets,
} from "../../bridge/sessionInbox.js";
import { serverHasAnyTool, HEARTH_REPLY_TOOL, HEARTH_REPLY_TOOL_ALT } from "../../services/mcp/ccrMetaMcp.js";
import { toolMatchesName } from "../../Tool.js";
import {
  FETCH_INBOX_MESSAGE_TOOL_NAME,
  fetchInboxMessageDescription,
  fetchInboxMessagePrompt,
} from "./prompt.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import {
  getSupervisedBridgeSessionId,
  getReplBridgeHandle,
  getSdkHostedBridgeHandle,
} from "../../bridge/replBridgeHandle.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { AbortError } from "../../utils/errors.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fetchSupervisedInboxMessage } from "../../bridge/supervisedInbox.js";
import { sessionInboxPointers } from "../../bridge/sessionInboxPointers.js";
import { authExpiredBlockFor } from "../../services/policyLimits/capabilityBlocks.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../utils/auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logEvent } from "../../services/analytics/index.js";
import { ownerInboxNoticeFileId } from "../../utils/externalEventWake.js";

//@ chunk-psktkvhp.js:5548-5576 placement
/**
 * 收件箱拉取退避的基数（5 秒）、上限（20 秒）与重置时长（5 分钟）。
 */
var INBOX_BACKOFF_BASE_MS = 5000;
var INBOX_BACKOFF_CAP_MS = 20000;
var INBOX_BACKOFF_RESET_MS = 300000;
//@ chunk-psktkvhp.js:5576-5957 placement
/**
 * 收件箱拉取的退避状态。
 */
class InboxFetchBackoff {
  unservedInARow = 0;
  waitMs = 0;
  waitSetAt = 0;
  remainingMs(nowMs) {
    return Math.max(0, this.waitSetAt + this.waitMs - nowMs);
  }
  noteUnserved(nowMs, observedAtMs) {
    if (nowMs < this.waitSetAt) return;
    if (observedAtMs - this.waitSetAt > INBOX_BACKOFF_RESET_MS) this.unservedInARow = 0;
    this.unservedInARow += 1;
    this.waitMs = backoffDelayMs({
      attempt: this.unservedInARow,
      baseMs: INBOX_BACKOFF_BASE_MS,
      capMs: INBOX_BACKOFF_CAP_MS,
    });
    this.waitSetAt = observedAtMs;
  }
  noteAnswered(nowMs) {
    if (nowMs < this.waitSetAt) return;
    this.unservedInARow = 0;
    this.waitMs = 0;
  }
}
//@ chunk-psktkvhp.js:5957-5981 placement
/**
 * 按会话根保存的收件箱拉取退避状态。
 */
var inboxBackoffByRoot = new SessionRootSlot(() => new InboxFetchBackoff());
//@ chunk-psktkvhp.js:5981-6453 placement
/**
 * FetchInboxMessage 的输出 schema（ok、消息各字段与 reason）。
 */
var FetchInboxMessageInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_id: stringSchema()
      .regex(INBOX_FILE_ID_PATTERN, "must be the file_id from the notification")
      .describe("The file_id from the session-inbox notification you received"),
  }),
);
var fetchInboxOutputSchema = DoctorLazy(() =>
  objectSchema({
    ok: booleanSchema(),
    file_id: stringSchema().optional(),
    message_id: stringSchema().optional(),
    enveloped_text: stringSchema().optional(),
    body: stringSchema().optional(),
    sender_display: stringSchema().optional(),
    sender_kind: stringSchema().optional(),
    source: stringSchema().optional(),
    slack_permalink: stringSchema().optional(),
    received_at: stringSchema().optional(),
    attachments_prefix: stringSchema().optional(),
    reason: stringSchema().optional(),
  }),
);
//@ chunk-psktkvhp.js:6453-6507 placement
/**
 * 判断该收件箱工具是否属于项目范围（关联线程的 project 来源）。
 */
function inboxMessageScope(tools) {
  return serverHasAnyTool(tools, [HEARTH_REPLY_TOOL, HEARTH_REPLY_TOOL_ALT]) ? "project" : undefined;
}
//@ chunk-psktkvhp.js:6507-6568 placement
/**
 * 项目范围时为工具名加 "IP:" 前缀（用于提示与描述）。
 */
function inboxSurfaceCacheKeyBit(tool, tools) {
  return toolMatchesName(tool, FETCH_INBOX_MESSAGE_TOOL_NAME) && inboxMessageScope(tools) === "project"
    ? "IP:"
    : "";
}
//@ chunk-psktkvhp.js:6568-11598 placement
/**
 * FetchInboxMessage 工具：读取关联线程中继来的收件箱消息。
 */
var FetchInboxMessageTool = new Set([
  "not_found",
  "forbidden",
  "untrusted_device",
  "relogin",
  "feature_disabled",
  "wrong_session",
]);
var FetchInboxMessageTool_2 = buildTool({
  name: FETCH_INBOX_MESSAGE_TOOL_NAME,
  searchHint: "read a relayed inbox message from a linked thread",
  backgrounding: "never",
  maxResultSizeChars: 20000,
  skipAggregateToolResultBudget: true,
  userFacingName: () => "FetchInboxMessage",
  get inputSchema() {
    return FetchInboxMessageInputSchema();
  },
  get outputSchema() {
    return fetchInboxOutputSchema();
  },
  shouldDefer: true,
  isEnabled() {
    return isReplBridgeActive() || getSupervisedBridgeSessionId() !== undefined;
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(input) {
    return input.file_id ? `read inbox message ${input.file_id}` : "read inbox message";
  },
  async description(input, { tools }) {
    return fetchInboxMessageDescription(inboxMessageScope(tools));
  },
  async prompt({ tools }) {
    return fetchInboxMessagePrompt(inboxMessageScope(tools));
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    let contentText;
    if (result.ok && result.enveloped_text) contentText = result.enveloped_text;
    else
      switch (result.reason) {
        case "not_found":
          contentText = `No inbox message at ${result.file_id ?? "that id"} for this session (unknown id, another session's message, or expired \u2014 messages are kept about a week).`;
          break;
        case "wrong_session":
          contentText = `No inbox message at ${result.file_id ?? "that id"} for this session (it names a different session, so it was not read).`;
          break;
        case "untrusted_device":
          contentText =
            "The session service refused the read because this device is not trusted for this session. Tell the user; don't retry.";
          break;
        case "relogin":
          contentText =
            "The session service refused the read because the login on this device is stale (run /login again). Tell the user; do not retry.";
          break;
        case "forbidden":
          contentText =
            "The session service refused the read for this session (not a device-trust problem). Tell the user; do not retry.";
          break;
        case "owner_changed":
          contentText =
            "Remote Control on this device switched to another account, so this session can no longer read its inbox from here. Tell the user; do not retry.";
          break;
        case "no_token":
          contentText =
            "This machine is not signed in to claude.ai for Remote Control (or is not on the first-party API), so the session inbox cannot be read from here. Tell the user; do not retry.";
          break;
        case "owner_unverified":
          contentText =
            "This device's Remote Control login could not be verified just now (a login or account change may still be in progress), so the inbox was not read. Try again in a moment; if it keeps failing, tell the user.";
          break;
        case "feature_disabled":
          contentText = "The session inbox isn't enabled for this organization, so there is nothing to read.";
          break;
        case "no_bridge":
          contentText = "Remote Control is not connected, so the session inbox is unreachable right now.";
          break;
        case "traffic_disabled":
          contentText =
            "Nonessential network traffic is disabled on this device, so the session inbox cannot be read from here. Tell the user; do not retry.";
          break;
        case "base_url_override":
          contentText =
            "The Remote Control API host is overridden by a settings file rather than this process's own environment, so the inbox was not read. Tell the user; don't retry.";
          break;
        default:
          contentText = `Couldn't read inbox message ${result.file_id ?? ""} (${result.reason ?? "error"}). Check the debug log for [bridge] inbox fetch.`;
      }
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: contentText,
    };
  },
  renderToolUseMessage(input) {
    return input.file_id ? `read ${truncateToLength(input.file_id, 13)}` : "";
  },
  create({ credentials, storageV5, session, messageQueue, messages }) {
    return {
      async checkPermissions() {
        return {
          behavior: "allow",
          updatedInput: undefined,
        };
      },
      async call({ file_id: fileId }, { signal }) {
        let bridgeHandle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
        let backoff = inboxBackoffByRoot.of(session);
        let clock = session.host.clock;
        let nowMs = clock.monotonicNow();
        if (!bridgeHandle?.outboundOnly) {
          for (let waitMs = backoff.remainingMs(nowMs); waitMs > 0; waitMs = backoff.remainingMs(nowMs)) {
            logForDebugging(
              `[bridge] inbox fetch: waiting ${Math.ceil(waitMs)}ms after a read the service did not serve`,
            );
            await sleep(waitMs, signal, {
              clock,
              abortError: () => new AbortError(),
            });
            nowMs = clock.monotonicNow();
          }
          bridgeHandle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
        }
        let fetchResult;
        if (bridgeHandle?.outboundOnly) {
          logFeatureBad("bridge_inbox_fetch", "no_bridge");
          fetchResult = {
            ok: false,
            reason: "no_bridge",
          };
        } else
          fetchResult = bridgeHandle
            ? await bridgeHandle.fetchInboxMessage(fileId)
            : await fetchSupervisedInboxMessage(fileId, {
                credentials,
                storageV5,
              });
        if (fetchResult.ok || FetchInboxMessageTool.has(fetchResult.reason)) backoff.noteAnswered(nowMs);
        else if (
          fetchResult.reason === "request_failed" ||
          fetchResult.reason === "http_error" ||
          fetchResult.reason === "malformed"
        )
          backoff.noteUnserved(nowMs, clock.monotonicNow());
        let wasAnnouncedAsOwners = sessionInboxPointers.peek(session)?.wasAnnouncedAsOwners(fileId) === true;
        sessionInboxPointers.peek(session)?.noteFetchAttempt(fileId, fetchResult, messageQueue);
        if (!fetchResult.ok)
          return {
            data: {
              ok: false,
              file_id: fileId,
              reason: fetchResult.reason,
            },
            ...(fetchResult.reason === "relogin" && {
              remedy: authExpiredBlockFor(await getClaudeAIOAuthTokenOriginAsync(credentials)),
            }),
          };
        let message = fetchResult.message;
        let envelopedText = fetchResult.envelopedText;
        if (
          message.senderKind === "rc_owner" &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_star", true) &&
          !wasAnnouncedAsOwners &&
          !messages().some((message) => buildTranscriptEntries(message, fileId))
        ) {
          let { attachments, senderDisplay, ...rebuiltMessage } = message;
          message = {
            ...rebuiltMessage,
            senderKind: "unknown",
          };
          envelopedText = renderInboxContentEnvelope(message);
          logForDebugging(
            "[bridge] inbox fetch: the message says it is the owner's, but no server notice announced its file_id to this session as the owner's; read as third-party",
            {
              level: "warn",
            },
          );
          logEvent("tengu_inbox_owner_kind_unannounced", {});
        }
        let attachmentsPrefix;
        let attachments = message.attachments ?? [];
        if (attachments.length > 0) {
          let { resolveInboundAttachments } = await import("../../bridge/inboundAttachments.js");
          let { prefix } = await resolveInboundAttachments(
            attachments,
            false,
            false,
            storageV5,
            credentials,
            fetchResult.download,
          );
          attachmentsPrefix = prefix;
          envelopedText = renderInboxContentEnvelope(message, attachmentsPrefix.trim());
        }
        return {
          data: {
            ok: true,
            file_id: fileId,
            message_id: message.messageId,
            enveloped_text: envelopedText,
            body: message.body,
            sender_display: message.senderDisplay,
            sender_kind: message.senderKind,
            source: message.source,
            slack_permalink: message.slackPermalink,
            received_at: message.createdAt,
            attachments_prefix: attachmentsPrefix,
          },
        };
      },
    };
  },
  extractSearchText(result) {
    if (!result.ok) return result.reason ?? "";
    return [
      inboxSenderProvenanceCaption(result.sender_kind),
      foldSenderDisplayBrackets(result.sender_display ?? "") || result.sender_kind,
      result.attachments_prefix,
      result.body,
      result.slack_permalink,
      result.received_at,
    ].filter(Boolean).join(`
`);
  },
});
//@ chunk-psktkvhp.js:11598-11804 placement = buildTranscriptEntries (0.777)
function buildTranscriptEntries(message, fileId) {
  switch (message.type) {
    case "user":
      return mentionsInboxNoticeFile(message.origin, message.message.content, fileId);
    case "attachment":
      return (
        message.attachment.type === "queued_command" &&
        mentionsInboxNoticeFile(message.attachment.origin, message.attachment.prompt, fileId)
      );
    default:
      return false;
  }
}
//@ chunk-psktkvhp.js:11804-11922 placement
function mentionsInboxNoticeFile(delivery, content, fileId) {
  return (
    typeof content === "string"
      ? [content]
      : content.flatMap((block) => (block.type === "text" ? [block.text] : []))
  ).some((text) => ownerInboxNoticeFileId(delivery, text) === fileId);
}
export { FetchInboxMessageTool_2, inboxSurfaceCacheKeyBit };
