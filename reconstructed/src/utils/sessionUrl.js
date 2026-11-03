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
import { hashAgentId, Vt } from "./agentId.js";

//@ chunk-ndmse9kj.js:688-733 placement
var A = "3ab19d7e-9f35-45c2-926e-75e271cc60b3";
//@ chunk-ndmse9kj.js:733-771 placement
function ADt(e) {
  return hashAgentId(e.trim(), A);
}
//@ chunk-ndmse9kj.js:771-864 placement
function p7t() {
  let e = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.trim();
  return e ? hashAgentId(e, A) : null;
}
/**
 * 解析 --resume 参数：.jsonl 路径、会话 UUID 或会话 URL（远程 ingress）。
 */
//@ chunk-ndmse9kj.js:864-1213 fingerprint = parseSessionIdentifier (1)
function parseSessionIdentifier(resumeIdentifier) {
  if (resumeIdentifier.toLowerCase().endsWith(".jsonl"))
    return {
      sessionId: randomUUID(),
      ingressUrl: null,
      isUrl: !1,
      jsonlFile: resumeIdentifier,
      isJsonlFile: !0,
    };
  if (Vt(resumeIdentifier))
    return { sessionId: resumeIdentifier, ingressUrl: null, isUrl: !1, jsonlFile: null, isJsonlFile: !1 };
  try {
    let url = new URL(resumeIdentifier);
    return {
      sessionId: p7t() ?? hashAgentId(url.href, A),
      ingressUrl: url.href,
      isUrl: !0,
      jsonlFile: null,
      isJsonlFile: !1,
    };
  } catch {}
  return null;
}

export { parseSessionIdentifier, ADt, A, p7t };
