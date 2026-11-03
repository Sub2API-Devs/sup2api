/**
 * lodash-es/countBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { gao } from "./_inlinedHelpers.js";
import { Ohe } from "../../src/utils/git/gitSafeEnv.js";

/**
 * lodash countBy 的内联副本（第三方代码误归 toolSearch）。
 */
//@ chunk-e6aww6q8.js:2230725-2230847 placement
var objectProto = Object.prototype,
  hasOwnProperty = objectProto.hasOwnProperty,
  countBy = gao(function (e, n, r) {
    if (hasOwnProperty.call(e, r)) ++e[r];
    else Ohe(e, r, 1);
  }),
  countByAlias = countBy;

export { countByAlias };
