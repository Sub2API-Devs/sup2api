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
import { Qn } from "../utils/pathClassification.js";
import { isWslUncPath } from "../utils/networkPaths.js";
import { isENOENT } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { getClientPlatform } from "../utils/http.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { getTerminalFocus, onInteraction, onTerminalFocusChange } from "../bootstrap/state.js";

//@ chunk-5mabxk9z.js:631-698 placement
var m = 5000,
  _ = Ude(),
  y = { teardown: () => {}, pulseIfClientPresent: () => {} };
//@ chunk-5mabxk9z.js:698-904 placement
async function hasClientPresenceMarker() {
  let CLAUDE_CLIENT_PRESENCE_FILE = env.CLAUDE_CLIENT_PRESENCE_FILE;
  if (!CLAUDE_CLIENT_PRESENCE_FILE) return !1;
  if (Qn(CLAUDE_CLIENT_PRESENCE_FILE) && !isWslUncPath(CLAUDE_CLIENT_PRESENCE_FILE)) return !1;
  try {
    return (await stat(CLAUDE_CLIENT_PRESENCE_FILE), !0);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`[presence] client-presence-marker stat failed: ${error}`);
    return !1;
  }
}
//@ chunk-5mabxk9z.js:904-3011 placement
function startClientPresencePulse(a, c, b, A = () => Promise.resolve(!1)) {
  if (isEssentialTrafficOnly()) return y;
  let u = { sessionId: a, baseUrl: c, getAuthHeaders: b, onUnauthorized: A },
    r = `[presence session=${a}]`,
    d = null,
    f = 0,
    resolved = Promise.resolve(),
    h = async (e, s) => {
      let authHeaders = await u.getAuthHeaders();
      if (authHeaders === null)
        return (logForDebugging(`${r} ${e} skipped (no credential to send under)`), null);
      if (!isFirstPartyProvider())
        return (logForDebugging(`${r} ${e} skipped (non-first-party provider)`), null);
      let l = `${u.baseUrl}/v1/code/sessions/${u.sessionId}/client/presence`;
      return (
        logForDebugging(`${r} ${e} \u2192 ${l}`),
        Dt.post(
          l,
          { client_id: _, ...s },
          {
            headers: {
              ...authHeaders,
              "anthropic-version": "2023-06-01",
              "anthropic-client-platform": getClientPlatform(),
            },
            timeout: m,
            validateStatus: () => !0,
          },
        ).then(
          (o) => {
            if (o.status >= 400) logForDebugging(`${r} ${e} got ${o.status}`);
            let E = o.config?.headers?.get?.("Authorization");
            return {
              status: o.status,
              sentHeaders:
                typeof E === "string"
                  ? { ...authHeaders, Authorization: E }
                  : lacksAuthorizationHeader(o.config)
                    ? null
                    : authHeaders,
            };
          },
          (o) => (
            logForDebugging(
              `${r} ${e} failed: ${Dt.isAxiosError(o) ? (o.code ?? "request_error") : "error"}`,
            ),
            null
          ),
        )
      );
    },
    P = async (e) => {
      let s = e.clear === !0 ? "clear" : "pulse";
      if (!isFirstPartyProvider()) {
        logForDebugging(`${r} ${s} skipped (non-first-party provider)`);
        return;
      }
      try {
        let n = await h(s, e);
        if (
          n?.status === 401 &&
          (n.sentHeaders === null || (await u.onUnauthorized(n.sentHeaders, "first")))
        ) {
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
    },
    v = () => {
      let now = Date.now();
      ((f = now), (d ??= new Date(now).toISOString()));
      let s = P({ connected_at: d });
      return ((resolved = resolved.then(() => s)), s);
    },
    w = () => {
      if (getTerminalFocus() === !1) {
        logForDebugging(`${r} pulse skipped (terminal blurred)`);
        return;
      }
      if (Date.now() - f < m) return;
      v();
    },
    H = onInteraction(w),
    C = onTerminalFocusChange(() => {
      let e = getTerminalFocus();
      if (
        (logForDebugging(
          `${r} terminal focus \u2192 ${e === void 0 ? "unknown" : e ? "focused" : "blurred"}`,
        ),
        e === !0)
      )
        w();
    });
  logForDebugging(`${r} wired`);
  let p = !1;
  return {
    teardown() {
      if (p) return;
      if (((p = !0), H?.(), (H = null), C?.(), (C = null), d !== null)) resolved.then(() => P({ clear: !0 }));
      d = null;
    },
    pulseIfClientPresent() {
      if (p || Date.now() - f < m) return;
      hasClientPresenceMarker().then((e) => {
        if (e && !p && Date.now() - f >= m)
          (logForDebugging(`${r} client-presence-marker active \u2192 pulse`), v());
      });
    },
  };
}

export { startClientPresencePulse };
