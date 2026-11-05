/**
 * utils/teleport/handoffRelay.ts
 *
 * 2.1.316 新增：teleport 交接中继。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b392dec4.js (6)
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

//@ chunk-b392dec4.js:13117-13768 placement
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
  let markerCheck = validateMarkerLine(relayMarker, carried, conversation);
  if (!markerCheck.ok) {
    takeOpenRelayBootVerdict();
    logRelayArmRefused(markerCheck.code, markerCheck.reason, turnKind);
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
      content: markerCheck.content,
      level: "info",
      timestamp: new Date().toISOString(),
      uuid: markerCheck.uuid,
    },
  };
}
//@ chunk-b392dec4.js:13768-13806 placement
function beginMarkerLineWrite() {
  oweRelayThinkingStrip();
  noteHandoffMarkerStep("write_begun");
}
//@ chunk-b392dec4.js:13806-14323 placement
function armRelayFromStoredHandoff(marker, liveMessages, handoffKind) {
  let teleportRelayEnvConfig = getTeleportRelayEnvConfig();
  if (!teleportRelayEnvConfig || !isRelayBootVerdictOpen()) {
    noteHandoffMarkerStep("not_awaiting_handoff_at_arm");
    logForDebugging(
      "relay not armed from the handed-off turn: no start-up of the relay is waiting for it any more",
    );
    return;
  }
  takeOpenRelayBootVerdict();
  let armResult;
  try {
    armResult = armRelayFromMarker({
      markerLineUuid: marker.uuid,
      markerContent: marker.content,
      liveMessages,
      ingressOrigin: teleportRelayEnvConfig.ingressOrigin,
      remoteSessionId: teleportRelayEnvConfig.remoteSessionId,
    });
  } catch (error) {
    logRelayArmRefused("boot_failed", "the arm threw", handoffKind);
    throw error;
  }
  if (!armResult.armed) {
    logRelayArmRefused(armResult.code, armResult.reason, handoffKind);
    return;
  }
  logFeatureOk("upgrade_teleport_cache");
  recordTeleportArmVerdict({
    outcome: "armed",
    handoff_kind: handoffKind,
  });
  noteHandoffMarkerStep("verdict_logged");
}
//@ chunk-b392dec4.js:14323-14670 placement
function noteHandoffMarkerFate(handoffKind, turnOutcome) {
  let step = takeHandoffMarkerStep();
  let { status } = getTeleportCacheState();
  if (step === "verdict_logged" || step === "relay_on" || status === "active") return;
  logForDiagnosticsNoPII("warn", "cli_teleport_handoff_marker_unused", {
    handoff_kind: handoffKind,
    reason:
      step === undefined
        ? "marker_not_checked"
        : step === "checking"
          ? "check_threw"
          : step === "planned"
            ? "checked_not_written"
            : step === "write_begun"
              ? "write_begun_not_armed"
              : step,
    relay_status: status,
    turn_outcome: turnOutcome,
  });
}
//@ chunk-b392dec4.js:14670-14845 placement
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
//@ chunk-b392dec4.js:14845-15378 placement
/**
 * 校验交接标记行：必须有独立 uuid 且内容可解析。
 */
function validateMarkerLine(marker, carried, conversation) {
  let markerUuid = marker === "malformed" ? null : normalizeUuidOrNull(marker.uuid);
  if (
    marker === "malformed" ||
    markerUuid === null ||
    [...carried, ...conversation].some((message) => message.uuid === markerUuid)
  )
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
  let firstCarried = carried[0];
  if (firstCarried?.type !== "user" || firstCarried.uuid !== relayMarker.marker.anchor_line_uuid)
    return {
      ok: false,
      code: "anchor_not_in_view",
      reason: "the marker's anchor is not the user message the carried lines start with",
    };
  return {
    ok: true,
    uuid: markerUuid,
    content: marker.content,
  };
}
export { armRelayFromStoredHandoff, beginMarkerLineWrite, noteHandoffMarkerFate, planRelayFromHandoff };
