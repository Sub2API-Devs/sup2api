/**
 * utils/git/gitOperationTelemetry.ts
 *
 * 2.1.316 新增：git 操作遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-323717f6.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { baseZipObject } from "../../../vendor/lodash-es/_baseZipObject.js";
import { assignValueIfDifferent } from "./gitSafeEnv.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { getPrCounter } from "../../bootstrap/state.js";

//@ chunk-323717f6.js:1982-1992 placement
var zipObject = baseZipObject;
//@ chunk-323717f6.js:1992-2036 placement
function zipOrEmpty(keys, values) {
  return zipObject(keys || [], values || [], assignValueIfDifferent);
}
//@ chunk-323717f6.js:2036-2047 placement
/**
 * 把操作字段列表与新值打包为对象的辅助函数。
 */
var zipOperationFields = zipOrEmpty;
//@ chunk-323717f6.js:2047-2157 placement
var CREATE_PR_TOOL_NAME_RE =
  /^create[_-]?(pull[_-]?request|merge[_-]?request)$|^(pull[_-]?request|merge[_-]?request)[_-]?create$/i;
//@ chunk-323717f6.js:2157-2261 placement
/**
 * MCP 工具名像“创建 PR”时记 tengu_git_operation 并计数。
 */
function logPrCreateOperation(name) {
  if (!CREATE_PR_TOOL_NAME_RE.test(name)) return;
  logEvent("tengu_git_operation", {
    operation: lit("pr_create"),
  });
  getPrCounter()?.add(1);
}
export { logPrCreateOperation, zipOperationFields };
