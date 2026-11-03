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
import { SEED_LINE_SCHEMA, NOT_INACTIVE_RESULT, k, parseRelayMarker } from "./relayMarker.js";
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
var T = 67108864;
//@ chunk-rr1dnehg.js:1953-2050 placement
function x(e) {
  try {
    let i = jsonParseRaw(e),
      safeParse = SEED_LINE_SCHEMA().safeParse(i);
    return safeParse.success ? safeParse.data : null;
  } catch {
    return null;
  }
}
/**
 * 从种子 transcript 倒序找 teleport 标记行并据此装配提示缓存中继。
 */
//@ chunk-rr1dnehg.js:2050-2676 placement
function armRelayFromSeed({
  rawSeedLines: rawSeedLines,
  liveMessages: liveMessages,
  ingressOrigin: ingressOrigin,
  remoteSessionId: remoteSessionId,
}) {
  if (getTeleportCacheState().status !== "inactive") return NOT_INACTIVE_RESULT;
  let d = null;
  for (let c = rawSeedLines.length - 1; c >= 0; c--) {
    let m = rawSeedLines[c];
    if (m.trim() === "") continue;
    let l = x(m);
    if (l?.type === "system" && k(l.subtype)) {
      d = l;
      break;
    }
  }
  if (d === null)
    return { armed: !1, code: "no_marker_line", reason: "no teleport marker line in the seed transcript" };
  let uuid = d.uuid,
    content = d.content;
  if (typeof uuid !== "string" || typeof content !== "string")
    return {
      armed: !1,
      code: "marker_line_shape",
      reason: "marker line is missing its uuid or string content",
    };
  return armRelayFromMarker({
    markerLineUuid: uuid,
    markerContent: content,
    liveMessages: liveMessages,
    ingressOrigin: ingressOrigin,
    remoteSessionId: remoteSessionId,
  });
}
//@ chunk-rr1dnehg.js:2676-3855 placement
function armRelayFromMarker({
  markerLineUuid: markerLineUuid,
  markerContent: markerContent,
  liveMessages: liveMessages,
  ingressOrigin: ingressOrigin,
  remoteSessionId: remoteSessionId,
}) {
  if (getTeleportCacheState().status !== "inactive") return NOT_INACTIVE_RESULT;
  let r = parseRelayMarker(markerContent);
  if (!r.ok) return { armed: !1, code: "marker_refused", reason: r.reason };
  let mapped = liveMessages.map((l) => l.uuid),
    index = mapped.indexOf(r.marker.anchor_line_uuid);
  if (index === -1)
    return {
      armed: !1,
      code: "anchor_not_in_view",
      reason: "marker anchor line uuid is not present in the hydrated view",
    };
  if (mapped.indexOf(r.marker.anchor_line_uuid, index + 1) !== -1)
    return {
      armed: !1,
      code: "anchor_not_unique",
      reason:
        "marker anchor line uuid occurs more than once in the hydrated view \u2014 refusing a possibly planted duplicate",
    };
  if (
    liveMessages
      .slice(index + 1)
      .some(
        (l) =>
          l.type === "attachment" &&
          l.attachment.type === "thinking_stripped" &&
          getThinkingStripFrom(l.attachment) === void 0,
      )
  )
    return {
      armed: !1,
      code: "relay_already_ended",
      reason:
        "the relay already ended: a whole-history thinking_stripped marker follows the marker anchor in the hydrated view",
    };
  let sliced = mapped.slice(0, index + 1);
  return (
    activateTeleportCache({
      status: "active",
      marker: r.marker,
      markerLineUuid: markerLineUuid,
      preAnchorLineUuids: sliced,
      ingressOrigin: ingressOrigin,
      remoteSessionId: remoteSessionId,
    }),
    logForDebugging(
      `teleport relay armed (server-driven): marker line ${markerLineUuid}, anchor ${r.marker.anchor_line_uuid}, ${sliced.length} guarded pre-anchor lines`,
    ),
    { armed: !0 }
  );
}
//@ chunk-rr1dnehg.js:3855-4186 placement
function noteTeleportBootUnreached(e, i) {
  if ((noteRelayBootSettled(), !teleportRelayCarrierPresent())) {
    recordTeleportArmVerdict({ outcome: "absent" });
    return;
  }
  if (i) {
    holdRelayVerdictOpen(`boot_unreached_${e}`);
    return;
  }
  (logFeatureSad("upgrade_teleport_cache", `boot_unreached_${e}`),
    recordTeleportArmVerdict({ outcome: "refused", error_code: `boot_unreached_${e}` }),
    logForDebugging(
      `teleport relay carriers present but the resume lane exited before boot (${e}) \u2014 standard path`,
      { level: "warn" },
    ));
}
/**
 * 读取种子 transcript 尾部（优先存储后端，链接文件被拒，其余回退读文件）。
 */
