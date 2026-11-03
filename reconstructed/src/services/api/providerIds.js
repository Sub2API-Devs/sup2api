/**
 * services/api/providerIds.ts
 *
 * 2.1.316 新增：API 提供方标识常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:227039-227171 placement
var PROVIDER_ID_PREFIXES = [
  "msg_bdrk_",
  "msg_vrtx_",
  "bolt-inf-",
  "toolu_bdrk_",
  "toolu_vrtx_",
  "srvtoolu_bdrk_",
  "srvtoolu_vrtx_",
  "req_bdrk_",
  "req_vrtx_",
];
//@ chunk-e6aww6q8.js:227171-227223 placement
function Uue(e) {
  return PROVIDER_ID_PREFIXES.some((n) => e.includes(n));
}
//@ chunk-e6aww6q8.js:227223-227298 placement
function jbt(e) {
  return e.some((n) => {
    try {
      return Uue(jsonStringify(n));
    } catch {
      return !0;
    }
  });
}

export { jbt, Uue };
