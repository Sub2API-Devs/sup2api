/**
 * lodash-es/countBy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { import_createAggregator } from "./_inlinedHelpers.js";
import { assignValueRaw } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-5xgkngpb.js:2285734-2285856 placement
/**
 * lodash countBy 的内联副本（第三方代码误归 toolSearch）。
 */
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
var countBy = import_createAggregator(function (result, key, key_2) {
  if (hasOwnProperty.call(result, key_2)) ++result[key_2];
  else assignValueRaw(result, key_2, 1);
});
var countByAlias = countBy;
export { countByAlias };
