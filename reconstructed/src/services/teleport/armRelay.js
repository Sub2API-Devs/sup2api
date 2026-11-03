/**
 * services/teleport/armRelay.ts
 *
 * 2.1.316 新增：teleport 中继准备
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rr1dnehg.js (9)
 * attribution: placement 9
 */
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import {
  SEED_LINE_SCHEMA,
  NOT_INACTIVE_RESULT,
  isUpgradeRelayMarker,
  parseRelayMarker,
} from "./relayMarker.js";
import {
  getTeleportCacheState,
  activateTeleportCache,
  noteRelayBootSettled,
  closeOpenRelayBootVerdict,
  holdRelayBootVerdictOpen,
} from "./relayState.js";
import { getThinkingStripFrom } from "../../utils/messages.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  teleportRelayCarrierPresent,
  getTeleportRelayEnvConfig,
  explainTeleportEnvRefusal,
} from "../../utils/teleport/relayEnv.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  getTranscriptPathForSession,
  getTranscriptStorageKey,
  readTranscriptTailV5,
} from "../../utils/sessionStorage.js";
import { tailFile } from "../../utils/fsOperations.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-rr1dnehg.js:1854-1938 placement
function recordTeleportArmVerdict(e) {
  logForDiagnosticsNoPII(e.outcome === "refused" ? "warn" : "info", "cli_teleport_arm_verdict", e);
}
//@ chunk-rr1dnehg.js:1938-1953 placement
var MAX_SEED_TRANSCRIPT_BYTES = 67108864;
//@ chunk-rr1dnehg.js:1953-2050 placement
/**
 * 解析一行种子转录，返回符合 schema 的对象或 null。
 */
function parseSeedLine(e) {
  try {
    let i = jsonParseRaw(e);
    let a = SEED_LINE_SCHEMA().safeParse(i);
    return a.success ? a.data : null;
  } catch {
    return null;
  }
}
//@ chunk-rr1dnehg.js:2050-2676 placement
/**
 * 从种子 transcript 倒序找 teleport 标记行并据此装配提示缓存中继。
 */
function armRelayFromSeed({ rawSeedLines, liveMessages, ingressOrigin, remoteSessionId }) {
  if (getTeleportCacheState().status !== "inactive") return NOT_INACTIVE_RESULT;
  let d = null;
  for (let j = rawSeedLines.length - 1; j >= 0; j--) {
    let m = rawSeedLines[j];
    if (m.trim() === "") continue;
    let seedLine = parseSeedLine(m);
    if (seedLine?.type === "system" && isUpgradeRelayMarker(seedLine.subtype)) {
      d = seedLine;
      break;
    }
  }
  if (d === null)
    return {
      armed: false,
      code: "no_marker_line",
      reason: "no teleport marker line in the seed transcript",
    };
  let uuid = d.uuid;
  let content = d.content;
  if (typeof uuid !== "string" || typeof content !== "string")
    return {
      armed: false,
      code: "marker_line_shape",
      reason: "marker line is missing its uuid or string content",
    };
  return armRelayFromMarker({
    markerLineUuid: uuid,
    markerContent: content,
    liveMessages,
    ingressOrigin,
    remoteSessionId,
  });
}
//@ chunk-rr1dnehg.js:2676-3855 placement
function armRelayFromMarker({ markerLineUuid, markerContent, liveMessages, ingressOrigin, remoteSessionId }) {
  if (getTeleportCacheState().status !== "inactive") return NOT_INACTIVE_RESULT;
  let relayMarker = parseRelayMarker(markerContent);
  if (!relayMarker.ok)
    return {
      armed: false,
      code: "marker_refused",
      reason: relayMarker.reason,
    };
  let mapped = liveMessages.map((liveMessage) => liveMessage.uuid);
  let index = mapped.indexOf(relayMarker.marker.anchor_line_uuid);
  if (index === -1)
    return {
      armed: false,
      code: "anchor_not_in_view",
      reason: "marker anchor line uuid is not present in the hydrated view",
    };
  if (mapped.indexOf(relayMarker.marker.anchor_line_uuid, index + 1) !== -1)
    return {
      armed: false,
      code: "anchor_not_unique",
      reason:
        "marker anchor line uuid occurs more than once in the hydrated view \u2014 refusing a possibly planted duplicate",
    };
  if (
    liveMessages
      .slice(index + 1)
      .some(
        (liveMessage) =>
          liveMessage.type === "attachment" &&
          liveMessage.attachment.type === "thinking_stripped" &&
          getThinkingStripFrom(liveMessage.attachment) === undefined,
      )
  )
    return {
      armed: false,
      code: "relay_already_ended",
      reason:
        "the relay already ended: a whole-history thinking_stripped marker follows the marker anchor in the hydrated view",
    };
  let sliced = mapped.slice(0, index + 1);
  activateTeleportCache({
    status: "active",
    marker: relayMarker.marker,
    markerLineUuid,
    preAnchorLineUuids: sliced,
    ingressOrigin,
    remoteSessionId,
  });
  logForDebugging(
    `teleport relay armed (server-driven): marker line ${markerLineUuid}, anchor ${relayMarker.marker.anchor_line_uuid}, ${sliced.length} guarded pre-anchor lines`,
  );
  return {
    armed: true,
  };
}
//@ chunk-rr1dnehg.js:3855-4186 placement
function noteTeleportBootUnreached(e, i) {
  noteRelayBootSettled();
  if (!teleportRelayCarrierPresent()) {
    recordTeleportArmVerdict({
      outcome: "absent",
    });
    return;
  }
  if (i) {
    holdRelayVerdictOpen(`boot_unreached_${e}`);
    return;
  }
  logFeatureSad("upgrade_teleport_cache", `boot_unreached_${e}`);
  recordTeleportArmVerdict({
    outcome: "refused",
    error_code: `boot_unreached_${e}`,
  });
  logForDebugging(
    `teleport relay carriers present but the resume lane exited before boot (${e}) \u2014 standard path`,
    {
      level: "warn",
    },
  );
}
//@ chunk-rr1dnehg.js:4186-4954 placement
/**
 * 读取种子 transcript 尾部（优先存储后端，链接文件被拒，其余回退读文件）。
 */
