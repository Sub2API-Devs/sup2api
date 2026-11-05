/**
 * utils/codeMode/scriptHelperNames.ts
 *
 * 脚本 helper 调用名表（searchTools/describeTool 与模型名）与判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0gbhfmj.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";

//@ chunk-c0gbhfmj.js:227-306 placement
var SEARCH_HELPER_NAMES = ["searchTools", "describeTool"];
var MODEL_HELPER_NAMES = ["ask", "haiku", "opus", "sonnet", "fable"];
//@ chunk-c0gbhfmj.js:306-366 placement
/**
 * 工具名是否为脚本 helper（searchTools/describeTool）或模型名（ask/haiku/opus/sonnet/fable）。
 */
function isScriptHelperCallName(name) {
  return codeModeAccepted() && (SEARCH_HELPER_NAMES.includes(name) || MODEL_HELPER_NAMES.includes(name));
}
export { isScriptHelperCallName };
