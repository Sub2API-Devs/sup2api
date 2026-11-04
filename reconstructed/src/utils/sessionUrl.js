/**
 * utils/sessionUrl.ts
 *
 * 解析 --resume 参数（jsonl 路径 / 会话 UUID / 会话 URL）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionUrl.ts
 * pieces: chunk-ndmse9kj.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { randomUUID } from "crypto";
import { hashAgentId, normalizeUuidOrNull } from "./agentId.js";

//@ chunk-ndmse9kj.js:688-733 placement
/**
 * SESSION_URL_HASH_SALT：会话 URL 哈希盐。
 */
var SESSION_URL_HASH_SALT = "3ab19d7e-9f35-45c2-926e-75e271cc60b3";
//@ chunk-ndmse9kj.js:733-771 placement
/**
 * hashSessionAddress：会话地址哈希。
 */
function hashSessionAddress(address) {
  return hashAgentId(address.trim(), SESSION_URL_HASH_SALT);
}
//@ chunk-ndmse9kj.js:771-864 placement
/**
 * remoteSessionUrlId：远程会话的 URL id。
 */
function remoteSessionUrlId() {
  let trimmed = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.trim();
  return trimmed ? hashAgentId(trimmed, SESSION_URL_HASH_SALT) : null;
}
//@ chunk-ndmse9kj.js:864-1213 fingerprint = parseSessionIdentifier (1)
/**
 * 解析 --resume 参数：.jsonl 路径、会话 UUID 或会话 URL（远程 ingress）。
 */
function parseSessionIdentifier(resumeIdentifier) {
  if (resumeIdentifier.toLowerCase().endsWith(".jsonl"))
    return {
      sessionId: randomUUID(),
      ingressUrl: null,
      isUrl: false,
      jsonlFile: resumeIdentifier,
      isJsonlFile: true,
    };
  if (normalizeUuidOrNull(resumeIdentifier))
    return {
      sessionId: resumeIdentifier,
      ingressUrl: null,
      isUrl: false,
      jsonlFile: null,
      isJsonlFile: false,
    };
  try {
    let url = new URL(resumeIdentifier);
    return {
      sessionId: remoteSessionUrlId() ?? hashAgentId(url.href, SESSION_URL_HASH_SALT),
      ingressUrl: url.href,
      isUrl: true,
      jsonlFile: null,
      isJsonlFile: false,
    };
  } catch {}
  return null;
}
export { parseSessionIdentifier, hashSessionAddress, SESSION_URL_HASH_SALT, remoteSessionUrlId };