async function readSeedTranscriptTail(e, i) {
  let transcriptPathForSession = getTranscriptPathForSession(e);
  let transcriptStorageKey = getTranscriptStorageKey(transcriptPathForSession, i);
  if (transcriptStorageKey !== undefined) {
    let r = await readTranscriptTailV5(
      transcriptStorageKey.key,
      MAX_SEED_TRANSCRIPT_BYTES,
      transcriptStorageKey.backend,
    ).catch((error) => {
      logForDebugging(
        `teleport relay seed read through storage threw; falling back to the file: ${String(error)}`,
        {
          level: "warn",
        },
      );
      return;
    });
    if (r === null) throw Error("seed transcript stream not found");
    if (r?.ok) return r.content;
    if (r !== undefined) {
      let telemetryCode = "telemetryCode" in r.error ? r.error.telemetryCode : undefined;
      if (telemetryCode === "ELOOP" || telemetryCode === "ENXIO") {
        logForDebugging(
          `teleport relay seed read refused by storage (${telemetryCode}); the file is not re-read directly`,
          {
            level: "warn",
          },
        );
        throw Error("seed transcript refused by storage: a linked or indirect transcript file is not read");
      }
      logForDebugging(
        `teleport relay seed read through storage failed (${r.error.code}); falling back to the file`,
        {
          level: "warn",
        },
      );
    }
  }
  let { content } = await tailFile(transcriptPathForSession, MAX_SEED_TRANSCRIPT_BYTES);
  return content;
}
//@ chunk-rr1dnehg.js:4954-5841 placement
async function bootTeleportFromTranscript(e, liveMessages, a, s) {
  try {
    let teleportRelayEnvConfig = getTeleportRelayEnvConfig();
    if (!teleportRelayEnvConfig) {
      let r = explainTeleportEnvRefusal();
      if (r !== null) {
        logFeatureSad("upgrade_teleport_cache", "env_config_refused");
        recordTeleportArmVerdict({
          outcome: "refused",
          error_code: "env_config_refused",
          cause: r,
        });
        logForDebugging(
          `teleport relay carriers present but env config refused (${r}) \u2014 standard path`,
          {
            level: "warn",
          },
        );
      } else
        recordTeleportArmVerdict({
          outcome: "absent",
        });
      return;
    }
    try {
      let seedTranscriptTail = await readSeedTranscriptTail(e, a);
      let n = armRelayFromSeed({
        rawSeedLines: seedTranscriptTail.split(`
`),
        liveMessages,
        ingressOrigin: teleportRelayEnvConfig.ingressOrigin,
        remoteSessionId: teleportRelayEnvConfig.remoteSessionId,
      });
      if (s && !n.armed && n.code === "no_marker_line") holdRelayVerdictOpen(n.code);
      else if (!n.armed) {
        logFeatureSad("upgrade_teleport_cache", n.code);
        recordTeleportArmVerdict({
          outcome: "refused",
          error_code: n.code,
        });
        logForDebugging(`teleport relay not armed: ${n.reason}`);
      } else {
        logFeatureOk("upgrade_teleport_cache");
        recordTeleportArmVerdict({
          outcome: "armed",
        });
      }
    } catch (error) {
      logFeatureSad("upgrade_teleport_cache", "boot_failed");
      recordTeleportArmVerdict({
        outcome: "refused",
        error_code: "boot_failed",
      });
      logForDebugging(`teleport relay boot failed: ${String(error)}`, {
        level: "warn",
      });
    }
  } finally {
    noteRelayBootSettled();
  }
}
//@ chunk-rr1dnehg.js:5841-5982 placement
/**
 * 启动时未装配中继：保留判定窗口，等待交接时再装配。
 */
function holdRelayVerdictOpen(openBootVerdict) {
  registerCleanup(closeOpenRelayBootVerdict);
  holdRelayBootVerdictOpen(openBootVerdict);
  recordTeleportArmVerdict({
    outcome: "awaiting_handoff",
  });
  logForDebugging(`prompt-cache relay not armed at boot (${openBootVerdict}); a hand-off may still arm it`);
}
export { armRelayFromMarker, recordTeleportArmVerdict };
