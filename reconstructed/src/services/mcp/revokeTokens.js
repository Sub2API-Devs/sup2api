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

/**
 * 吊销存储的 MCP 令牌。
 */
//@ chunk-xbm7kra6.js:266-844 placement
async function revokeStoredMcpTokens(n, i) {
  if ((await readSecureStorageForMcp()) === READ_FAILED)
    return { cleared: !1, reason: "credential_store_failed" };
  let mcpAuthModule = require("./chunk-asne9cp8.js").mcpAuthModule(),
    t = new Set(),
    e = { cleared: !0 };
  for (let r of i) {
    if (r.type !== "http" && r.type !== "sse") continue;
    let a = getServerKey(n, r);
    if (t.has(a)) continue;
    t.add(a);
    let revokeServerTokens = await mcpAuthModule.revokeServerTokens(n, r);
    if (!revokeServerTokens.cleared && (e.cleared || revokeServerTokens.reason === "credential_store_failed"))
      e = revokeServerTokens;
  }
  if (!e.cleared && e.reason === "credential_store_failed") return e;
  let s = await readSecureStorageForMcp();
  if (s === READ_FAILED || [...t].some((r) => s?.mcpOAuth?.[r] !== void 0))
    return { cleared: !1, reason: "credential_store_failed" };
  return e;
}

export { revokeStoredMcpTokens };