//@ chunk-rr1dnehg.js:4186-4954 placement
async function readSeedTranscriptTail(e, i) {
  let a = getTranscriptPathForSession(e),
    s = getTranscriptStorageKey(a, i);
  if (s !== void 0) {
    let r = await readTranscriptTailV5(s.key, T, s.backend).catch((n) => {
      logForDebugging(
        `teleport relay seed read through storage threw; falling back to the file: ${String(n)}`,
        { level: "warn" },
      );
      return;
    });
    if (r === null) throw Error("seed transcript stream not found");
    if (r?.ok) return r.content;
    if (r !== void 0) {
      let n = "telemetryCode" in r.error ? r.error.telemetryCode : void 0;
      if (n === "ELOOP" || n === "ENXIO")
        throw (
          logForDebugging(
            `teleport relay seed read refused by storage (${n}); the file is not re-read directly`,
            { level: "warn" },
          ),
          Error("seed transcript refused by storage: a linked or indirect transcript file is not read")
        );
      logForDebugging(
        `teleport relay seed read through storage failed (${r.error.code}); falling back to the file`,
        { level: "warn" },
      );
    }
  }
  let { content: content } = await tailFile(a, T);
  return content;
}
//@ chunk-rr1dnehg.js:4954-5841 placement
async function bootTeleportFromTranscript(e, i, a, s) {
  try {
    let d = getTeleportRelayEnvConfig();
    if (!d) {
      let r = explainTeleportEnvRefusal();
      if (r !== null)
        (logFeatureSad("upgrade_teleport_cache", "env_config_refused"),
          recordTeleportArmVerdict({ outcome: "refused", error_code: "env_config_refused", cause: r }),
          logForDebugging(
            `teleport relay carriers present but env config refused (${r}) \u2014 standard path`,
            { level: "warn" },
          ));
      else recordTeleportArmVerdict({ outcome: "absent" });
      return;
    }
    try {
      let r = await readSeedTranscriptTail(e, a),
        n = armRelayFromSeed({
          rawSeedLines: r.split(`
`),
          liveMessages: i,
          ingressOrigin: d.ingressOrigin,
          remoteSessionId: d.remoteSessionId,
        });
      if (s && !n.armed && n.code === "no_marker_line") holdRelayVerdictOpen(n.code);
      else if (!n.armed)
        (logFeatureSad("upgrade_teleport_cache", n.code),
          recordTeleportArmVerdict({ outcome: "refused", error_code: n.code }),
          logForDebugging(`teleport relay not armed: ${n.reason}`));
      else (logFeatureOk("upgrade_teleport_cache"), recordTeleportArmVerdict({ outcome: "armed" }));
    } catch (error) {
      (logFeatureSad("upgrade_teleport_cache", "boot_failed"),
        recordTeleportArmVerdict({ outcome: "refused", error_code: "boot_failed" }),
        logForDebugging(`teleport relay boot failed: ${String(error)}`, { level: "warn" }));
    }
  } finally {
    noteRelayBootSettled();
  }
}
/**
 * 启动时未装配中继：保留判定窗口，等待交接时再装配。
 */
//@ chunk-rr1dnehg.js:5841-5982 placement
function holdRelayVerdictOpen(e) {
  (registerCleanup(closeOpenRelayBootVerdict),
    holdRelayBootVerdictOpen(e),
    recordTeleportArmVerdict({ outcome: "awaiting_handoff" }),
    logForDebugging(`prompt-cache relay not armed at boot (${e}); a hand-off may still arm it`));
}

export { armRelayFromMarker, recordTeleportArmVerdict };
