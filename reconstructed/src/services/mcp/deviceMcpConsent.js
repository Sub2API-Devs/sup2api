/**
 * services/mcp/deviceMcpConsent.ts
 *
 * 2.1.316 新增：设备 MCP 同意确认
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-077pc1h8.js (1)
 * attribution: placement 1
 */
import {
  deviceMcpConsentAnswer,
  deviceMcpConsentStore,
  ppt,
  readDeviceMcpNotNow,
  deviceMcpNotNowStore,
} from "../deviceBridge/deviceMcpConsent.js";
import { readDeviceMcpSnapshot, createSnapshotStore } from "../deviceBridge/deviceMcpSnapshot.js";
import {
  loadDeviceMcpSources,
  isDeviceMcpDenied,
  getDeviceBridgeMcpServers,
  isForwardableDeviceMcp,
} from "./deviceMcpServers.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";

//@ chunk-077pc1h8.js:12528-13112 placement
async function ensureDeviceMcpConsent(t) {
  let n = await deviceMcpConsentAnswer(deviceMcpConsentStore(t));
  if (n === "accepted") {
    let e = await readDeviceMcpSnapshot(createSnapshotStore(t)),
      r = e === "unreadable" ? {} : e.withheld;
    if (Object.keys(r).length > 0) {
      if ((await loadDeviceMcpSources(), isDeviceMcpDenied())) return { servers: [], withheld: {} };
    }
    return { servers: [], withheld: r };
  }
  if (n !== "unset") return { servers: [], withheld: {} };
  let i = await getDeviceBridgeMcpServers({ storageV5: t }),
    mapped = Object.entries(i)
      .filter(([e, r]) => isForwardableDeviceMcp(e, r))
      .map(([e, r]) => ({ name: e, scope: r.scope }));
  if (
    mapped.length > 0 &&
    ppt(
      await readDeviceMcpNotNow(deviceMcpNotNowStore(t)),
      mapped.map((e) => e.name),
    )
  )
    return (
      logEvent("tengu_device_mcp_consent_prompt", { choice: lit("suppressed_by_not_now") }),
      { servers: [], withheld: {} }
    );
  return { servers: mapped, withheld: {} };
}
