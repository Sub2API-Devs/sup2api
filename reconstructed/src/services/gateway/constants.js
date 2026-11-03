/**
 * services/gateway/constants.ts
 *
 * 2.1.316 新增：云网关常量（会话过期提示、默认 API 主机等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (8)
 * attribution: placement 8
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { nke } from "../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { Da, Fa } from "../analytics/telemetryCredentialGuard.js";
import { getSettingsSyncEndpoint } from "../settingsSync/index.js";
import { env } from "../../utils/env.js";

//@ chunk-aepeg2w5.js:129220-129239 placement
var sl = Re(nke(), 1);
//@ chunk-aepeg2w5.js:129452-129524 placement
var R3t = "Cloud gateway session expired \u2014 run /login to reconnect.";
//@ chunk-aepeg2w5.js:129524-129537 placement
var ky = 60000;
//@ chunk-aepeg2w5.js:129537-129564 placement
var API_ANTHROPIC_COM = "api.anthropic.com";
//@ chunk-aepeg2w5.js:129564-129618 placement
function fD(e) {
  let n = Tc();
  return Da(n, e) && Da(pD(n), e);
}
//@ chunk-aepeg2w5.js:129618-129645 placement
function pD(e) {
  return getSettingsSyncEndpoint();
}
//@ chunk-aepeg2w5.js:129645-129725 placement
function Tc() {
  if (env.ANTHROPIC_BASE_URL) return Fa(env.ANTHROPIC_BASE_URL);
  return API_ANTHROPIC_COM;
}
//@ chunk-aepeg2w5.js:129725-129758 placement
function Na(e) {
  return Da(Tc(), e);
}

export { Na, sl, R3t, ky, fD, Tc };
