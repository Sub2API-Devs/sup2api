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
  containsAll,
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
async function ensureDeviceMcpConsent(storageV5) {
  let consentAnswer = await deviceMcpConsentAnswer(deviceMcpConsentStore(storageV5));
  if (consentAnswer === "accepted") {
    let deviceMcpSnapshot = await readDeviceMcpSnapshot(createSnapshotStore(storageV5));
    let withheld = deviceMcpSnapshot === "unreadable" ? {} : deviceMcpSnapshot.withheld;
    if (Object.keys(withheld).length > 0) {
      await loadDeviceMcpSources();
      if (isDeviceMcpDenied())
        return {
          servers: [],
          withheld: {},
        };
    }
    return {
      servers: [],
      withheld,
    };
  }
  if (consentAnswer !== "unset")
    return {
      servers: [],
      withheld: {},
    };
  let deviceBridgeMcpServers = await getDeviceBridgeMcpServers({
    storageV5,
  });
  let mapped = Object.entries(deviceBridgeMcpServers)
    .filter(([key, value]) => isForwardableDeviceMcp(key, value))
    .map(([key, value]) => ({
      name: key,
      scope: value.scope,
    }));
  if (
    mapped.length > 0 &&
    containsAll(
      await readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5)),
      mapped.map((forwardable) => forwardable.name),
    )
  ) {
    logEvent("tengu_device_mcp_consent_prompt", {
      choice: lit("suppressed_by_not_now"),
    });
    return {
      servers: [],
      withheld: {},
    };
  }
  return {
    servers: mapped,
    withheld: {},
  };
}
export { ensureDeviceMcpConsent };
