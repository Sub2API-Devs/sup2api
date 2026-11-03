/**
 * services/http/externalHttp.ts
 *
 * 2.1.316 新增：外部 HTTP 客户端守卫（禁止指向 Anthropic 主机）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (4)
 * attribution: placement 4
 */
import { isAxiosError, axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { isAnthropicHost } from "../../utils/anthropicHosts.js";
import { noteExternalHttpUse } from "../../utils/testNetworkGuard.js";

//@ chunk-bwbq4xvm.js:162612-162897 placement
var AXIOS_NON_TRANSPORT_CODES = new Set([
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
//@ chunk-bwbq4xvm.js:162897-162967 placement
function isTransportError(e) {
  return isAxiosError(e) && e.response === undefined && !AXIOS_NON_TRANSPORT_CODES.has(e.code ?? "");
}
//@ chunk-bwbq4xvm.js:162967-163183 placement
/**
 * externalHttp 的守卫：目标或 baseURL 是 Anthropic 自营域名时抛错，要求改用 firstPartyApi。
 */
function assertNotAnthropicHost(e, s) {
  for (let n of [e, s?.baseURL])
    if (n && isAnthropicHost(n))
      throw Error(
        `externalHttp: ${n} is Anthropic-operated. Use firstPartyApi from ` +
          "src/services/http/firstParty \u2014 it enforces the 3P data-residency gate.",
      );
}
//@ chunk-bwbq4xvm.js:163183-163476 placement
/**
 * externalHttp：给第三方地址用的 axios 门面（get/head/post/put/delete…），每次调用先拒绝 Anthropic 自营域名。
 */
var externalHttp = {
  get(e, s) {
    assertNotAnthropicHost(e, s);
    noteExternalHttpUse();
    return axios_default.get(e, s);
  },
  head(e, s) {
    assertNotAnthropicHost(e, s);
    noteExternalHttpUse();
    return axios_default.head(e, s);
  },
  post(e, s, n) {
    assertNotAnthropicHost(e, n);
    noteExternalHttpUse();
    return axios_default.post(e, s, n);
  },
  put(e, s, n) {
    assertNotAnthropicHost(e, n);
    noteExternalHttpUse();
    return axios_default.put(e, s, n);
  },
  patch(e, s, n) {
    assertNotAnthropicHost(e, n);
    noteExternalHttpUse();
    return axios_default.patch(e, s, n);
  },
  delete(e, s) {
    assertNotAnthropicHost(e, s);
    noteExternalHttpUse();
    return axios_default.delete(e, s);
  },
};
export { isTransportError, externalHttp };
