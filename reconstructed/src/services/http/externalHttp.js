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
import { isAxiosError, Dt } from "../../../vendor/axios/dist/esm/axios.js";
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
  return isAxiosError(e) && e.response === void 0 && !AXIOS_NON_TRANSPORT_CODES.has(e.code ?? "");
}
/**
 * externalHttp 的守卫：目标或 baseURL 是 Anthropic 自营域名时抛错，要求改用 firstPartyApi。
 */
//@ chunk-bwbq4xvm.js:162967-163183 placement
function assertNotAnthropicHost(e, s) {
  for (let n of [e, s?.baseURL])
    if (n && isAnthropicHost(n))
      throw Error(
        `externalHttp: ${n} is Anthropic-operated. Use firstPartyApi from ` +
          "src/services/http/firstParty \u2014 it enforces the 3P data-residency gate.",
      );
}
/**
 * externalHttp：给第三方地址用的 axios 门面（get/head/post/put/delete…），每次调用先拒绝 Anthropic 自营域名。
 */
//@ chunk-bwbq4xvm.js:163183-163476 placement
var externalHttp = {
  get(e, s) {
    return (assertNotAnthropicHost(e, s), noteExternalHttpUse(), Dt.get(e, s));
  },
  head(e, s) {
    return (assertNotAnthropicHost(e, s), noteExternalHttpUse(), Dt.head(e, s));
  },
  post(e, s, n) {
    return (assertNotAnthropicHost(e, n), noteExternalHttpUse(), Dt.post(e, s, n));
  },
  put(e, s, n) {
    return (assertNotAnthropicHost(e, n), noteExternalHttpUse(), Dt.put(e, s, n));
  },
  patch(e, s, n) {
    return (assertNotAnthropicHost(e, n), noteExternalHttpUse(), Dt.patch(e, s, n));
  },
  delete(e, s) {
    return (assertNotAnthropicHost(e, s), noteExternalHttpUse(), Dt.delete(e, s));
  },
};

export { isTransportError, externalHttp };
