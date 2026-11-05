/**
 * utils/sessionUrl.ts
 *
 * 解析 --resume 参数（jsonl 路径 / 会话 UUID / 会话 URL）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionUrl.ts
 * pieces: chunk-5ythzcas.js (6)
 * attribution: placement 3, layout 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { hashAgentId, normalizeUuidOrNull } from "./agentId.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-5ythzcas.js:618-663 placement
/**
 * SESSION_URL_HASH_SALT：会话 URL 哈希盐。
 */
var SESSION_URL_HASH_SALT = "3ab19d7e-9f35-45c2-926e-75e271cc60b3";
//@ chunk-5ythzcas.js:663-701 placement
/**
 * hashSessionAddress：会话地址哈希。
 */
function hashSessionAddress(address) {
  return hashAgentId(address.trim(), SESSION_URL_HASH_SALT);
}
//@ chunk-5ythzcas.js:701-794 placement
/**
 * remoteSessionUrlId：远程会话的 URL id。
 */
function remoteSessionUrlId() {
  let trimmed = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.trim();
  return trimmed ? hashAgentId(trimmed, SESSION_URL_HASH_SALT) : null;
}
//@ chunk-5ythzcas.js:794-1075 layout
function inheritsRemoteSessionUrl() {
  if (!isEnvTruthy(process.env.CLAUDE_CODE_CHILD_SESSION) || remoteSessionUrlId() === null) return false;
  let argv = process.argv ?? [];
  let index = argv.indexOf("--");
  return (
    !argv
      .slice(0, index === -1 ? undefined : index)
      .some((arg, index) =>
        arg === "--sdk-url" ? Boolean(argv[index + 1]) : arg.startsWith("--sdk-url=") && arg !== "--sdk-url=",
      ) && !(argv[2] === "mcp" && argv[3] === "serve")
  );
}
//@ chunk-5ythzcas.js:1075-1169 layout
function sessionUrlIdForNewSession() {
  return inheritsRemoteSessionUrl() && !isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_NESTED_SESSION_ID)
    ? null
    : remoteSessionUrlId();
}
//@ chunk-5ythzcas.js:1169-1518 fingerprint (2.1.88 match: parseSessionIdentifier, 1)
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
export {
  hashSessionAddress,
  parseSessionIdentifier,
  remoteSessionUrlId,
  SESSION_URL_HASH_SALT,
  sessionUrlIdForNewSession,
};
