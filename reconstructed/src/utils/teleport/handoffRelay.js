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
import { normalizeUuidOrNull } from "../agentId.js";

//@ chunk-z6qazjbc.js:11969-12620 placement
function planRelayFromHandoff({
  relayMarker,
  carried,
  conversation,
  persistSession,
  storeConfirms,
  turnKind,
}) {
  noteHandoffMarkerStep("checking");
  let { status } = getTeleportCacheState();
  let handoffMarkerStep = !getTeleportRelayEnvConfig()
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
                : undefined;
  if (handoffMarkerStep !== undefined) {
    noteHandoffMarkerStep(handoffMarkerStep);
    logForDebugging(`relay marker on the handed-off turn not used: ${handoffMarkerStep}`);
    return {
      arm: false,
    };
  }
  let d = validateMarkerLine(relayMarker, carried, conversation);
  if (!d.ok) {
    takeOpenRelayBootVerdict();
    logRelayArmRefused(d.code, d.reason, turnKind);
    return {
      arm: false,
    };
  }
  noteHandoffMarkerStep("planned");
  return {
    arm: true,
    markerLine: {
      type: "system",
      subtype: UPGRADE_RELAY_MARKER,
      content: d.content,
      level: "info",
      timestamp: new Date().toISOString(),
      uuid: d.uuid,
    },
  };
}
//@ chunk-z6qazjbc.js:12620-12658 placement
function beginMarkerLineWrite() {
  oweRelayThinkingStrip();
  noteHandoffMarkerStep("write_begun");
}
//@ chunk-z6qazjbc.js:12658-13175 placement
function armRelayFromStoredHandoff(r, liveMessages, handoffKind) {
  let teleportRelayEnvConfig = getTeleportRelayEnvConfig();
  if (!teleportRelayEnvConfig || !isRelayBootVerdictOpen()) {
    noteHandoffMarkerStep("not_awaiting_handoff_at_arm");
    logForDebugging(
      "relay not armed from the handed-off turn: no start-up of the relay is waiting for it any more",
    );
    return;
  }
  takeOpenRelayBootVerdict();
  let a;
  try {
    a = armRelayFromMarker({
      markerLineUuid: r.uuid,
      markerContent: r.content,
      liveMessages,
      ingressOrigin: teleportRelayEnvConfig.ingressOrigin,
      remoteSessionId: teleportRelayEnvConfig.remoteSessionId,
    });
  } catch (error) {
    logRelayArmRefused("boot_failed", "the arm threw", handoffKind);
    throw error;
  }
  if (!a.armed) {
    logRelayArmRefused(a.code, a.reason, handoffKind);
    return;
  }
  logFeatureOk("upgrade_teleport_cache");
  recordTeleportArmVerdict({
    outcome: "armed",
    handoff_kind: handoffKind,
  });
  noteHandoffMarkerStep("verdict_logged");
}
//@ chunk-z6qazjbc.js:13175-13522 placement
function noteHandoffMarkerFate(handoffKind, turnOutcome) {
  let e = takeHandoffMarkerStep();
  let { status } = getTeleportCacheState();
  if (e === "verdict_logged" || e === "relay_on" || status === "active") return;
  logForDiagnosticsNoPII("warn", "cli_teleport_handoff_marker_unused", {
    handoff_kind: handoffKind,
    reason:
      e === undefined
        ? "marker_not_checked"
        : e === "checking"
          ? "check_threw"
          : e === "planned"
            ? "checked_not_written"
            : e === "write_begun"
              ? "write_begun_not_armed"
              : e,
    relay_status: status,
    turn_outcome: turnOutcome,
  });
}
//@ chunk-z6qazjbc.js:13522-13697 placement
function logRelayArmRefused(code, reason, handoffKind) {
  logFeatureSad("upgrade_teleport_cache", code);
  recordTeleportArmVerdict({
    outcome: "refused",
    error_code: code,
    handoff_kind: handoffKind,
  });
  noteHandoffMarkerStep("verdict_logged");
  logForDebugging(`relay not armed from the handed-off turn: ${reason}`);
}
//@ chunk-z6qazjbc.js:13697-14230 placement
/**
 * 校验交接标记行：必须有独立 uuid 且内容可解析。
 */
function validateMarkerLine(marker, carried, conversation) {
  let n = marker === "malformed" ? null : normalizeUuidOrNull(marker.uuid);
  if (marker === "malformed" || n === null || [...carried, ...conversation].some((s) => s.uuid === n))
    return {
      ok: false,
      code: "marker_line_shape",
      reason: "the member is not a marker line with a uuid of its own",
    };
  let relayMarker = parseRelayMarker(marker.content);
  if (!relayMarker.ok)
    return {
      ok: false,
      code: "marker_refused",
      reason: relayMarker.reason,
    };
  let i = carried[0];
  if (i?.type !== "user" || i.uuid !== relayMarker.marker.anchor_line_uuid)
    return {
      ok: false,
      code: "anchor_not_in_view",
      reason: "the marker's anchor is not the user message the carried lines start with",
    };
  return {
    ok: true,
    uuid: n,
    content: marker.content,
  };
}
