/**
 * @azure/core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (8)
 * attribution: esm-fingerprint 8
 */
import { Xn } from "./tracingPolicy.js";
import { ut } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { gd } from "../util/tokenCycler.js";

//@ chunk-mrx6y2r5.js:64307-64348 esm-fingerprint
var BEARERTOKENAUTHENTICATIONPOLICY = "bearerTokenAuthenticationPolicy";
//@ chunk-mrx6y2r5.js:64348-64466 esm-fingerprint
async function Zo(e, t) {
  try {
    return [await t(e), void 0];
  } catch (error) {
    if (Xn(error) && error.response) return [error.response, error];
    else throw error;
  }
}
//@ chunk-mrx6y2r5.js:64466-64684 esm-fingerprint
async function Fp(e) {
  let { scopes: scopes, getAccessToken: getAccessToken, request: request } = e,
    o = { abortSignal: request.abortSignal, tracingOptions: request.tracingOptions, enableCae: !0 },
    i = await getAccessToken(scopes, o);
  if (i) e.request.headers.set("Authorization", `Bearer ${i.token}`);
}
//@ chunk-mrx6y2r5.js:64684-64756 esm-fingerprint
function yd(e) {
  return e.status === 401 && e.headers.has("WWW-Authenticate");
}
//@ chunk-mrx6y2r5.js:64756-64979 esm-fingerprint
async function Td(e, t) {
  var r;
  let { scopes: scopes } = e,
    accessToken = await e.getAccessToken(scopes, { enableCae: !0, claims: t });
  if (!accessToken) return !1;
  return (
    e.request.headers.set(
      "Authorization",
      `${(r = accessToken.tokenType) !== null && r !== void 0 ? r : "Bearer"} ${accessToken.token}`,
    ),
    !0
  );
}
//@ chunk-mrx6y2r5.js:64979-66674 esm-fingerprint
function Zn(e) {
  var t, r, n;
  let { credential: credential, scopes: scopes, challengeCallbacks: challengeCallbacks } = e,
    a = e.logger || ut,
    c = {
      authorizeRequest:
        (r =
          (t =
            challengeCallbacks === null || challengeCallbacks === void 0
              ? void 0
              : challengeCallbacks.authorizeRequest) === null || t === void 0
            ? void 0
            : t.bind(challengeCallbacks)) !== null && r !== void 0
          ? r
          : Fp,
      authorizeRequestOnChallenge:
        (n =
          challengeCallbacks === null || challengeCallbacks === void 0
            ? void 0
            : challengeCallbacks.authorizeRequestOnChallenge) === null || n === void 0
          ? void 0
          : n.bind(challengeCallbacks),
    },
    l = credential ? gd(credential) : () => Promise.resolve(null);
  return {
    name: BEARERTOKENAUTHENTICATIONPOLICY,
    async sendRequest(d, u) {
      if (!d.url.toLowerCase().startsWith("https://"))
        throw Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
      await c.authorizeRequest({
        scopes: Array.isArray(scopes) ? scopes : [scopes],
        request: d,
        getAccessToken: l,
        logger: a,
      });
      let m, p, y;
      if ((([m, p] = await Zo(d, u)), yd(m))) {
        let T = Ed(m.headers.get("WWW-Authenticate"));
        if (T) {
          let I;
          try {
            I = atob(T);
          } catch (error) {
            return (
              a.warning(
                `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${T}`,
              ),
              m
            );
          }
          if (
            ((y = await Td(
              {
                scopes: Array.isArray(scopes) ? scopes : [scopes],
                response: m,
                request: d,
                getAccessToken: l,
                logger: a,
              },
              I,
            )),
            y)
          )
            [m, p] = await Zo(d, u);
        } else if (c.authorizeRequestOnChallenge) {
          if (
            ((y = await c.authorizeRequestOnChallenge({
              scopes: Array.isArray(scopes) ? scopes : [scopes],
              request: d,
              response: m,
              getAccessToken: l,
              logger: a,
            })),
            y)
          )
            [m, p] = await Zo(d, u);
          if (yd(m)) {
            if (((T = Ed(m.headers.get("WWW-Authenticate"))), T)) {
              let I;
              try {
                I = atob(T);
              } catch (error) {
                return (
                  a.warning(
                    `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${T}`,
                  ),
                  m
                );
              }
              if (
                ((y = await Td(
                  {
                    scopes: Array.isArray(scopes) ? scopes : [scopes],
                    response: m,
                    request: d,
                    getAccessToken: l,
                    logger: a,
                  },
                  I,
                )),
                y)
              )
                [m, p] = await Zo(d, u);
            }
          }
        }
      }
      if (p) throw p;
      else return m;
    },
  };
}
//@ chunk-mrx6y2r5.js:66674-66898 esm-fingerprint
function $p(e) {
  let t = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g,
    r = /(\w+)="([^"]*)"/g,
    n = [],
    o;
  while ((o = t.exec(e)) !== null) {
    let i = o[1],
      s = o[2],
      a = {},
      c;
    while ((c = r.exec(s)) !== null) a[c[1]] = c[2];
    n.push({ scheme: i, params: a });
  }
  return n;
}
//@ chunk-mrx6y2r5.js:66898-67078 esm-fingerprint
function Ed(e) {
  var t;
  if (!e) return;
  return (t = $p(e).find(
    (n) => n.scheme === "Bearer" && n.params.claims && n.params.error === "insufficient_claims",
  )) === null || t === void 0
    ? void 0
    : t.params.claims;
}

export { Zn };
