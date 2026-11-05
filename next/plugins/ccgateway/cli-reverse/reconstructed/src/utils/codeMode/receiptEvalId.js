/**
 * utils/codeMode/receiptEvalId.ts
 *
 * 从异步派发收据（(dispatched #N) 或 evalId 字段）取 eval 号（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kyfefrcg.js (1)
 * attribution: placement 1
 */
import { codeModeAccepted } from "./accepted.js";

//@ chunk-kyfefrcg.js:227-573 placement
/**
 * 从异步派发收据里取 eval 号（evalId 字段或 “(dispatched #N)” 文本）。
 */
function receiptEvalIdOf(toolUseResult) {
  if (!codeModeAccepted()) return;
  let DISPATCHED_RESULT_RE = /^\(dispatched #(\d+)\)$/;
  if (toolUseResult === null || typeof toolUseResult !== "object") return;
  let receipt = toolUseResult;
  if (!("asyncDispatched" in receipt) || receipt.asyncDispatched !== true) return;
  let evalIdValue = "evalId" in receipt ? receipt.evalId : undefined;
  if (typeof evalIdValue === "number") return evalIdValue;
  let result = "result" in receipt ? receipt.result : undefined;
  let match = typeof result === "string" ? DISPATCHED_RESULT_RE.exec(result) : null;
  return match === null ? undefined : Number(match[1]);
}
export { receiptEvalIdOf };
