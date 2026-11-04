/**
 * services/mcp/revokeTokens.ts
 *
 * 2.1.316 新增。吊销存储的 MCP 令牌。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xbm7kra6.js (1)
 * attribution: placement 1
 */
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { getServerKey } from "./auth.js";

//@ chunk-xbm7kra6.js:266-844 placement
/**
 * 吊销存储的 MCP 令牌。
 */
async function revokeStoredMcpTokens(serverName, configs) {
  if ((await readSecureStorageForMcp()) === READ_FAILED)
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  let authModule = require("./emitTripwireEvent.lazy.js").mcpAuthModule();
  let seen = new Set();
  let outcome = {
    cleared: true,
  };
  for (let config of configs) {
    if (config.type !== "http" && config.type !== "sse") continue;
    let serverKey = getServerKey(serverName, config);
    if (seen.has(serverKey)) continue;
    seen.add(serverKey);
    let revokeResult = await authModule.revokeServerTokens(serverName, config);
    if (!revokeResult.cleared && (outcome.cleared || revokeResult.reason === "credential_store_failed"))
      outcome = revokeResult;
  }
  if (!outcome.cleared && outcome.reason === "credential_store_failed") return outcome;
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (
    secureStorageForMcp === READ_FAILED ||
    [...seen].some((serverKey) => secureStorageForMcp?.mcpOAuth?.[serverKey] !== undefined)
  )
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  return outcome;
}
export { revokeStoredMcpTokens };
