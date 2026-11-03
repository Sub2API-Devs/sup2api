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
import { hu } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-18hwfzwa.js:354486-354793 placement
var peerInboundApprovalDialogDef = withHideWhile({
  kind: "peer_inbound_approval",
  payload: DoctorLazy(() =>
    hu((h) => typeof h === "object" && h !== null && "holdCause" in h && "preview" in h),
  ),
  result: DoctorLazy(() =>
    hu(
      (h) =>
        typeof h === "object" &&
        h !== null &&
        "behavior" in h &&
        (h.behavior === "approve" || h.behavior === "deny" || h.behavior === "cancelled"),
    ),
  ),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-18hwfzwa.js:354793-358069 placement
/**
 * 跨会话入站消息审核：crossSessionInbound=hold 或权限模式不匹配时，把其他 Claude 会话发来的消息暂存，弹出 peer_inbound_approval 对话框，批准后投递、拒绝则告知发送方。
 */
function HeldPeerMessages({ clock, store, transcript, requestDialog, visibleDialog }) {
  let ke = () => visibleDialog.get() !== peerInboundApprovalDialogDef.kind;
  let Re = new Map();
  let Be = (At, It) => {
    let Ot = Re.get(At);
    if (!Ot) return;
    Ot.superseded = true;
    Ot.clearDeadline();
    Ot.abort.abort(It);
    Re.delete(At);
  };
  setOnPeerHeld((At, It, Ot) => {
    Be(At, "superseded");
    let Et = describePeerSender(At);
    let Dt = Et.claimedName ? ` (peer claims name: ${Et.claimedName})` : "";
    let Lt = Et.verifiedPeerPid ? ` [verified pid ${Et.verifiedPeerPid}]` : "";
    transcript.apply({
      type: "append",
      messages: [
        createSystemMessage(
          `Held peer message \u2014 from ${Et.address}${Lt}${Dt}${Et.preview || Et.previewSummary ? `; preview: \xAB${Et.preview}\xBB${Et.previewSummary}` : ""} \u2014 not delivered to Claude (${It} held). ${peerHoldReasonText(Ot)}`,
          "warning",
        ),
      ],
    });
    if (requestDialog && (Ot === "mode-mismatch" || Ot === "no-mode-asserted")) {
      let abortController = new AbortController();
      let Xt = false;
      let userDialogTimeoutMs = getUserDialogTimeoutMs();
      let so = null;
      let po = () => {
        if (userDialogTimeoutMs <= 0) return;
        so = clock.setTimeout(() => {
          if (isUnattendedBgSession() || ke()) {
            po();
            return;
          }
          refreshAndReevaluateHeld("policy-accepts");
          if (ao.superseded) return;
          Xt = true;
          abortController.abort("expired");
        }, userDialogTimeoutMs);
      };
      let ao = {
        abort: abortController,
        clearDeadline: () => {
          so?.();
          so = null;
        },
        rearmDeadline: () => {
          so?.();
          so = null;
          po();
        },
        superseded: false,
      };
      Re.set(At, ao);
      po();
      requestDialog(
        peerInboundApprovalDialogDef,
        {
          fromAddress: Et.address === "an unidentified session" ? undefined : Et.address,
          claimedName: Et.claimedName || undefined,
          verifiedPeerPid: Et.verifiedPeerPid,
          holdCause: Ot,
          preview: Et.dialogBody,
        },
        {
          signal: abortController.signal,
          place: "under",
        },
      )
        .then((co) => {
          ao.clearDeadline();
          if (ao.superseded) return;
          Re.delete(At);
          let bo =
            co.behavior === "cancelled"
              ? resolveHeldMessage(At, Xt ? "cancelled" : "deny")
              : resolveHeldMessage(At, co.behavior);
          if (bo === "dropped" && co.behavior === "approve")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  "That held message was NOT delivered: cross-session messaging was turned off (or set to refuse) while the prompt was open, so your approval could not apply \u2014 it was dropped.",
                  "warning",
                ),
              ],
            });
          if (bo === "dropped-by-guard")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  "That held message was NOT delivered: this session's inbox guard (per-sender rate limit or queue capacity) had no room for it when you approved, so it was dropped. A sending Claude Code session on this machine is normally told it was dropped; if the message mattered, ask the sender to send it again later.",
                  "warning",
                ),
              ],
            });
          if (bo === "gone" && co.behavior !== "cancelled")
            transcript.apply({
              type: "append",
              messages: [
                createSystemMessage(
                  `That held message was already resolved before your ${co.behavior === "approve" ? "approval" : "denial"} (released or dropped by a mode/setting change) \u2014 no action taken.`,
                  "warning",
                ),
              ],
            });
        })
        .catch(() => {
          ao.clearDeadline();
          if (ao.superseded) return;
          Re.delete(At);
          resolveHeldMessage(At, Xt ? "cancelled" : "deny");
        });
    }
  });
  setOnPeerHoldDropped((At) => {
    Be(At, "dropped");
  });
  let He = isUnattendedBgSession();
  let We = onAttacherCapsChange(() => {
    let At = isUnattendedBgSession();
    if (He && !At) for (let It of Re.values()) It.rearmDeadline();
    He = At;
  });
  setOnPeerHoldReleased((At, It) => {
    for (let Ot of At) Be(Ot, "released");
    transcript.apply({
      type: "append",
      messages: [
        createSystemMessage(
          `Released ${At.length} held cross-session ${plural(At.length, "message")} to Claude's queue (${peerHoldReleaseReason(It)}).`,
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
  let ze = settingsChangeDetector.subscribe(() => {
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
  let rt = ke();
  let dependencyWatcher_2 = createDependencyWatcher(
    [visibleDialog],
    () => [ke()],
    (At) => {
      if (rt && !At) for (let It of Re.values()) It.rearmDeadline();
      rt = At;
    },
  );
  return () => {
    dependencyWatcher_2();
    dependencyWatcher();
    ze();
    setInboundModeGetter(null);
    setOnPeerHeld(null);
    setOnPeerHoldReleased(null);
    setOnPeerHoldDropped(null);
    We();
  };
}
//@ chunk-18hwfzwa.js:358069-358141 placement
var regExp = new RegExp(`[\\p{Ps}\\p{Pe}\\p{Pi}\\p{Pf}"'\u2212${BOX_DRAWING_RANGES_2}]`, "gu");
//@ chunk-18hwfzwa.js:358141-358227 placement
function sanitizePeerDisplayLabel(h) {
  return normalizeForDisplay(h)
    .replace(regExp, "")
    .replace(/\p{Pd}/gu, (x) => (x === "-" ? "-" : ""));
}
//@ chunk-18hwfzwa.js:358227-359449 placement
function describePeerSender(h) {
  let origin = h.origin?.kind === "peer" ? h.origin : undefined;
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
  let ke =
    typeof origin?.body === "string"
      ? origin.body
      : typeof h.value === "string"
        ? h.value
        : Array.isArray(h.value) && h.value.length > 0
          ? `Unpreviewable content: ${h.value.length} ${plural(h.value.length, "block")}, ~${jsonStringify(h.value).length} chars. The FULL content is delivered on approve`
          : "";
  let Re =
    ke.length > 0
      ? ke.split(`
`)
      : [];
  let mapped = Re.map((Xt) => sanitizePeerDisplayLabel(Xt));
  let He = mapped.length;
  let We = ke.length;
  let any = Re.some((Xt, io) => mapped[io] !== Xt);
  let Xe = mapped.map((Xt) => Xt.replace(/\s+/g, " ").trim()).find((Xt) => Xt !== "") ?? "";
  let rt = truncateToWidthNoEllipsis(truncateToLength(Xe, MAX_ADDRESS_TEXT_CHARS), MAX_PEER_LABEL_WIDTH);
  let kt = He > 1 || any || rt !== Xe;
  let preview = rt;
  let previewSummary = kt
    ? ` \u2026[${He} ${plural(He, "line")}, ${We} chars total \u2014 expand to review before approving]`
    : "";
  let Ot = 8;
  let Et = 72;
  let mapped_2 = mapped.slice(0, 8).map((Xt) => truncateToWidthNoEllipsis(truncateToLength(Xt, 240), 72));
  let Lt = He > 8 || any || mapped_2.some((Xt, io) => Xt !== mapped[io]);
  let dialogBody =
    mapped_2.join(`
`) +
    (Lt
      ? `
\u2026[${He} ${plural(He, "line")}, ${We} chars total \u2014 full body will be delivered on approve]`
      : "");
  return {
    address,
    verifiedPeerPid,
    claimedName,
    preview,
    previewSummary,
    dialogBody,
  };
}
//@ chunk-18hwfzwa.js:359449-359635 placement
function peerHoldReleaseReason(h) {
  switch (h) {
    case "mode-changed":
      return "permissions are prompting again";
    case "policy-accepts":
      return "crossSessionInbound now accepts";
    case "approved":
      return "you approved it";
  }
}
//@ chunk-18hwfzwa.js:359635-360893 placement
function peerHoldReasonText(h) {
  switch (h) {
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
