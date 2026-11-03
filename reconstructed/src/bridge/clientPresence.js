/**
 * bridge/clientPresence.ts
 *
 * 2.1.316 新增。向 /v1/code/sessions/:id/client/presence 定时上报客户端在线心跳。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5mabxk9z.js (3)
 * attribution: placement 3
 */
import { randomUUID as Ude } from "crypto";
import { stat } from "fs/promises";
import { env } from "../utils/env.js";
import { isUncOrDevicePath } from "../utils/pathClassification.js";
import { isWslUncPath } from "../utils/networkPaths.js";
import { isENOENT } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { getClientPlatform } from "../utils/http.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { getTerminalFocus, onInteraction, onTerminalFocusChange } from "../bootstrap/state.js";

//@ chunk-5mabxk9z.js:631-698 placement
var PRESENCE_PULSE_MIN_INTERVAL_MS = 5000;
var _ = Ude();
var NOOP_PRESENCE_PULSE = {
  teardown: () => {},
  pulseIfClientPresent: () => {},
};
//@ chunk-5mabxk9z.js:698-904 placement
async function hasClientPresenceMarker() {
  let CLAUDE_CLIENT_PRESENCE_FILE = env.CLAUDE_CLIENT_PRESENCE_FILE;
  if (!CLAUDE_CLIENT_PRESENCE_FILE) return false;
  if (isUncOrDevicePath(CLAUDE_CLIENT_PRESENCE_FILE) && !isWslUncPath(CLAUDE_CLIENT_PRESENCE_FILE))
    return false;
  try {
    await stat(CLAUDE_CLIENT_PRESENCE_FILE);
    return true;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`[presence] client-presence-marker stat failed: ${error}`);
    return false;
  }
}
//@ chunk-5mabxk9z.js:904-3011 placement
function startClientPresencePulse(a, baseUrl, getAuthHeaders, onUnauthorized = () => Promise.resolve(false)) {
  if (isEssentialTrafficOnly()) return NOOP_PRESENCE_PULSE;
  let u = {
    sessionId: a,
    baseUrl,
    getAuthHeaders,
    onUnauthorized,
  };
  let r = `[presence session=${a}]`;
  let d = null;
  let f = 0;
  let resolved = Promise.resolve();
  let h = async (e, s) => {
    let authHeaders = await u.getAuthHeaders();
    if (authHeaders === null) {
      logForDebugging(`${r} ${e} skipped (no credential to send under)`);
      return null;
    }
    if (!isFirstPartyProvider()) {
      logForDebugging(`${r} ${e} skipped (non-first-party provider)`);
      return null;
    }
    let l = `${u.baseUrl}/v1/code/sessions/${u.sessionId}/client/presence`;
    logForDebugging(`${r} ${e} \u2192 ${l}`);
    return axios_default
      .post(
        l,
        {
          client_id: _,
          ...s,
        },
        {
          headers: {
            ...authHeaders,
            "anthropic-version": "2023-06-01",
            "anthropic-client-platform": getClientPlatform(),
          },
          timeout: PRESENCE_PULSE_MIN_INTERVAL_MS,
          validateStatus: () => true,
        },
      )
      .then(
        (o) => {
          if (o.status >= 400) logForDebugging(`${r} ${e} got ${o.status}`);
          let E = o.config?.headers?.get?.("Authorization");
          return {
            status: o.status,
            sentHeaders:
              typeof E === "string"
                ? {
                    ...authHeaders,
                    Authorization: E,
                  }
                : lacksAuthorizationHeader(o.config)
                  ? null
                  : authHeaders,
          };
        },
        (error) => {
          logForDebugging(
            `${r} ${e} failed: ${axios_default.isAxiosError(error) ? (error.code ?? "request_error") : "error"}`,
          );
          return null;
        },
      );
  };
  let P = async (e) => {
    let s = e.clear === true ? "clear" : "pulse";
    if (!isFirstPartyProvider()) {
      logForDebugging(`${r} ${s} skipped (non-first-party provider)`);
      return;
    }
    try {
      let n = await h(s, e);
      if (n?.status === 401 && (n.sentHeaders === null || (await u.onUnauthorized(n.sentHeaders, "first")))) {
        logForDebugging(
          `${r} ${s} retrying ${n.sentHeaders === null ? "once: the first went with no credential" : "after credential refresh"}`,
        );
        let l = await h(s, e);
        if (l?.status === 401 && l.sentHeaders !== null)
          u.onUnauthorized(l.sentHeaders, "resend").catch(() => {});
      }
    } catch (error) {
      logForDebugging(
        `${r} ${s} skipped (credential unavailable: ${error instanceof Error ? error.name : "error"})`,
      );
    }
  };
  let v = () => {
    let now = Date.now();
    f = now;
    d ??= new Date(now).toISOString();
    let s = P({
      connected_at: d,
    });
    resolved = resolved.then(() => s);
    return s;
  };
  let w = () => {
    if (getTerminalFocus() === false) {
      logForDebugging(`${r} pulse skipped (terminal blurred)`);
      return;
    }
    if (Date.now() - f < PRESENCE_PULSE_MIN_INTERVAL_MS) return;
    v();
  };
  let H = onInteraction(w);
  let C = onTerminalFocusChange(() => {
    let terminalFocus = getTerminalFocus();
    logForDebugging(
      `${r} terminal focus \u2192 ${terminalFocus === undefined ? "unknown" : terminalFocus ? "focused" : "blurred"}`,
    );
    if (terminalFocus === true) w();
  });
  logForDebugging(`${r} wired`);
  let p = false;
  return {
    teardown() {
      if (p) return;
      p = true;
      H?.();
      H = null;
      C?.();
      C = null;
      if (d !== null)
        resolved.then(() =>
          P({
            clear: true,
          }),
        );
      d = null;
    },
    pulseIfClientPresent() {
      if (p || Date.now() - f < PRESENCE_PULSE_MIN_INTERVAL_MS) return;
      hasClientPresenceMarker().then((e) => {
        if (e && !p && Date.now() - f >= PRESENCE_PULSE_MIN_INTERVAL_MS) {
          logForDebugging(`${r} client-presence-marker active \u2192 pulse`);
          v();
        }
      });
    },
  };
}
export { startClientPresencePulse };
