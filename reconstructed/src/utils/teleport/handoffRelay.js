/**
 * utils/teleport/handoffRelay.ts
 *
 * 2.1.316 新增：teleport 交接中继。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z6qazjbc.js (6)
 * attribution: placement 6
 */
import {
  noteHandoffMarkerStep,
  getTeleportCacheState,
  isRelayBootVerdictOpen,
  isRelayThinkingStripOwed,
  takeOpenRelayBootVerdict,
  oweRelayThinkingStrip,
  takeHandoffMarkerStep,
} from "../../services/teleport/relayState.js";
import { getTeleportRelayEnvConfig } from "./relayEnv.js";
import { isRealAssistantMessage } from "../messages/messagePredicates.js";
import { logForDebugging } from "../debug.js";
import { UPGRADE_RELAY_MARKER, parseRelayMarker } from "../../services/teleport/relayMarker.js";
import { armRelayFromMarker, recordTeleportArmVerdict } from "../../services/teleport/armRelay.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { Vt } from "../agentId.js";

//@ chunk-z6qazjbc.js:11969-12620 placement
function planRelayFromHandoff({
  relayMarker: relayMarker,
  carried: carried,
  conversation: conversation,
  persistSession: persistSession,
  storeConfirms: storeConfirms,
  turnKind: turnKind,
}) {
  noteHandoffMarkerStep("checking");
  let { status: status } = getTeleportCacheState(),
    u = !getTeleportRelayEnvConfig()
      ? "relay_not_configured"
      : status === "active"
        ? "relay_on"
        : status !== "inactive"
          ? "relay_ended"
          : !isRelayBootVerdictOpen()
            ? "not_awaiting_handoff"
            : isRelayThinkingStripOwed()
              ? "thinking_strip_owed"
              : !persistSession || !storeConfirms
                ? "write_unconfirmable"
                : conversation.some(isRealAssistantMessage)
                  ? "own_turn_answered"
                  : void 0;
  if (u !== void 0)
    return (
      noteHandoffMarkerStep(u),
      logForDebugging(`relay marker on the handed-off turn not used: ${u}`),
      { arm: !1 }
    );
  let d = validateMarkerLine(relayMarker, carried, conversation);
  if (!d.ok) return (takeOpenRelayBootVerdict(), logRelayArmRefused(d.code, d.reason, turnKind), { arm: !1 });
  return (
    noteHandoffMarkerStep("planned"),
    {
      arm: !0,
      markerLine: {
        type: "system",
        subtype: UPGRADE_RELAY_MARKER,
        content: d.content,
        level: "info",
        timestamp: new Date().toISOString(),
        uuid: d.uuid,
      },
    }
  );
}
//@ chunk-z6qazjbc.js:12620-12658 placement
function beginMarkerLineWrite() {
  (oweRelayThinkingStrip(), noteHandoffMarkerStep("write_begun"));
}
//@ chunk-z6qazjbc.js:12658-13175 placement
function armRelayFromStoredHandoff(r, o, e) {
  let n = getTeleportRelayEnvConfig();
  if (!n || !isRelayBootVerdictOpen()) {
    (noteHandoffMarkerStep("not_awaiting_handoff_at_arm"),
      logForDebugging(
        "relay not armed from the handed-off turn: no start-up of the relay is waiting for it any more",
      ));
    return;
  }
  takeOpenRelayBootVerdict();
  let a;
  try {
    a = armRelayFromMarker({
      markerLineUuid: r.uuid,
      markerContent: r.content,
      liveMessages: o,
      ingressOrigin: n.ingressOrigin,
      remoteSessionId: n.remoteSessionId,
    });
  } catch (error) {
    throw (logRelayArmRefused("boot_failed", "the arm threw", e), error);
  }
  if (!a.armed) {
    logRelayArmRefused(a.code, a.reason, e);
    return;
  }
  (logFeatureOk("upgrade_teleport_cache"),
    recordTeleportArmVerdict({ outcome: "armed", handoff_kind: e }),
    noteHandoffMarkerStep("verdict_logged"));
}
//@ chunk-z6qazjbc.js:13175-13522 placement
function noteHandoffMarkerFate(r, o) {
  let e = takeHandoffMarkerStep(),
    { status: status } = getTeleportCacheState();
  if (e === "verdict_logged" || e === "relay_on" || status === "active") return;
  logForDiagnosticsNoPII("warn", "cli_teleport_handoff_marker_unused", {
    handoff_kind: r,
    reason:
      e === void 0
        ? "marker_not_checked"
        : e === "checking"
          ? "check_threw"
          : e === "planned"
            ? "checked_not_written"
            : e === "write_begun"
              ? "write_begun_not_armed"
              : e,
    relay_status: status,
    turn_outcome: o,
  });
}
//@ chunk-z6qazjbc.js:13522-13697 placement
function logRelayArmRefused(r, o, e) {
  (logFeatureSad("upgrade_teleport_cache", r),
    recordTeleportArmVerdict({ outcome: "refused", error_code: r, handoff_kind: e }),
    noteHandoffMarkerStep("verdict_logged"),
    logForDebugging(`relay not armed from the handed-off turn: ${o}`));
}
/**
 * 校验交接标记行：必须有独立 uuid 且内容可解析。
 */
//@ chunk-z6qazjbc.js:13697-14230 placement
function validateMarkerLine(marker, o, e) {
  let n = marker === "malformed" ? null : Vt(marker.uuid);
  if (marker === "malformed" || n === null || [...o, ...e].some((s) => s.uuid === n))
    return {
      ok: !1,
      code: "marker_line_shape",
      reason: "the member is not a marker line with a uuid of its own",
    };
  let a = parseRelayMarker(marker.content);
  if (!a.ok) return { ok: !1, code: "marker_refused", reason: a.reason };
  let i = o[0];
  if (i?.type !== "user" || i.uuid !== a.marker.anchor_line_uuid)
    return {
      ok: !1,
      code: "anchor_not_in_view",
      reason: "the marker's anchor is not the user message the carried lines start with",
    };
  return { ok: !0, uuid: n, content: marker.content };
}
