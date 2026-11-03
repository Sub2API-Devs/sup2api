/**
 * @typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 3, esm-fingerprint 7
 */
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { require_https_proxy_agent } from "../../../../../https-proxy-agent/dist/index.js";
import { require_http_proxy_agent } from "../../../../../http-proxy-agent/dist/index.js";
import { logger_2 } from "../../esm/log.js";

//@ chunk-mrx6y2r5.js:52525-52558 esm-layout
var import_https_proxy_agent = Re(require_https_proxy_agent(), 1);
var import_http_proxy_agent = Re(require_http_proxy_agent(), 1);
//@ chunk-mrx6y2r5.js:52558-52664 esm-fingerprint
var HTTPS_PROXY = "HTTPS_PROXY";
var HTTP_PROXY = "HTTP_PROXY";
var ALL_PROXY = "ALL_PROXY";
var NO_PROXY = "NO_PROXY";
var proxyPolicyName = "proxyPolicy";
var Dl = [];
var noProxyListLoaded = false;
var fp = new Map();
//@ chunk-mrx6y2r5.js:52664-52799 esm-fingerprint
function getEnvironmentValue(name) {
  if (process.env[name]) return process.env[name];
  else if (process.env[name.toLowerCase()]) return process.env[name.toLowerCase()];
  return;
}
//@ chunk-mrx6y2r5.js:52799-52878 esm-layout
function mp() {
  if (!process) return;
  let httpsProxy = getEnvironmentValue(HTTPS_PROXY);
  let allProxy = getEnvironmentValue(ALL_PROXY);
  let httpProxy = getEnvironmentValue(HTTP_PROXY);
  return httpsProxy || allProxy || httpProxy;
}
//@ chunk-mrx6y2r5.js:52878-53177 esm-fingerprint
function isBypassed(uri, noProxyList, bypassedMap) {
  if (noProxyList.length === 0) return false;
  let host = new URL(uri).hostname;
  if (bypassedMap === null || bypassedMap === undefined ? undefined : bypassedMap.has(host))
    return bypassedMap.get(host);
  let isBypassedFlag = false;
  for (let pattern of noProxyList)
    if (pattern[0] === ".") {
      if (host.endsWith(pattern)) isBypassedFlag = true;
      else if (host.length === pattern.length - 1 && host === pattern.slice(1)) isBypassedFlag = true;
    } else if (host === pattern) isBypassedFlag = true;
  if (!(bypassedMap === null || bypassedMap === undefined)) bypassedMap.set(host, isBypassedFlag);
  return isBypassedFlag;
}
//@ chunk-mrx6y2r5.js:53177-53285 esm-fingerprint
function loadNoProxy() {
  let noProxy = getEnvironmentValue(NO_PROXY);
  noProxyListLoaded = true;
  if (noProxy)
    return noProxy
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length);
  return [];
}
//@ chunk-mrx6y2r5.js:53285-53337 esm-layout
function yp() {
  let e = mp();
  return e ? new URL(e) : undefined;
}
//@ chunk-mrx6y2r5.js:53337-53579 esm-fingerprint
function getUrlFromProxySettings(settings) {
  let parsedProxyUrl;
  try {
    parsedProxyUrl = new URL(settings.host);
  } catch (_a) {
    throw Error(`Expecting a valid host string in proxy settings, but found "${settings.host}".`);
  }
  parsedProxyUrl.port = String(settings.port);
  if (settings.username) parsedProxyUrl.username = settings.username;
  if (settings.password) parsedProxyUrl.password = settings.password;
  return parsedProxyUrl;
}
//@ chunk-mrx6y2r5.js:53579-54047 esm-fingerprint
function setProxyAgentOnRequest(request, cachedAgents, proxyUrl) {
  if (request.agent) return;
  let o = new URL(request.url).protocol !== "https:";
  if (request.tlsSettings)
    logger_2.warning(
      "TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.",
    );
  let headers = request.headers.toJSON();
  if (o) {
    if (!cachedAgents.httpProxyAgent)
      cachedAgents.httpProxyAgent = new import_http_proxy_agent.HttpProxyAgent(proxyUrl, {
        headers,
      });
    request.agent = cachedAgents.httpProxyAgent;
  } else {
    if (!cachedAgents.httpsProxyAgent)
      cachedAgents.httpsProxyAgent = new import_https_proxy_agent.HttpsProxyAgent(proxyUrl, {
        headers,
      });
    request.agent = cachedAgents.httpsProxyAgent;
  }
}
//@ chunk-mrx6y2r5.js:54047-54403 esm-fingerprint
function ua(proxySettings, t) {
  if (!noProxyListLoaded) Dl.push(...loadNoProxy());
  let defaultProxy = proxySettings ? getUrlFromProxySettings(proxySettings) : yp();
  let cachedAgents = {};
  return {
    name: proxyPolicyName,
    async sendRequest(request, next) {
      var s;
      if (
        !request.proxySettings &&
        defaultProxy &&
        !isBypassed(
          request.url,
          (s = t === null || t === undefined ? undefined : t.customNoProxyList) !== null && s !== undefined
            ? s
            : Dl,
          (t === null || t === undefined ? undefined : t.customNoProxyList) ? undefined : fp,
        )
      )
        setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
      else if (request.proxySettings)
        setProxyAgentOnRequest(request, cachedAgents, getUrlFromProxySettings(request.proxySettings));
      return next(request);
    },
  };
}
export { ua };
