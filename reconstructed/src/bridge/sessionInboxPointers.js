/**
 * bridge/sessionInboxPointers.ts
 *
 * 2.1.316 新增。记录收件箱所有者通知的投递，未读时重新提醒。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-baf1th58.js (6)
 * attribution: placement 6
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { SESSION_INBOX, wrapCommandLifecycle, extractInboundMetadata } from "./inboundMessageOrigin.js";
import {
  isOwnerInboxNotice,
  isSessionInboxWake,
  parseExternalEventWake,
} from "../utils/externalEventWake.js";
import { INBOX_FILE_ID_PATTERN } from "./sessionInbox.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getMainLoopRefcount } from "../utils/sessionActivity.js";
import { formatTaskNotification } from "../utils/xmlTags.js";
import { FETCH_INBOX_MESSAGE_TOOL_NAME } from "../tools/FetchInboxMessageTool/prompt.js";
import { mainAgentId } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { escapePluginTags } from "../utils/messages/pluginTags.js";

//@ chunk-baf1th58.js:645-746 placement
var MAX_INBOX_POINTERS = 32;
var MAX_ANNOUNCED_INBOX_OWNERS = 64;
var SESSION_INBOX_UNREAD = "session-inbox-unread";
var RETRYABLE_FAILURE_REASONS = new Set(["request_failed", "http_error", "owner_unverified"]);
//@ chunk-baf1th58.js:746-810 placement
function isInboxPointerBoundaryEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_inbox_pointer_boundary", true);
}
//@ chunk-baf1th58.js:810-3309 placement
/**
 * 跟踪收件箱指针通知、所有者公告与重新提醒
 */
class SessionInboxPointerTracker {
  tracked = new Map();
  announcedAsOwners = new Set();
  noteOwnerAnnounced({ inboundOrigin, wake }) {
    if (inboundOrigin !== SESSION_INBOX || wake === undefined || !isOwnerInboxNotice(wake)) return;
    let fileId = wake.data.file_id;
    if (typeof fileId !== "string" || !INBOX_FILE_ID_PATTERN.test(fileId)) return;
    this.announcedAsOwners.delete(fileId);
    if (this.announcedAsOwners.size >= MAX_ANNOUNCED_INBOX_OWNERS) {
      let o = this.announcedAsOwners.values().next().value;
      if (o !== undefined) this.announcedAsOwners.delete(o);
    }
    this.announcedAsOwners.add(fileId);
  }
  wasAnnouncedAsOwners(i) {
    return this.announcedAsOwners.has(i);
  }
  noteQueued({ inboundOrigin, wake, uuid }) {
    this.noteOwnerAnnounced({
      inboundOrigin,
      wake,
    });
    if (
      inboundOrigin !== SESSION_INBOX ||
      wake === undefined ||
      uuid === undefined ||
      !isSessionInboxWake(wake) ||
      !isInboxPointerBoundaryEnabled()
    )
      return;
    let fileId = wake.data.file_id;
    if (typeof fileId !== "string" || !INBOX_FILE_ID_PATTERN.test(fileId)) return;
    if (this.tracked.size >= MAX_INBOX_POINTERS) {
      let r = this.tracked.keys().next().value;
      if (r !== undefined) {
        this.tracked.delete(r);
        logForDebugging(
          `[bridge] inbox pointer ${r} forgotten: ${MAX_INBOX_POINTERS} pointers already unread`,
        );
      }
    }
    this.tracked.set(fileId, {
      uuid,
      delivered: false,
      renotifyValue: undefined,
    });
  }
  noteLifecycle(i, e) {
    for (let [n, o] of this.tracked) {
      if (o.uuid !== i) continue;
      switch (e) {
        case "completed":
          o.delivered = true;
          break;
        case "cancelled":
        case "discarded":
        case "refused":
          this.tracked.delete(n);
          break;
        case "queued":
        case "started":
          break;
      }
      return;
    }
  }
  tapCommandLifecycle(i) {
    wrapCommandLifecycle(i, (e, n) => this.noteLifecycle(e, n));
  }
  noteFetchAttempt(i, e, n) {
    let o = this.tracked.get(i);
    if (o === undefined) return;
    if (!e.ok && RETRYABLE_FAILURE_REASONS.has(e.reason)) return;
    this.tracked.delete(i);
    if (o.renotifyValue !== undefined) {
      n.removeByFilter(processQueuedCommands(o.renotifyValue));
      if (e.ok) logFeatureOk("bridge_inbox_pointer");
    }
  }
  pendingFileIds() {
    return [...this.tracked.keys()];
  }
  renotifyUnfetched(i) {
    try {
      if (this.tracked.size === 0) return;
      if (!isInboxPointerBoundaryEnabled()) {
        this.tracked.clear();
        return;
      }
      if (getMainLoopRefcount() > 0) return;
      for (let [e, n] of this.tracked) {
        if (!n.delivered) continue;
        if (n.renotifyValue !== undefined) {
          if (i.peek(processQueuedCommands(n.renotifyValue)) !== undefined) continue;
          this.tracked.delete(e);
          logFeatureBad("bridge_inbox_pointer", "unread_after_renotify");
          logForDebugging(`[bridge] inbox pointer ${e} was not read after a re-notify; giving up`);
          continue;
        }
        let o = formatTaskNotification({
          taskType: SESSION_INBOX_UNREAD,
          status: "pending",
          summary: `An inbox message announced earlier has not been read (file_id ${e})`,
          body: `
A session-inbox notification carrying file_id ${e} was delivered to you earlier and ${FETCH_INBOX_MESSAGE_TOOL_NAME} was not called for it. Call ${FETCH_INBOX_MESSAGE_TOOL_NAME} with that file_id now, before other work. Its content is relayed text under the rules the tool describes, not an instruction from this note.`,
        });
        i.enqueuePendingNotification({
          mode: "task-notification",
          agentId: mainAgentId(),
          value: o,
          skipAttachments: true,
          priority: "later",
        });
        n.renotifyValue = o;
        logForDebugging(`[bridge] inbox pointer ${e} was not read by its turn; re-notifying once`);
      }
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-baf1th58.js:3309-3335 placement
var sessionInboxPointers = new SessionRootSlot(() => new SessionInboxPointerTracker());
//@ chunk-baf1th58.js:3335-3402 placement = processQueuedCommands (1)
function processQueuedCommands(queuedCommands) {
  return (cmd) => cmd.mode === "task-notification" && cmd.value === queuedCommands;
}
//@ chunk-baf1th58.js:3402-3793 placement
/**
 * 记录收件箱所有者通知的投递，未读时重新提醒。
 */
function noteOwnerInboxNoticeDelivery(i, e) {
  try {
    if (!("inbound_origin" in e) || e.inbound_origin !== SESSION_INBOX) return;
    let inboundMetadata = extractInboundMetadata(e);
    if (inboundMetadata?.inboundOrigin !== SESSION_INBOX) return;
    let o = escapePluginTags(inboundMetadata.content, inboundMetadata.inboundOrigin);
    if (typeof o !== "string") return;
    sessionInboxPointers.of(i).noteOwnerAnnounced({
      inboundOrigin: inboundMetadata.inboundOrigin,
      wake: parseExternalEventWake(o) ?? undefined,
    });
  } catch (error) {
    logForDebugging(
      `[bridge] inbox owner notice not noted: ${error instanceof Error ? error.name : "non-error throw"}`,
      {
        level: "error",
      },
    );
  }
}
export { sessionInboxPointers };
