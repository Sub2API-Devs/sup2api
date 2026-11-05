/**
 * services/http/externalHttp.ts
 *
 * 2.1.316 新增：外部 HTTP 客户端守卫（禁止指向 Anthropic 主机）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAxiosError, axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { isAnthropicHost } from "../../utils/anthropicHosts.js";
import { noteExternalHttpUse } from "../../utils/testNetworkGuard.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:161861-162146 placement
var AXIOS_NON_TRANSPORT_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7kayq7nc.js:161861", () => {
  AXIOS_NON_TRANSPORT_CODES = new Set([
    "ERR_BAD_OPTION",
    "ERR_BAD_OPTION_VALUE",
    "ERR_BAD_REQUEST",
    "ERR_BAD_RESPONSE",
    "ERR_CANCELED",
    "ERR_DEPRECATED",
    "ERR_FORM_DATA_DEPTH_EXCEEDED",
    "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
    "ERR_FR_TOO_MANY_REDIRECTS",
    "ERR_INVALID_URL",
    "ERR_NOT_SUPPORT",
    "ERR_STREAM_WRITE_AFTER_END",
  ]);
});
//@ chunk-7kayq7nc.js:162146-162216 placement
function isTransportError(error) {
  return (
    isAxiosError(error) && error.response === undefined && !AXIOS_NON_TRANSPORT_CODES.has(error.code ?? "")
  );
}
//@ chunk-7kayq7nc.js:162216-162432 placement
/**
 * externalHttp 的守卫：目标或 baseURL 是 Anthropic 自营域名时抛错，要求改用 firstPartyApi。
 */
function assertNotAnthropicHost(baseUrl, options) {
  for (let candidate of [baseUrl, options?.baseURL])
    if (candidate && isAnthropicHost(candidate))
      throw Error(
        `externalHttp: ${candidate} is Anthropic-operated. Use firstPartyApi from ` +
          "src/services/http/firstParty \u2014 it enforces the 3P data-residency gate.",
      );
}
//@ chunk-7kayq7nc.js:162432-162725 placement
/**
 * externalHttp：给第三方地址用的 axios 门面（get/head/post/put/delete…），每次调用先拒绝 Anthropic 自营域名。
 */
var externalHttp = {
  get(url, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.get(url, config);
  },
  head(url, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.head(url, config);
  },
  post(url, data, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.post(url, data, config);
  },
  put(url, data, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.put(url, data, config);
  },
  patch(url, data, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.patch(url, data, config);
  },
  delete(url, config) {
    assertNotAnthropicHost(url, config);
    noteExternalHttpUse();
    return axios_default.delete(url, config);
  },
};
export { externalHttp, isTransportError };
