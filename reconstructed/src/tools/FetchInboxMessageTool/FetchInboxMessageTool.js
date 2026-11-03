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
import { zodStrictObject, o, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  INBOX_FILE_ID_PATTERN,
  renderInboxContentEnvelope,
  inboxSenderProvenanceCaption,
  foldSenderDisplayBrackets,
} from "../../bridge/sessionInbox.js";
import { m8, HEARTH_REPLY_TOOL, HEARTH_REPLY_TOOL_ALT } from "../../services/mcp/ccrMetaMcp.js";
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
var C = 5000,
  B = 20000,
  z = 300000;
/**
 * 收件箱拉取的退避状态。
 */
//@ chunk-psktkvhp.js:5576-5957 placement
class InboxFetchBackoff {
  unservedInARow = 0;
  waitMs = 0;
  waitSetAt = 0;
  remainingMs(e) {
    return Math.max(0, this.waitSetAt + this.waitMs - e);
  }
  noteUnserved(e, s) {
    if (e < this.waitSetAt) return;
    if (s - this.waitSetAt > z) this.unservedInARow = 0;
    ((this.unservedInARow += 1),
      (this.waitMs = backoffDelayMs({ attempt: this.unservedInARow, baseMs: C, capMs: B })),
      (this.waitSetAt = s));
  }
  noteAnswered(e) {
    if (e < this.waitSetAt) return;
    ((this.unservedInARow = 0), (this.waitMs = 0));
  }
}
//@ chunk-psktkvhp.js:5957-5981 placement
var A = new SessionRootSlot(() => new InboxFetchBackoff());
/**
 * FetchInboxMessage 工具输入/输出 schema。
 */
//@ chunk-psktkvhp.js:5981-6453 placement
var FetchInboxMessageInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_id: o()
        .regex(INBOX_FILE_ID_PATTERN, "must be the file_id from the notification")
        .describe("The file_id from the session-inbox notification you received"),
    }),
  ),
  N = DoctorLazy(() =>
    u({
      ok: M(),
      file_id: o().optional(),
      message_id: o().optional(),
      enveloped_text: o().optional(),
      body: o().optional(),
      sender_display: o().optional(),
      sender_kind: o().optional(),
      source: o().optional(),
      slack_permalink: o().optional(),
      received_at: o().optional(),
      attachments_prefix: o().optional(),
      reason: o().optional(),
    }),
  );
//@ chunk-psktkvhp.js:6453-6507 placement
function x(e) {
  return m8(e, [HEARTH_REPLY_TOOL, HEARTH_REPLY_TOOL_ALT]) ? "project" : void 0;
}
//@ chunk-psktkvhp.js:6507-6568 placement
function ue(e, s) {
  return toolMatchesName(e, FETCH_INBOX_MESSAGE_TOOL_NAME) && x(s) === "project" ? "IP:" : "";
}
/**
 * FetchInboxMessage 工具：读取关联线程中继来的收件箱消息。
 */
