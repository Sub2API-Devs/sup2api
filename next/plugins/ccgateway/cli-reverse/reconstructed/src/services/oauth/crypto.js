/**
 * services/oauth/crypto.ts
 *
 * OAuth/加密小工具：PKCE verifier/challenge 与 base64url；此段还混入了 MCP discovery 缓存加密、签名文档校验等无关代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/crypto.ts
 * pieces: chunk-ehpqy72x.js (1)
 * attribution: fingerprint 1
 */
import { createHash } from "crypto";
import { base64URLEncode } from "./auth-code-listener.js";

//@ chunk-ehpqy72x.js:5025-5090 fingerprint (2.1.88 match: generateCodeChallenge, 1)
/**
 * PKCE：sha256(verifier) 的 base64url。
 */
function generateCodeChallenge(verifier) {
  let hash = createHash("sha256");
  hash.update(verifier);
  return base64URLEncode(hash.digest());
}
export { generateCodeChallenge };
