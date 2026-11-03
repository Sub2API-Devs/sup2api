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
import { xon, Ion, Oon, setInboundModeGetter } from "../crossSessionInbound/inboundMode.js";
import { createSystemMessage } from "../messages.js";
import { getUserDialogTimeoutMs } from "../../services/api/refusalFallback.js";
import { isUnattendedBgSession } from "../concurrentSessions.js";
import { _Le, resolveHeldMessage } from "../crossSessionInbound/inboundGate.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { plural, truncateToLength } from "../stringUtils.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { BOX_DRAWING_RANGES } from "../sanitization.js";
import { normalizeForDisplay } from "../resultError.js";
import { $ge, Sds } from "../peerMessageHeaders.js";
import { Hb, zoo } from "../swarm/teammateIds.js";
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
  default: { behavior: "cancelled" },
});
/**
 * 跨会话入站消息审核：crossSessionInbound=hold 或权限模式不匹配时，把其他 Claude 会话发来的消息暂存，弹出 peer_inbound_approval 对话框，批准后投递、拒绝则告知发送方。
 */
//@ chunk-18hwfzwa.js:354793-358069 placement
function HeldPeerMessages({
  clock: clock,
  store: store,
  transcript: transcript,
  requestDialog: requestDialog,
  visibleDialog: visibleDialog,
}) {
  let ke = () => visibleDialog.get() !== peerInboundApprovalDialogDef.kind,
    Re = new Map(),
    Be = (At, It) => {
      let Ot = Re.get(At);
      if (!Ot) return;
      ((Ot.superseded = !0), Ot.clearDeadline(), Ot.abort.abort(It), Re.delete(At));
    };
  (xon((At, It, Ot) => {
    Be(At, "superseded");
    let Et = describePeerSender(At),
      Dt = Et.claimedName ? ` (peer claims name: ${Et.claimedName})` : "",
      Lt = Et.verifiedPeerPid ? ` [verified pid ${Et.verifiedPeerPid}]` : "";
    if (
      (transcript.apply({
        type: "append",
        messages: [
          createSystemMessage(
            `Held peer message \u2014 from ${Et.address}${Lt}${Dt}${Et.preview || Et.previewSummary ? `; preview: \xAB${Et.preview}\xBB${Et.previewSummary}` : ""} \u2014 not delivered to Claude (${It} held). ${peerHoldReasonText(Ot)}`,
            "warning",
          ),
        ],
      }),
      requestDialog && (Ot === "mode-mismatch" || Ot === "no-mode-asserted"))
    ) {
      let abortController = new AbortController(),
        Xt = !1,
        io = getUserDialogTimeoutMs(),
        so = null,
        po = () => {
          if (io <= 0) return;
          so = clock.setTimeout(() => {
            if (isUnattendedBgSession() || ke()) {
              po();
              return;
            }
            if ((_Le("policy-accepts"), ao.superseded)) return;
            ((Xt = !0), abortController.abort("expired"));
          }, io);
        },
        ao = {
          abort: abortController,
          clearDeadline: () => {
            (so?.(), (so = null));
          },
          rearmDeadline: () => {
            (so?.(), (so = null), po());
          },
          superseded: !1,
        };
      (Re.set(At, ao),
        po(),
        requestDialog(
          peerInboundApprovalDialogDef,
          {
            fromAddress: Et.address === "an unidentified session" ? void 0 : Et.address,
            claimedName: Et.claimedName || void 0,
            verifiedPeerPid: Et.verifiedPeerPid,
            holdCause: Ot,
            preview: Et.dialogBody,
          },
          { signal: abortController.signal, place: "under" },
        )
          .then((co) => {
            if ((ao.clearDeadline(), ao.superseded)) return;
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
            if ((ao.clearDeadline(), ao.superseded)) return;
            (Re.delete(At), resolveHeldMessage(At, Xt ? "cancelled" : "deny"));
          }));
    }
  }),
    Ion((At) => {
      Be(At, "dropped");
    }));
  let He = isUnattendedBgSession(),
    We = onAttacherCapsChange(() => {
      let At = isUnattendedBgSession();
      if (He && !At) for (let It of Re.values()) It.rearmDeadline();
      He = At;
    });
  (Oon((At, It) => {
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
  }),
    setInboundModeGetter(() => {
      let { mode: mode, isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable } =
        store.getState().toolPermissionContext;
      return { mode: mode, isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable };
    }));
  let subscribe = settingsChangeDetector.subscribe(() => {
      _Le("policy-accepts");
    }),
    Xe = createDependencyWatcher(
      [store],
      () => {
        let { mode: mode, isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable } =
          store.getState().toolPermissionContext;
        return [mode, isBypassPermissionsModeAvailable];
      },
      () => {
        _Le("mode-changed");
      },
    ),
    rt = ke(),
    kt = createDependencyWatcher(
      [visibleDialog],
      () => [ke()],
      (At) => {
        if (rt && !At) for (let It of Re.values()) It.rearmDeadline();
        rt = At;
      },
    );
  return () => {
    (kt(), Xe(), subscribe(), setInboundModeGetter(null), xon(null), Oon(null), Ion(null), We());
  };
}
//@ chunk-18hwfzwa.js:358069-358141 placement
var regExp = new RegExp(`[\\p{Ps}\\p{Pe}\\p{Pi}\\p{Pf}"'\u2212${BOX_DRAWING_RANGES}]`, "gu");
//@ chunk-18hwfzwa.js:358141-358227 placement
function Uae(h) {
  return normalizeForDisplay(h)
    .replace(regExp, "")
    .replace(/\p{Pd}/gu, (x) => (x === "-" ? "-" : ""));
}
//@ chunk-18hwfzwa.js:358227-359449 placement
function describePeerSender(h) {
  let x = h.origin?.kind === "peer" ? h.origin : void 0,
    D = typeof x?.from === "string" && $ge(x.from) ? Uae(x.from) : "an unidentified session",
    L =
      typeof x?.verifiedPeerPid === "number" && Number.isInteger(x.verifiedPeerPid) && x.verifiedPeerPid > 0
        ? x.verifiedPeerPid
        : void 0,
    ee = typeof x?.name === "string" ? Uae(Hb(x.name)) : "",
    ke =
      typeof x?.body === "string"
        ? x.body
        : typeof h.value === "string"
          ? h.value
          : Array.isArray(h.value) && h.value.length > 0
            ? `Unpreviewable content: ${h.value.length} ${plural(h.value.length, "block")}, ~${jsonStringify(h.value).length} chars. The FULL content is delivered on approve`
            : "",
    Re =
      ke.length > 0
        ? ke.split(`
`)
        : [],
    mapped = Re.map((Xt) => Uae(Xt)),
    He = mapped.length,
    We = ke.length,
    any = Re.some((Xt, io) => mapped[io] !== Xt),
    Xe = mapped.map((Xt) => Xt.replace(/\s+/g, " ").trim()).find((Xt) => Xt !== "") ?? "",
    rt = truncateToWidthNoEllipsis(truncateToLength(Xe, zoo), Sds),
    kt = He > 1 || any || rt !== Xe,
    At = rt,
    It = kt
      ? ` \u2026[${He} ${plural(He, "line")}, ${We} chars total \u2014 expand to review before approving]`
      : "",
    Ot = 8,
    Et = 72,
    mapped_2 = mapped.slice(0, 8).map((Xt) => truncateToWidthNoEllipsis(truncateToLength(Xt, 240), 72)),
    Lt = He > 8 || any || mapped_2.some((Xt, io) => Xt !== mapped[io]),
    oo =
      mapped_2.join(`
`) +
      (Lt
        ? `
\u2026[${He} ${plural(He, "line")}, ${We} chars total \u2014 full body will be delivered on approve]`
        : "");
  return { address: D, verifiedPeerPid: L, claimedName: ee, preview: At, previewSummary: It, dialogBody: oo };
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
