/**
 * services/oauth/sessionsBearerHooks.ts
 *
 * 2.1.316 新增：sessions API 的 Bearer 令牌钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hqdsrzb2.js (14)
 * attribution: placement 14
 */
import { ge } from "../../utils/identity.js";
import { Dt, AxiosHeaders } from "../../../vendor/axios/dist/esm/axios.js";
import { uniq } from "../../utils/collections.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getBridgeBaseUrlOverride } from "../../bridge/bridgeConfig.js";

//@ chunk-hqdsrzb2.js:338-372 placement
var p = /^req_[A-Za-z0-9_-]{1,36}$/;
//@ chunk-hqdsrzb2.js:372-425 placement
function isSessionsToken(e) {
  return typeof e === "string" && p.test(e);
}
//@ chunk-hqdsrzb2.js:446-674 placement
var sessionsBearerInterceptors = ge({ request: null, response: null, holder: null }, (e) => {
  if (e.request !== null) (Dt.interceptors.request.eject(e.request), (e.request = null));
  if (e.response !== null) (Dt.interceptors.response.eject(e.response), (e.response = null));
  e.holder = null;
});
//@ chunk-hqdsrzb2.js:674-1170 placement
function installSessionsBearerHooks(e, r) {
  if (sessionsBearerInterceptors.request !== null) return;
  ((sessionsBearerInterceptors.holder = { report: e, sendable: r }),
    (sessionsBearerInterceptors.request = Dt.interceptors.request.use((n) => {
      let t = decideBearerSend(n.headers.get("Authorization"), r, () => isSessionsApiRequest(n));
      switch (t.send) {
        case "asItCame":
          break;
        case "held":
          n.headers.set("Authorization", t.value);
          break;
        case "none":
          n.headers.delete("Authorization");
          break;
      }
      return n;
    })),
    (sessionsBearerInterceptors.response = Dt.interceptors.response.use(
      (n) => (reportSessions401(n.status, n.config, e), n),
      (n) => {
        if (Dt.isAxiosError(n) && n.response) reportSessions401(n.response.status, n.config, e);
        return Promise.reject(n);
      },
    )));
}
//@ chunk-hqdsrzb2.js:1170-1368 placement
function decideBearerSend(e, r, n) {
  for (let t of collectBearerTokens(e)) {
    let s = r(t);
    if (s === t) continue;
    return s !== null && typeof e === "string" && !e.includes(",") && n()
      ? { send: "held", value: `Bearer ${s}` }
      : { send: "none" };
  }
  return { send: "asItCame" };
}
//@ chunk-hqdsrzb2.js:1368-1636 placement
function withVettedSessionsBearer(e, r) {
  let headers = new Headers(e);
  if (sessionsBearerInterceptors.holder === null) return headers;
  let t = decideBearerSend(headers.get("Authorization"), sessionsBearerInterceptors.holder.sendable, () =>
    isSessionsApiRequest({ url: r }),
  );
  switch (t.send) {
    case "asItCame":
      break;
    case "held":
      headers.set("Authorization", t.value);
      break;
    case "none":
      headers.delete("Authorization");
      break;
  }
  return headers;
}
//@ chunk-hqdsrzb2.js:1636-1738 placement
function reportSessionsBearerAnswer(e, r, n) {
  if (sessionsBearerInterceptors.holder !== null)
    reportBearer401(
      e,
      () => isSessionsApiRequest({ url: n }),
      () => r.get("Authorization"),
      sessionsBearerInterceptors.holder.report,
    );
}
//@ chunk-hqdsrzb2.js:1738-1775 placement
function bearerOf(e) {
  return collectBearerTokens(e)[0] ?? null;
}
//@ chunk-hqdsrzb2.js:1775-2044 placement
function collectBearerTokens(e) {
  if (Array.isArray(e)) return e.flatMap(collectBearerTokens);
  if (typeof e !== "string") return [];
  let flattened = (e.includes(",") ? [e, ...e.split(",")] : [e]).flatMap((t) => {
    let match = /^\s*bearer\s+/i.exec(t);
    if (match === null) return [];
    let trimmed = t.slice(match[0].length).trim();
    return trimmed === "" ? [] : [trimmed];
  });
  return uniq(flattened);
}
//@ chunk-hqdsrzb2.js:2044-2197 placement
function isSessionsApiRequest(e) {
  try {
    if (e === void 0) return !1;
    let r = originOf(Dt.getUri(e));
    return (
      r !== null &&
      [getOauthConfig().BASE_API_URL, getBridgeBaseUrlOverride()].some(
        (n) => n !== void 0 && originOf(n) === r,
      )
    );
  } catch {
    return !1;
  }
}
//@ chunk-hqdsrzb2.js:2197-2316 placement
function originOf(e) {
  try {
    let r = new URL(e);
    return r.protocol === "https:" || r.protocol === "http:" ? r.origin : null;
  } catch {
    return null;
  }
}
//@ chunk-hqdsrzb2.js:2316-2419 placement
function reportSessions401(e, r, n) {
  reportBearer401(
    e,
    () => !r?.skipSessionsBearerReport && isSessionsApiRequest(r),
    () => r?.headers?.get?.("Authorization"),
    n,
  );
}
//@ chunk-hqdsrzb2.js:2419-2521 placement
function reportBearer401(e, r, n, t) {
  try {
    if (e !== 401 || !r()) return;
    let s = bearerOf(n());
    if (s !== null) t(s).catch(() => {});
  } catch {}
}
//@ chunk-hqdsrzb2.js:2521-2602 placement
function lacksAuthorizationHeader(e) {
  let r = e?.headers;
  return r instanceof AxiosHeaders && !r.has("Authorization");
}

export {
  lacksAuthorizationHeader,
  isSessionsToken,
  withVettedSessionsBearer,
  reportSessionsBearerAnswer,
  bearerOf,
  installSessionsBearerHooks,
};
