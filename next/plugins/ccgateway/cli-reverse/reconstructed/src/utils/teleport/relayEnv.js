/**
 * utils/teleport/relayEnv.ts
 *
 * 2.1.316 新增。校验 teleport 中继的 SESSION_INGRESS_URL 来源（必须 https、无额外部分）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3e78gx3d.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../env.js";
import { isFirstPartyProvider } from "../model/providers.js";

//@ chunk-3e78gx3d.js:262-624 placement
/**
 * 校验 teleport 中继的 SESSION_INGRESS_URL 来源（必须 https、无额外部分）。
 */
function validateIngressOrigin(origin) {
  if (!origin.startsWith("https://"))
    return {
      ok: false,
      cause: "non_https",
    };
  let url;
  try {
    url = new URL(origin);
  } catch {
    return {
      ok: false,
      cause: "unparseable",
    };
  }
  if (url.protocol !== "https:")
    return {
      ok: false,
      cause: "non_https",
    };
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/")
  )
    return {
      ok: false,
      cause: "origin_extras",
    };
  return {
    ok: true,
    origin: url.origin,
  };
}
//@ chunk-3e78gx3d.js:624-652 placement
var SESSION_ID_RE = /^cse_[A-Za-z0-9_]+$/;
//@ chunk-3e78gx3d.js:652-1189 placement
/**
 * 读取 teleport 中继环境变量
 */
function readTeleportRelayEnv() {
  if (!env.CCR_SESSION_PROFILE)
    return {
      ok: false,
      cause: null,
    };
  let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
  if (!SESSION_INGRESS_URL)
    return {
      ok: false,
      cause: "missing_ingress_url",
    };
  let ingress = validateIngressOrigin(SESSION_INGRESS_URL);
  if (!ingress.ok)
    return {
      ok: false,
      cause: `invalid_ingress_origin:${ingress.cause}`,
    };
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (!CLAUDE_CODE_REMOTE_SESSION_ID)
    return {
      ok: false,
      cause: "missing_session_id",
    };
  if (!CLAUDE_CODE_REMOTE_SESSION_ID.startsWith("cse_"))
    return {
      ok: false,
      cause: "non_cse_session_id",
    };
  if (!SESSION_ID_RE.test(CLAUDE_CODE_REMOTE_SESSION_ID))
    return {
      ok: false,
      cause: "malformed_session_id",
    };
  if (!isFirstPartyProvider())
    return {
      ok: false,
      cause: "non_first_party",
    };
  return {
    ok: true,
    config: {
      ingressOrigin: ingress.origin,
      remoteSessionId: CLAUDE_CODE_REMOTE_SESSION_ID,
    },
  };
}
//@ chunk-3e78gx3d.js:1189-1240 placement
function getTeleportRelayEnvConfig() {
  let teleportRelayEnv = readTeleportRelayEnv();
  return teleportRelayEnv.ok ? teleportRelayEnv.config : null;
}
//@ chunk-3e78gx3d.js:1240-1290 placement
function explainTeleportEnvRefusal() {
  let teleportRelayEnv = readTeleportRelayEnv();
  return teleportRelayEnv.ok ? null : teleportRelayEnv.cause;
}
//@ chunk-3e78gx3d.js:1290-1334 placement
function teleportRelayCarrierPresent() {
  return env.CCR_SESSION_PROFILE;
}
export {
  teleportRelayCarrierPresent,
  getTeleportRelayEnvConfig,
  explainTeleportEnvRefusal,
  validateIngressOrigin,
};
