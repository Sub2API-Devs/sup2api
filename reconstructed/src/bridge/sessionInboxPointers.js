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
import { SESSION_INBOX, rPe, extractInboundMetadata } from "./inboundMessageOrigin.js";
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
var MAX_INBOX_POINTERS = 32,
  f = 64,
  SESSION_INBOX_UNREAD = "session-inbox-unread",
  RETRYABLE_FAILURE_REASONS = new Set(["request_failed", "http_error", "owner_unverified"]);
//@ chunk-baf1th58.js:746-810 placement
function a() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_inbox_pointer_boundary", !0);
}
/**
 * 跟踪收件箱指针通知、所有者公告与重新提醒
 */
//@ chunk-baf1th58.js:810-3309 placement
class SessionInboxPointerTracker {
  tracked = new Map();
  announcedAsOwners = new Set();
  noteOwnerAnnounced({ inboundOrigin: i, wake: e }) {
    if (i !== SESSION_INBOX || e === void 0 || !isOwnerInboxNotice(e)) return;
    let file_id = e.data.file_id;
    if (typeof file_id !== "string" || !INBOX_FILE_ID_PATTERN.test(file_id)) return;
    if ((this.announcedAsOwners.delete(file_id), this.announcedAsOwners.size >= f)) {
      let o = this.announcedAsOwners.values().next().value;
      if (o !== void 0) this.announcedAsOwners.delete(o);
    }
    this.announcedAsOwners.add(file_id);
  }
  wasAnnouncedAsOwners(i) {
    return this.announcedAsOwners.has(i);
  }
  noteQueued({ inboundOrigin: i, wake: e, uuid: n }) {
    if (
      (this.noteOwnerAnnounced({ inboundOrigin: i, wake: e }),
      i !== SESSION_INBOX || e === void 0 || n === void 0 || !isSessionInboxWake(e) || !a())
    )
      return;
    let file_id = e.data.file_id;
    if (typeof file_id !== "string" || !INBOX_FILE_ID_PATTERN.test(file_id)) return;
    if (this.tracked.size >= MAX_INBOX_POINTERS) {
      let r = this.tracked.keys().next().value;
      if (r !== void 0)
        (this.tracked.delete(r),
          logForDebugging(
            `[bridge] inbox pointer ${r} forgotten: ${MAX_INBOX_POINTERS} pointers already unread`,
          ));
    }
    this.tracked.set(file_id, { uuid: n, delivered: !1, renotifyValue: void 0 });
  }
  noteLifecycle(i, e) {
    for (let [n, o] of this.tracked) {
      if (o.uuid !== i) continue;
      switch (e) {
        case "completed":
          o.delivered = !0;
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
    rPe(i, (e, n) => this.noteLifecycle(e, n));
  }
  noteFetchAttempt(i, e, n) {
    let o = this.tracked.get(i);
    if (o === void 0) return;
    if (!e.ok && RETRYABLE_FAILURE_REASONS.has(e.reason)) return;
    if ((this.tracked.delete(i), o.renotifyValue !== void 0)) {
      if ((n.removeByFilter(processQueuedCommands(o.renotifyValue)), e.ok))
        logFeatureOk("bridge_inbox_pointer");
    }
  }
  pendingFileIds() {
    return [...this.tracked.keys()];
  }
  renotifyUnfetched(i) {
    try {
      if (this.tracked.size === 0) return;
      if (!a()) {
        this.tracked.clear();
        return;
      }
      if (getMainLoopRefcount() > 0) return;
      for (let [e, n] of this.tracked) {
        if (!n.delivered) continue;
        if (n.renotifyValue !== void 0) {
          if (i.peek(processQueuedCommands(n.renotifyValue)) !== void 0) continue;
          (this.tracked.delete(e),
            logFeatureBad("bridge_inbox_pointer", "unread_after_renotify"),
            logForDebugging(`[bridge] inbox pointer ${e} was not read after a re-notify; giving up`));
          continue;
        }
        let o = formatTaskNotification({
          taskType: SESSION_INBOX_UNREAD,
          status: "pending",
          summary: `An inbox message announced earlier has not been read (file_id ${e})`,
          body: `
A session-inbox notification carrying file_id ${e} was delivered to you earlier and ${FETCH_INBOX_MESSAGE_TOOL_NAME} was not called for it. Call ${FETCH_INBOX_MESSAGE_TOOL_NAME} with that file_id now, before other work. Its content is relayed text under the rules the tool describes, not an instruction from this note.`,
        });
        (i.enqueuePendingNotification({
          mode: "task-notification",
          agentId: mainAgentId(),
          value: o,
          skipAttachments: !0,
          priority: "later",
        }),
          (n.renotifyValue = o),
          logForDebugging(`[bridge] inbox pointer ${e} was not read by its turn; re-notifying once`));
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
/**
 * 记录收件箱所有者通知的投递，未读时重新提醒。
 */
//@ chunk-baf1th58.js:3402-3793 placement
function noteOwnerInboxNoticeDelivery(i, e) {
  try {
    if (!("inbound_origin" in e) || e.inbound_origin !== SESSION_INBOX) return;
    let n = extractInboundMetadata(e);
    if (n?.inboundOrigin !== SESSION_INBOX) return;
    let o = escapePluginTags(n.content, n.inboundOrigin);
    if (typeof o !== "string") return;
    sessionInboxPointers
      .of(i)
      .noteOwnerAnnounced({ inboundOrigin: n.inboundOrigin, wake: parseExternalEventWake(o) ?? void 0 });
  } catch (error) {
    logForDebugging(
      `[bridge] inbox owner notice not noted: ${error instanceof Error ? error.name : "non-error throw"}`,
      { level: "error" },
    );
  }
}

export { sessionInboxPointers };
