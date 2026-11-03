/**
 * utils/teleport/relayEnv.ts
 *
 * 2.1.316 新增。校验 teleport 中继的 SESSION_INGRESS_URL 来源（必须 https、无额外部分）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2nwtj5hg.js (6)
 * attribution: placement 6
 */
import { env } from "../env.js";
import { isFirstPartyProvider } from "../model/providers.js";

/**
 * 校验 teleport 中继的 SESSION_INGRESS_URL 来源（必须 https、无额外部分）。
 */
//@ chunk-2nwtj5hg.js:262-624 placement
function validateIngressOrigin(s) {
  if (!s.startsWith("https://")) return { ok: !1, cause: "non_https" };
  let e;
  try {
    e = new URL(s);
  } catch {
    return { ok: !1, cause: "unparseable" };
  }
  if (e.protocol !== "https:") return { ok: !1, cause: "non_https" };
  if (
    e.username !== "" ||
    e.password !== "" ||
    e.search !== "" ||
    e.hash !== "" ||
    (e.pathname !== "" && e.pathname !== "/")
  )
    return { ok: !1, cause: "origin_extras" };
  return { ok: !0, origin: e.origin };
}
//@ chunk-2nwtj5hg.js:624-652 placement
var t = /^cse_[A-Za-z0-9_]+$/;
/**
 * 读取 teleport 中继环境变量
 */
//@ chunk-2nwtj5hg.js:652-1189 placement
function readTeleportRelayEnv() {
  if (!env.CCR_SESSION_PROFILE) return { ok: !1, cause: null };
  let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
  if (!SESSION_INGRESS_URL) return { ok: !1, cause: "missing_ingress_url" };
  let e = validateIngressOrigin(SESSION_INGRESS_URL);
  if (!e.ok) return { ok: !1, cause: `invalid_ingress_origin:${e.cause}` };
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (!CLAUDE_CODE_REMOTE_SESSION_ID) return { ok: !1, cause: "missing_session_id" };
  if (!CLAUDE_CODE_REMOTE_SESSION_ID.startsWith("cse_")) return { ok: !1, cause: "non_cse_session_id" };
  if (!t.test(CLAUDE_CODE_REMOTE_SESSION_ID)) return { ok: !1, cause: "malformed_session_id" };
  if (!isFirstPartyProvider()) return { ok: !1, cause: "non_first_party" };
  return { ok: !0, config: { ingressOrigin: e.origin, remoteSessionId: CLAUDE_CODE_REMOTE_SESSION_ID } };
}
//@ chunk-2nwtj5hg.js:1189-1240 placement
function getTeleportRelayEnvConfig() {
  let s = readTeleportRelayEnv();
  return s.ok ? s.config : null;
}
//@ chunk-2nwtj5hg.js:1240-1290 placement
function explainTeleportEnvRefusal() {
  let s = readTeleportRelayEnv();
  return s.ok ? null : s.cause;
}
//@ chunk-2nwtj5hg.js:1290-1334 placement
function teleportRelayCarrierPresent() {
  return env.CCR_SESSION_PROFILE;
}

export {
  validateIngressOrigin,
  getTeleportRelayEnvConfig,
  teleportRelayCarrierPresent,
  explainTeleportEnvRefusal,
};
