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
async function revokeStoredMcpTokens(n, i) {
  if ((await readSecureStorageForMcp()) === READ_FAILED)
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  let c = require("./chunk-asne9cp8.js").mcpAuthModule();
  let t = new Set();
  let e = {
    cleared: true,
  };
  for (let r of i) {
    if (r.type !== "http" && r.type !== "sse") continue;
    let serverKey = getServerKey(n, r);
    if (t.has(serverKey)) continue;
    t.add(serverKey);
    let o = await c.revokeServerTokens(n, r);
    if (!o.cleared && (e.cleared || o.reason === "credential_store_failed")) e = o;
  }
  if (!e.cleared && e.reason === "credential_store_failed") return e;
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (
    secureStorageForMcp === READ_FAILED ||
    [...t].some((r) => secureStorageForMcp?.mcpOAuth?.[r] !== undefined)
  )
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  return e;
}
export { revokeStoredMcpTokens };
