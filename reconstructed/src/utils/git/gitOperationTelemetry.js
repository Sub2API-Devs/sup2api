/**
 * utils/git/gitOperationTelemetry.ts
 *
 * 2.1.316 新增：git 操作遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-29pqxdaf.js (5)
 * attribution: placement 5
 */
import { baseZipObject } from "../../../vendor/lodash-es/_baseZipObject.js";
import { Dut } from "./gitSafeEnv.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { getPrCounter } from "../../bootstrap/state.js";

//@ chunk-29pqxdaf.js:1635-1645 placement
var le = baseZipObject;
//@ chunk-29pqxdaf.js:1645-1689 placement
function Ee(e, n) {
  return le(e || [], n || [], Dut);
}
//@ chunk-29pqxdaf.js:1689-1700 placement
var Yqn = Ee;
//@ chunk-29pqxdaf.js:1700-1810 placement
var CREATE_PR_TOOL_NAME_RE =
  /^create[_-]?(pull[_-]?request|merge[_-]?request)$|^(pull[_-]?request|merge[_-]?request)[_-]?create$/i;
/**
 * MCP 工具名像“创建 PR”时记 tengu_git_operation 并计数。
 */
//@ chunk-29pqxdaf.js:1810-1914 placement
function logPrCreateOperation(e) {
  if (!CREATE_PR_TOOL_NAME_RE.test(e)) return;
  (logEvent("tengu_git_operation", { operation: lit("pr_create") }), getPrCounter()?.add(1));
}

export { logPrCreateOperation, Yqn };
