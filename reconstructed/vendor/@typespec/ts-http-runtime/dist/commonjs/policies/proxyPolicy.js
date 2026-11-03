/**
 * @typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 3, esm-fingerprint 7
 */
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { glo } from "../../../../../https-proxy-agent/dist/index.js";
import { Ml } from "../../../../../http-proxy-agent/dist/index.js";
import { Ve } from "../../esm/log.js";

//@ chunk-mrx6y2r5.js:52525-52558 esm-layout
var Hl = Re(glo(), 1),
  Fl = Re(Ml(), 1);
//@ chunk-mrx6y2r5.js:52558-52664 esm-fingerprint
var HTTPS_PROXY = "HTTPS_PROXY",
  HTTP_PROXY = "HTTP_PROXY",
  ALL_PROXY = "ALL_PROXY",
  NO_PROXY = "NO_PROXY",
  PROXYPOLICY = "proxyPolicy",
  Dl = [],
  $l = !1,
  fp = new Map();
//@ chunk-mrx6y2r5.js:52664-52799 esm-fingerprint
function Ko(e) {
  if (process.env[e]) return process.env[e];
  else if (process.env[e.toLowerCase()]) return process.env[e.toLowerCase()];
  return;
}
//@ chunk-mrx6y2r5.js:52799-52878 esm-layout
function mp() {
  if (!process) return;
  let e = Ko(HTTPS_PROXY),
    t = Ko(ALL_PROXY),
    r = Ko(HTTP_PROXY);
  return e || t || r;
}
//@ chunk-mrx6y2r5.js:52878-53177 esm-fingerprint
function pp(e, t, r) {
  if (t.length === 0) return !1;
  let hostname = new URL(e).hostname;
  if (r === null || r === void 0 ? void 0 : r.has(hostname)) return r.get(hostname);
  let o = !1;
  for (let i of t)
    if (i[0] === ".") {
      if (hostname.endsWith(i)) o = !0;
      else if (hostname.length === i.length - 1 && hostname === i.slice(1)) o = !0;
    } else if (hostname === i) o = !0;
  return (r === null || r === void 0 || r.set(hostname, o), o);
}
//@ chunk-mrx6y2r5.js:53177-53285 esm-fingerprint
function gp() {
  let e = Ko(NO_PROXY);
  if ((($l = !0), e))
    return e
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length);
  return [];
}
//@ chunk-mrx6y2r5.js:53285-53337 esm-layout
function yp() {
  let e = mp();
  return e ? new URL(e) : void 0;
}
//@ chunk-mrx6y2r5.js:53337-53579 esm-fingerprint
function Ul(e) {
  let t;
  try {
    t = new URL(e.host);
  } catch (error) {
    throw Error(`Expecting a valid host string in proxy settings, but found "${e.host}".`);
  }
  if (((t.port = String(e.port)), e.username)) t.username = e.username;
  if (e.password) t.password = e.password;
  return t;
}
//@ chunk-mrx6y2r5.js:53579-54047 esm-fingerprint
function Ll(e, t, r) {
  if (e.agent) return;
  let o = new URL(e.url).protocol !== "https:";
  if (e.tlsSettings)
    Ve.warning(
      "TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.",
    );
  let toJSON = e.headers.toJSON();
  if (o) {
    if (!t.httpProxyAgent) t.httpProxyAgent = new Fl.HttpProxyAgent(r, { headers: toJSON });
    e.agent = t.httpProxyAgent;
  } else {
    if (!t.httpsProxyAgent) t.httpsProxyAgent = new Hl.HttpsProxyAgent(r, { headers: toJSON });
    e.agent = t.httpsProxyAgent;
  }
}
//@ chunk-mrx6y2r5.js:54047-54403 esm-fingerprint
function ua(e, t) {
  if (!$l) Dl.push(...gp());
  let r = e ? Ul(e) : yp(),
    n = {};
  return {
    name: PROXYPOLICY,
    async sendRequest(o, i) {
      var s;
      if (
        !o.proxySettings &&
        r &&
        !pp(
          o.url,
          (s = t === null || t === void 0 ? void 0 : t.customNoProxyList) !== null && s !== void 0 ? s : Dl,
          (t === null || t === void 0 ? void 0 : t.customNoProxyList) ? void 0 : fp,
        )
      )
        Ll(o, n, r);
      else if (o.proxySettings) Ll(o, n, Ul(o.proxySettings));
      return i(o);
    },
  };
}

export { ua };
