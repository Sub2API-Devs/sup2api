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
import { identity } from "../../utils/identity.js";
import { axios_default, AxiosHeaders } from "../../../vendor/axios/dist/esm/axios.js";
import { uniq } from "../../utils/collections.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getBridgeBaseUrlOverride } from "../../bridge/bridgeConfig.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hqdsrzb2.js:338-372 placement
/**
 * 会话令牌（req_ 前缀）的正则。
 */
var SESSIONS_TOKEN_RE = /^req_[A-Za-z0-9_-]{1,36}$/;
//@ chunk-hqdsrzb2.js:372-425 placement
function isSessionsToken(token) {
  return typeof token === "string" && SESSIONS_TOKEN_RE.test(token);
}
//@ chunk-hqdsrzb2.js:446-674 placement
var sessionsBearerInterceptors; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hqdsrzb2.js:446", () => {
  sessionsBearerInterceptors = identity(
    {
      request: null,
      response: null,
      holder: null,
    },
    (state) => {
      if (state.request !== null) {
        axios_default.interceptors.request.eject(state.request);
        state.request = null;
      }
      if (state.response !== null) {
        axios_default.interceptors.response.eject(state.response);
        state.response = null;
      }
      state.holder = null;
    },
  );
});
//@ chunk-hqdsrzb2.js:674-1170 placement
function installSessionsBearerHooks(recover, sendableBearer) {
  if (sessionsBearerInterceptors.request !== null) return;
  sessionsBearerInterceptors.holder = {
    report: recover,
    sendable: sendableBearer,
  };
  sessionsBearerInterceptors.request = axios_default.interceptors.request.use((config) => {
    let decision = decideBearerSend(config.headers.get("Authorization"), sendableBearer, () =>
      isSessionsApiRequest(config),
    );
    switch (decision.send) {
      case "asItCame":
        break;
      case "held":
        config.headers.set("Authorization", decision.value);
        break;
      case "none":
        config.headers.delete("Authorization");
        break;
    }
    return config;
  });
  sessionsBearerInterceptors.response = axios_default.interceptors.response.use(
    (response) => {
      reportSessions401(response.status, response.config, recover);
      return response;
    },
    (error) => {
      if (axios_default.isAxiosError(error) && error.response)
        reportSessions401(error.response.status, error.config, recover);
      return Promise.reject(error);
    },
  );
}
//@ chunk-hqdsrzb2.js:1170-1368 placement
function decideBearerSend(authorizationHeader, sendableBearer, isSessionsRequest) {
  for (let token of collectBearerTokens(authorizationHeader)) {
    let replacement = sendableBearer(token);
    if (replacement === token) continue;
    return replacement !== null &&
      typeof authorizationHeader === "string" &&
      !authorizationHeader.includes(",") &&
      isSessionsRequest()
      ? {
          send: "held",
          value: `Bearer ${replacement}`,
        }
      : {
          send: "none",
        };
  }
  return {
    send: "asItCame",
  };
}
//@ chunk-hqdsrzb2.js:1368-1636 placement
function withVettedSessionsBearer(sourceHeaders, url) {
  let headers = new Headers(sourceHeaders);
  if (sessionsBearerInterceptors.holder === null) return headers;
  let decision = decideBearerSend(
    headers.get("Authorization"),
    sessionsBearerInterceptors.holder.sendable,
    () =>
      isSessionsApiRequest({
        url,
      }),
  );
  switch (decision.send) {
    case "asItCame":
      break;
    case "held":
      headers.set("Authorization", decision.value);
      break;
    case "none":
      headers.delete("Authorization");
      break;
  }
  return headers;
}
//@ chunk-hqdsrzb2.js:1636-1738 placement
function reportSessionsBearerAnswer(status, headers, url) {
  if (sessionsBearerInterceptors.holder !== null)
    reportBearer401(
      status,
      () =>
        isSessionsApiRequest({
          url,
        }),
      () => headers.get("Authorization"),
      sessionsBearerInterceptors.holder.report,
    );
}
//@ chunk-hqdsrzb2.js:1738-1775 placement
function bearerOf(header) {
  return collectBearerTokens(header)[0] ?? null;
}
//@ chunk-hqdsrzb2.js:1775-2044 placement
function collectBearerTokens(value) {
  if (Array.isArray(value)) return value.flatMap(collectBearerTokens);
  if (typeof value !== "string") return [];
  let flattened = (value.includes(",") ? [value, ...value.split(",")] : [value]).flatMap((part) => {
    let match = /^\s*bearer\s+/i.exec(part);
    if (match === null) return [];
    let trimmed = part.slice(match[0].length).trim();
    return trimmed === "" ? [] : [trimmed];
  });
  return uniq(flattened);
}
//@ chunk-hqdsrzb2.js:2044-2197 placement
function isSessionsApiRequest(config) {
  try {
    if (config === undefined) return false;
    let requestOrigin = originOf(axios_default.getUri(config));
    return (
      requestOrigin !== null &&
      [getOauthConfig().BASE_API_URL, getBridgeBaseUrlOverride()].some(
        (baseUrl) => baseUrl !== undefined && originOf(baseUrl) === requestOrigin,
      )
    );
  } catch {
    return false;
  }
}
//@ chunk-hqdsrzb2.js:2197-2316 placement
function originOf(urlString) {
  try {
    let parsedUrl = new URL(urlString);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:" ? parsedUrl.origin : null;
  } catch {
    return null;
  }
}
//@ chunk-hqdsrzb2.js:2316-2419 placement
function reportSessions401(status, config, recover) {
  reportBearer401(
    status,
    () => !config?.skipSessionsBearerReport && isSessionsApiRequest(config),
    () => config?.headers?.get?.("Authorization"),
    recover,
  );
}
//@ chunk-hqdsrzb2.js:2419-2521 placement
function reportBearer401(status, isSessionsRequest, getBearer, recover) {
  try {
    if (status !== 401 || !isSessionsRequest()) return;
    let bearer = bearerOf(getBearer());
    if (bearer !== null) recover(bearer).catch(() => {});
  } catch {}
}
//@ chunk-hqdsrzb2.js:2521-2602 placement
function lacksAuthorizationHeader(config) {
  let headers = config?.headers;
  return headers instanceof AxiosHeaders && !headers.has("Authorization");
}
export {
  lacksAuthorizationHeader,
  isSessionsToken,
  withVettedSessionsBearer,
  reportSessionsBearerAnswer,
  bearerOf,
  installSessionsBearerHooks,
};
