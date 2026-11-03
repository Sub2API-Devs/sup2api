/**
 * services/analytics/_new/isFirstPartyApiHost.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wpnxx5r.js (1)
 * attribution: sole-consumer-new 1
 */
import { FIRST_PARTY_API_HOSTS } from "../../../utils/model/providers.js";

/**
 * 主机名是否为第一方 API 主机。
 */
//@ chunk-1wpnxx5r.js:920-952 sole-consumer-new
function isFirstPartyApiHost(e) {
  return FIRST_PARTY_API_HOSTS.has(e);
}

export { isFirstPartyApiHost };