//@ chunk-psktkvhp.js:6568-11598 placement
var FetchInboxMessageTool = new Set([
    "not_found",
    "forbidden",
    "untrusted_device",
    "relogin",
    "feature_disabled",
    "wrong_session",
  ]),
  fe = buildTool({
    name: FETCH_INBOX_MESSAGE_TOOL_NAME,
    searchHint: "read a relayed inbox message from a linked thread",
    backgrounding: "never",
    maxResultSizeChars: 20000,
    skipAggregateToolResultBudget: !0,
    userFacingName: () => "FetchInboxMessage",
    get inputSchema() {
      return FetchInboxMessageInputSchema();
    },
    get outputSchema() {
      return N();
    },
    shouldDefer: !0,
    isEnabled() {
      return isReplBridgeActive() || getSupervisedBridgeSessionId() !== void 0;
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return e.file_id ? `read inbox message ${e.file_id}` : "read inbox message";
    },
    async description(e, { tools: s }) {
      return fetchInboxMessageDescription(x(s));
    },
    async prompt({ tools: e }) {
      return fetchInboxMessagePrompt(x(e));
    },
    mapToolResultToToolResultBlockParam(e, s) {
      let n;
      if (e.ok && e.enveloped_text) n = e.enveloped_text;
      else
        switch (e.reason) {
          case "not_found":
            n = `No inbox message at ${e.file_id ?? "that id"} for this session (unknown id, another session's message, or expired \u2014 messages are kept about a week).`;
            break;
          case "wrong_session":
            n = `No inbox message at ${e.file_id ?? "that id"} for this session (it names a different session, so it was not read).`;
            break;
          case "untrusted_device":
            n =
              "The session service refused the read because this device is not trusted for this session. Tell the user; don't retry.";
            break;
          case "relogin":
            n =
              "The session service refused the read because the login on this device is stale (run /login again). Tell the user; do not retry.";
            break;
          case "forbidden":
            n =
              "The session service refused the read for this session (not a device-trust problem). Tell the user; do not retry.";
            break;
          case "owner_changed":
            n =
              "Remote Control on this device switched to another account, so this session can no longer read its inbox from here. Tell the user; do not retry.";
            break;
          case "no_token":
            n =
              "This machine is not signed in to claude.ai for Remote Control (or is not on the first-party API), so the session inbox cannot be read from here. Tell the user; do not retry.";
            break;
          case "owner_unverified":
            n =
              "This device's Remote Control login could not be verified just now (a login or account change may still be in progress), so the inbox was not read. Try again in a moment; if it keeps failing, tell the user.";
            break;
          case "feature_disabled":
            n = "The session inbox isn't enabled for this organization, so there is nothing to read.";
            break;
          case "no_bridge":
            n = "Remote Control is not connected, so the session inbox is unreachable right now.";
            break;
          case "traffic_disabled":
            n =
              "Nonessential network traffic is disabled on this device, so the session inbox cannot be read from here. Tell the user; do not retry.";
            break;
          case "base_url_override":
            n =
              "The Remote Control API host is overridden by a settings file rather than this process's own environment, so the inbox was not read. Tell the user; don't retry.";
            break;
          default:
            n = `Couldn't read inbox message ${e.file_id ?? ""} (${e.reason ?? "error"}). Check the debug log for [bridge] inbox fetch.`;
        }
      return { tool_use_id: s, type: "tool_result", content: n };
    },
    renderToolUseMessage(e) {
      return e.file_id ? `read ${truncateToLength(e.file_id, 13)}` : "";
    },
    create({ credentials: e, storageV5: s, session: n, messageQueue: k, messages: l }) {
      return {
        async checkPermissions() {
          return { behavior: "allow", updatedInput: void 0 };
        },
        async call({ file_id: c }, { signal: R }) {
          let f = getReplBridgeHandle() ?? getSdkHostedBridgeHandle(),
            of = A.of(n),
            clock = n.host.clock,
            monotonicNow = clock.monotonicNow();
          if (!f?.outboundOnly) {
            for (
              let remainingMs = of.remainingMs(monotonicNow);
              remainingMs > 0;
              remainingMs = of.remainingMs(monotonicNow)
            )
              (logForDebugging(
                `[bridge] inbox fetch: waiting ${Math.ceil(remainingMs)}ms after a read the service did not serve`,
              ),
                await sleep(remainingMs, R, { clock: clock, abortError: () => new AbortError() }),
                (monotonicNow = clock.monotonicNow()));
            f = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
          }
          let r;
          if (f?.outboundOnly)
            (logFeatureBad("bridge_inbox_fetch", "no_bridge"), (r = { ok: !1, reason: "no_bridge" }));
          else
            r = f
              ? await f.fetchInboxMessage(c)
              : await fetchSupervisedInboxMessage(c, { credentials: e, storageV5: s });
          if (r.ok || FetchInboxMessageTool.has(r.reason)) of.noteAnswered(monotonicNow);
          else if (r.reason === "request_failed" || r.reason === "http_error" || r.reason === "malformed")
            of.noteUnserved(monotonicNow, clock.monotonicNow());
          let O = sessionInboxPointers.peek(n)?.wasAnnouncedAsOwners(c) === !0;
          if ((sessionInboxPointers.peek(n)?.noteFetchAttempt(c, r, k), !r.ok))
            return {
              data: { ok: !1, file_id: c, reason: r.reason },
              ...(r.reason === "relogin" && {
                remedy: authExpiredBlockFor(await getClaudeAIOAuthTokenOriginAsync(e)),
              }),
            };
          let message = r.message,
            envelopedText = r.envelopedText;
          if (
            message.senderKind === "rc_owner" &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_star", !0) &&
            !O &&
            !l().some((d) => buildTranscriptEntries(d, c))
          ) {
            let { attachments: attachments, senderDisplay: senderDisplay, ...E } = message;
            ((message = { ...E, senderKind: "unknown" }),
              (envelopedText = renderInboxContentEnvelope(message)),
              logForDebugging(
                "[bridge] inbox fetch: the message says it is the owner's, but no server notice announced its file_id to this session as the owner's; read as third-party",
                { level: "warn" },
              ),
              logEvent("tengu_inbox_owner_kind_unannounced", {}));
          }
          let y,
            S = message.attachments ?? [];
          if (S.length > 0) {
            let { resolveInboundAttachments: resolveInboundAttachments } =
                await import("./chunk-xth3wpgt.js"),
              { prefix: prefix } = await resolveInboundAttachments(S, !1, !1, s, e, r.download);
            ((y = prefix), (envelopedText = renderInboxContentEnvelope(message, y.trim())));
          }
          return {
            data: {
              ok: !0,
              file_id: c,
              message_id: message.messageId,
              enveloped_text: envelopedText,
              body: message.body,
              sender_display: message.senderDisplay,
              sender_kind: message.senderKind,
              source: message.source,
              slack_permalink: message.slackPermalink,
              received_at: message.createdAt,
              attachments_prefix: y,
            },
          };
        },
      };
    },
    extractSearchText(e) {
      if (!e.ok) return e.reason ?? "";
      return [
        inboxSenderProvenanceCaption(e.sender_kind),
        foldSenderDisplayBrackets(e.sender_display ?? "") || e.sender_kind,
        e.attachments_prefix,
        e.body,
        e.slack_permalink,
        e.received_at,
      ].filter(Boolean).join(`
`);
    },
  });
//@ chunk-psktkvhp.js:11598-11804 placement = buildTranscriptEntries (0.777)
function buildTranscriptEntries(e, s) {
  switch (e.type) {
    case "user":
      return mentionsInboxNoticeFile(e.origin, e.message.content, s);
    case "attachment":
      return (
        e.attachment.type === "queued_command" &&
        mentionsInboxNoticeFile(e.attachment.origin, e.attachment.prompt, s)
      );
    default:
      return !1;
  }
}
//@ chunk-psktkvhp.js:11804-11922 placement
function mentionsInboxNoticeFile(e, s, n) {
  return (typeof s === "string" ? [s] : s.flatMap((l) => (l.type === "text" ? [l.text] : []))).some(
    (l) => ownerInboxNoticeFileId(e, l) === n,
  );
}
