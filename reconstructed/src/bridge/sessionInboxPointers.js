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
      let oldestFileId = this.announcedAsOwners.values().next().value;
      if (oldestFileId !== undefined) this.announcedAsOwners.delete(oldestFileId);
    }
    this.announcedAsOwners.add(fileId);
  }
  wasAnnouncedAsOwners(fileId) {
    return this.announcedAsOwners.has(fileId);
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
      let oldestFileId = this.tracked.keys().next().value;
      if (oldestFileId !== undefined) {
        this.tracked.delete(oldestFileId);
        logForDebugging(
          `[bridge] inbox pointer ${oldestFileId} forgotten: ${MAX_INBOX_POINTERS} pointers already unread`,
        );
      }
    }
    this.tracked.set(fileId, {
      uuid,
      delivered: false,
      renotifyValue: undefined,
    });
  }
  noteLifecycle(uuid, status) {
    for (let [fileId, pointer] of this.tracked) {
      if (pointer.uuid !== uuid) continue;
      switch (status) {
        case "completed":
          pointer.delivered = true;
          break;
        case "cancelled":
        case "discarded":
        case "refused":
          this.tracked.delete(fileId);
          break;
        case "queued":
        case "started":
          break;
      }
      return;
    }
  }
  tapCommandLifecycle(lifecycle) {
    wrapCommandLifecycle(lifecycle, (commandId, status) => this.noteLifecycle(commandId, status));
  }
  noteFetchAttempt(fileId, result, queue) {
    let pointer = this.tracked.get(fileId);
    if (pointer === undefined) return;
    if (!result.ok && RETRYABLE_FAILURE_REASONS.has(result.reason)) return;
    this.tracked.delete(fileId);
    if (pointer.renotifyValue !== undefined) {
      queue.removeByFilter(processQueuedCommands(pointer.renotifyValue));
      if (result.ok) logFeatureOk("bridge_inbox_pointer");
    }
  }
  pendingFileIds() {
    return [...this.tracked.keys()];
  }
  renotifyUnfetched(notifier) {
    try {
      if (this.tracked.size === 0) return;
      if (!isInboxPointerBoundaryEnabled()) {
        this.tracked.clear();
        return;
      }
      if (getMainLoopRefcount() > 0) return;
      for (let [fileId, pointer] of this.tracked) {
        if (!pointer.delivered) continue;
        if (pointer.renotifyValue !== undefined) {
          if (notifier.peek(processQueuedCommands(pointer.renotifyValue)) !== undefined) continue;
          this.tracked.delete(fileId);
          logFeatureBad("bridge_inbox_pointer", "unread_after_renotify");
          logForDebugging(`[bridge] inbox pointer ${fileId} was not read after a re-notify; giving up`);
          continue;
        }
        let notification = formatTaskNotification({
          taskType: SESSION_INBOX_UNREAD,
          status: "pending",
          summary: `An inbox message announced earlier has not been read (file_id ${fileId})`,
          body: `
A session-inbox notification carrying file_id ${fileId} was delivered to you earlier and ${FETCH_INBOX_MESSAGE_TOOL_NAME} was not called for it. Call ${FETCH_INBOX_MESSAGE_TOOL_NAME} with that file_id now, before other work. Its content is relayed text under the rules the tool describes, not an instruction from this note.`,
        });
        notifier.enqueuePendingNotification({
          mode: "task-notification",
          agentId: mainAgentId(),
          value: notification,
          skipAttachments: true,
          priority: "later",
        });
        pointer.renotifyValue = notification;
        logForDebugging(`[bridge] inbox pointer ${fileId} was not read by its turn; re-notifying once`);
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
function noteOwnerInboxNoticeDelivery(sessionId, queueItem) {
  try {
    if (!("inbound_origin" in queueItem) || queueItem.inbound_origin !== SESSION_INBOX) return;
    let inboundMetadata = extractInboundMetadata(queueItem);
    if (inboundMetadata?.inboundOrigin !== SESSION_INBOX) return;
    let content = escapePluginTags(inboundMetadata.content, inboundMetadata.inboundOrigin);
    if (typeof content !== "string") return;
    sessionInboxPointers.of(sessionId).noteOwnerAnnounced({
      inboundOrigin: inboundMetadata.inboundOrigin,
      wake: parseExternalEventWake(content) ?? undefined,
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
export { sessionInboxPointers, noteOwnerInboxNoticeDelivery };
