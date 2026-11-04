/**
 * @typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 3, esm-fingerprint 7
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_https_proxy_agent } from "../../../../../https-proxy-agent/dist/index.js";
import { require_http_proxy_agent } from "../../../../../http-proxy-agent/dist/index.js";
import { logger_2 } from "../../esm/log.js";

//@ chunk-mrx6y2r5.js:52525-52558 esm-layout
var import_https_proxy_agent = __toESM(require_https_proxy_agent(), 1);
var import_http_proxy_agent = __toESM(require_http_proxy_agent(), 1);
//@ chunk-mrx6y2r5.js:52558-52664 esm-fingerprint
var HTTPS_PROXY = "HTTPS_PROXY";
var HTTP_PROXY = "HTTP_PROXY";
var ALL_PROXY = "ALL_PROXY";
var NO_PROXY = "NO_PROXY";
var proxyPolicyName = "proxyPolicy";
var globalNoProxyList = [];
var noProxyListLoaded = false;
var globalBypassedMap = new Map();
//@ chunk-mrx6y2r5.js:52664-52799 esm-fingerprint
function getEnvironmentValue(name) {
  if (process.env[name]) return process.env[name];
  else if (process.env[name.toLowerCase()]) return process.env[name.toLowerCase()];
  return;
}
//@ chunk-mrx6y2r5.js:52799-52878 esm-layout
function loadEnvironmentProxyValue() {
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
function getDefaultProxySettingsInternal() {
  let proxyUrl = loadEnvironmentProxyValue();
  return proxyUrl ? new URL(proxyUrl) : undefined;
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
  let isInsecureConnection = new URL(request.url).protocol !== "https:";
  if (request.tlsSettings)
    logger_2.warning(
      "TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.",
    );
  let headers = request.headers.toJSON();
  if (isInsecureConnection) {
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
function proxyPolicy(proxySettings, options) {
  if (!noProxyListLoaded) globalNoProxyList.push(...loadNoProxy());
  let defaultProxy = proxySettings
    ? getUrlFromProxySettings(proxySettings)
    : getDefaultProxySettingsInternal();
  let cachedAgents = {};
  return {
    name: proxyPolicyName,
    async sendRequest(request, next) {
      var customNoProxyList;
      if (
        !request.proxySettings &&
        defaultProxy &&
        !isBypassed(
          request.url,
          (customNoProxyList =
            options === null || options === undefined ? undefined : options.customNoProxyList) !== null &&
            customNoProxyList !== undefined
            ? customNoProxyList
            : globalNoProxyList,
          (options === null || options === undefined ? undefined : options.customNoProxyList)
            ? undefined
            : globalBypassedMap,
        )
      )
        setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
      else if (request.proxySettings)
        setProxyAgentOnRequest(request, cachedAgents, getUrlFromProxySettings(request.proxySettings));
      return next(request);
    },
  };
}
export { proxyPolicy };
