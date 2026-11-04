/**
 * utils/peerInbound/heldPeerMessages.ts
 *
 * 2.1.316 新增。暂存的同伴消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { custom } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  setOnPeerHeld,
  setOnPeerHoldDropped,
  setOnPeerHoldReleased,
  setInboundModeGetter,
} from "../crossSessionInbound/inboundMode.js";
import { createSystemMessage } from "../messages.js";
import { getUserDialogTimeoutMs } from "../../services/api/refusalFallback.js";
import { isUnattendedBgSession } from "../concurrentSessions.js";
import { refreshAndReevaluateHeld, resolveHeldMessage } from "../crossSessionInbound/inboundGate.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { plural, truncateToLength } from "../stringUtils.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { BOX_DRAWING_RANGES_2 } from "../sanitization.js";
import { normalizeForDisplay } from "../resultError.js";
import { isPeerAddress, MAX_PEER_LABEL_WIDTH } from "../peerMessageHeaders.js";
import { clipTeammateText, MAX_ADDRESS_TEXT_CHARS } from "../swarm/teammateIds.js";
import { jsonStringify } from "../slowOperations.js";
import { truncateToWidthNoEllipsis } from "../format.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:354486-354793 placement
var peerInboundApprovalDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:354486", () => {
  peerInboundApprovalDialogDef = withHideWhile({
    kind: "peer_inbound_approval",
    payload: DoctorLazy(() =>
      custom(
        (payload) =>
          typeof payload === "object" && payload !== null && "holdCause" in payload && "preview" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      custom(
        (result) =>
          typeof result === "object" &&
          result !== null &&
          "behavior" in result &&
          (result.behavior === "approve" || result.behavior === "deny" || result.behavior === "cancelled"),
      ),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-18hwfzwa.js:354793-358069 placement
/**
 * 跨会话入站消息审核：crossSessionInbound=hold 或权限模式不匹配时，把其他 Claude 会话发来的消息暂存，弹出 peer_inbound_approval 对话框，批准后投递、拒绝则告知发送方。
 */
function HeldPeerMessages({ clock, store, transcript, requestDialog, visibleDialog }) {
  let isDialogHidden = () => visibleDialog.get() !== peerInboundApprovalDialogDef.kind;
  let pendingByKey = new Map();
  let settlePending = (holdKey, reason) => {
    let pending = pendingByKey.get(holdKey);
    if (!pending) return;
    pending.superseded = true;
    pending.clearDeadline();
    pending.abort.abort(reason);
    pendingByKey.delete(holdKey);
  };
  setOnPeerHeld((holdKey, holdCause, cause) => {
    settlePending(holdKey, "superseded");
    let sender = describePeerSender(holdKey);
    let claimedNameSuffix = sender.claimedName ? ` (peer claims name: ${sender.claimedName})` : "";
    let pidSuffix = sender.verifiedPeerPid ? ` [verified pid ${sender.verifiedPeerPid}]` : "";
    transcript.apply({
      type: "append",
      messages: [
        createSystemMessage(
          `Held peer message \u2014 from ${sender.address}${pidSuffix}${claimedNameSuffix}${sender.preview || sender.previewSummary ? `; preview: \xAB${sender.preview}\xBB${sender.previewSummary}` : ""} \u2014 not delivered to Claude (${holdCause} held). ${peerHoldReasonText(cause)}`,
          "warning",
        ),
      ],
    });
    if (requestDialog && (cause === "mode-mismatch" || cause === "no-mode-asserted")) {
      let abortController = new AbortController();
      let expired = false;
      let userDialogTimeoutMs = getUserDialogTimeoutMs();
      let timer = null;
      let armDeadline = () => {
        if (userDialogTimeoutMs <= 0) return;
        timer = clock.setTimeout(() => {
          if (isUnattendedBgSession() || isDialogHidden()) {
            armDeadline();
            return;
          }
          refreshAndReevaluateHeld("policy-accepts");
          if (handle.superseded) return;
          expired = true;
          abortController.abort("expired");
        }, userDialogTimeoutMs);
      };
      let handle = {
        abort: abortController,
        clearDeadline: () => {
          timer?.();
          timer = null;
        },
        rearmDeadline: () => {
          timer?.();
          timer = null;
          armDeadline();
        },
        superseded: false,
      };
      pendingByKey.set(holdKey, handle);
      armDeadline();
      requestDialog(
        peerInboundApprovalDialogDef,
        {
          fromAddress: sender.address === "an unidentified session" ? undefined : sender.address,
          claimedName: sender.claimedName || undefined,
          verifiedPeerPid: sender.verifiedPeerPid,
          holdCause: cause,
          preview: sender.dialogBody,
        },
        {
          signal: abortController.signal,
          place: "under",
        },
      )
        .then((result) => {
          handle.clearDeadline();
          if (handle.superseded) return;
          pendingByKey.delete(holdKey);
          let outcome =
            result.behavior === "cancelled"
              ? resolveHeldMessage(holdKey, expired ? "cancelled" : "deny")
              : resolveHeldMessage(holdKey, result.behavior);
          if (outcome === "dropped" && result.behavior === "approve")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  "That held message was NOT delivered: cross-session messaging was turned off (or set to refuse) while the prompt was open, so your approval could not apply \u2014 it was dropped.",
                  "warning",
                ),
              ],
            });
          if (outcome === "dropped-by-guard")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  "That held message was NOT delivered: this session's inbox guard (per-sender rate limit or queue capacity) had no room for it when you approved, so it was dropped. A sending Claude Code session on this machine is normally told it was dropped; if the message mattered, ask the sender to send it again later.",
                  "warning",
                ),
              ],
            });
          if (outcome === "gone" && result.behavior !== "cancelled")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  `That held message was already resolved before your ${result.behavior === "approve" ? "approval" : "denial"} (released or dropped by a mode/setting change) \u2014 no action taken.`,
                  "warning",
                ),
              ],
            });
        })
        .catch(() => {
          handle.clearDeadline();
          if (handle.superseded) return;
          pendingByKey.delete(holdKey);
          resolveHeldMessage(holdKey, expired ? "cancelled" : "deny");
        });
    }
  });
  setOnPeerHoldDropped((releasedKey) => {
    settlePending(releasedKey, "dropped");
  });
  let wasUnattended = isUnattendedBgSession();
  let stopCapsWatch = onAttacherCapsChange(() => {
    let isUnattended = isUnattendedBgSession();
    if (wasUnattended && !isUnattended) for (let pending of pendingByKey.values()) pending.rearmDeadline();
    wasUnattended = isUnattended;
  });
  setOnPeerHoldReleased((releasedKeys, cause) => {
    for (let key of releasedKeys) settlePending(key, "released");
    transcript.apply({
      type: "append",
      messages: [
        createSystemMessage(
          `Released ${releasedKeys.length} held cross-session ${plural(releasedKeys.length, "message")} to Claude's queue (${peerHoldReleaseReason(cause)}).`,
          "warning",
        ),
      ],
    });
  });
  setInboundModeGetter(() => {
    let { mode, isBypassPermissionsModeAvailable } = store.getState().toolPermissionContext;
    return {
      mode,
      isBypassPermissionsModeAvailable,
    };
  });
  let unsubscribeSettings = settingsChangeDetector.subscribe(() => {
    refreshAndReevaluateHeld("policy-accepts");
  });
  let dependencyWatcher = createDependencyWatcher(
    [store],
    () => {
      let { mode, isBypassPermissionsModeAvailable } = store.getState().toolPermissionContext;
      return [mode, isBypassPermissionsModeAvailable];
    },
    () => {
      refreshAndReevaluateHeld("mode-changed");
    },
  );
  let wasDialogHidden = isDialogHidden();
  let dependencyWatcher_2 = createDependencyWatcher(
    [visibleDialog],
    () => [isDialogHidden()],
    (isHidden) => {
      if (wasDialogHidden && !isHidden) for (let pending of pendingByKey.values()) pending.rearmDeadline();
      wasDialogHidden = isHidden;
    },
  );
  return () => {
    dependencyWatcher_2();
    dependencyWatcher();
    unsubscribeSettings();
    setInboundModeGetter(null);
    setOnPeerHeld(null);
    setOnPeerHoldReleased(null);
    setOnPeerHoldDropped(null);
    stopCapsWatch();
  };
}
//@ chunk-18hwfzwa.js:358069-358141 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:358069", () => {
  regExp = new RegExp(`[\\p{Ps}\\p{Pe}\\p{Pi}\\p{Pf}"'\u2212${BOX_DRAWING_RANGES_2}]`, "gu");
});
//@ chunk-18hwfzwa.js:358141-358227 placement
function sanitizePeerDisplayLabel(label) {
  return normalizeForDisplay(label)
    .replace(regExp, "")
    .replace(/\p{Pd}/gu, (dash) => (dash === "-" ? "-" : ""));
}
//@ chunk-18hwfzwa.js:358227-359449 placement
function describePeerSender(message) {
  let origin = message.origin?.kind === "peer" ? message.origin : undefined;
  let address =
    typeof origin?.from === "string" && isPeerAddress(origin.from)
      ? sanitizePeerDisplayLabel(origin.from)
      : "an unidentified session";
  let verifiedPeerPid =
    typeof origin?.verifiedPeerPid === "number" &&
    Number.isInteger(origin.verifiedPeerPid) &&
    origin.verifiedPeerPid > 0
      ? origin.verifiedPeerPid
      : undefined;
  let claimedName =
    typeof origin?.name === "string" ? sanitizePeerDisplayLabel(clipTeammateText(origin.name)) : "";
  let bodyText =
    typeof origin?.body === "string"
      ? origin.body
      : typeof message.value === "string"
        ? message.value
        : Array.isArray(message.value) && message.value.length > 0
          ? `Unpreviewable content: ${message.value.length} ${plural(message.value.length, "block")}, ~${jsonStringify(message.value).length} chars. The FULL content is delivered on approve`
          : "";
  let lines =
    bodyText.length > 0
      ? bodyText.split(`
`)
      : [];
  let mapped = lines.map((line) => sanitizePeerDisplayLabel(line));
  let lineCount = mapped.length;
  let charCount = bodyText.length;
  let any = lines.some((line, index) => mapped[index] !== line);
  let firstLine =
    mapped.map((sanitized) => sanitized.replace(/\s+/g, " ").trim()).find((nonEmpty) => nonEmpty !== "") ??
    "";
  let preview = truncateToWidthNoEllipsis(
    truncateToLength(firstLine, MAX_ADDRESS_TEXT_CHARS),
    MAX_PEER_LABEL_WIDTH,
  );
  let isTruncated = lineCount > 1 || any || preview !== firstLine;
  let preview_2 = preview;
  let previewSummary = isTruncated
    ? ` \u2026[${lineCount} ${plural(lineCount, "line")}, ${charCount} chars total \u2014 expand to review before approving]`
    : "";
  let maxLines = 8;
  let maxWidth = 72;
  let mapped_2 = mapped.slice(0, 8).map((line) => truncateToWidthNoEllipsis(truncateToLength(line, 240), 72));
  let isDialogTruncated =
    lineCount > 8 || any || mapped_2.some((trimmed, index) => trimmed !== mapped[index]);
  let dialogBody =
    mapped_2.join(`
`) +
    (isDialogTruncated
      ? `
\u2026[${lineCount} ${plural(lineCount, "line")}, ${charCount} chars total \u2014 full body will be delivered on approve]`
      : "");
  return {
    address,
    verifiedPeerPid,
    claimedName,
    preview: preview_2,
    previewSummary,
    dialogBody,
  };
}
//@ chunk-18hwfzwa.js:359449-359635 placement
function peerHoldReleaseReason(releaseReason) {
  switch (releaseReason) {
    case "mode-changed":
      return "permissions are prompting again";
    case "policy-accepts":
      return "crossSessionInbound now accepts";
    case "approved":
      return "you approved it";
  }
}
//@ chunk-18hwfzwa.js:359635-360893 placement
function peerHoldReasonText(holdReason) {
  switch (holdReason) {
    case "bypass-default":
      return "It is being reviewed before delivery.";
    case "explicit-setting":
      return 'Your "crossSessionInbound" setting is "hold"; set it to "accept" to deliver held messages.';
    case "managed-setting":
      return `Your organization's managed settings set "crossSessionInbound" to "hold" (your own "accept" cannot override managed policy); ask your admin to change it.`;
    case "repo-setting":
      return `This repository's settings set "crossSessionInbound" to "hold" (a repo may only tighten, so your own "accept" cannot override it); remove the repo setting or exclude it with --setting-sources.`;
    case "invalid-setting":
      return 'A settings file has an unrecognized "crossSessionInbound" value (the settings warning names the file); messages are held while it is present \u2014 set it to "accept", "hold", or "refuse".';
    case "mode-unknown":
      return "It will be delivered once the session finishes starting up.";
    case "mode-mismatch":
      return `The sending session's permission mode class doesn't match this session's. Review it below, or set "crossSessionInbound" to "accept".`;
    case "no-mode-asserted":
      return 'The sender did not attest its permission mode and this session bypasses prompts. Review it below, or set "crossSessionInbound" to "accept".';
  }
}
export { HeldPeerMessages, peerInboundApprovalDialogDef };
