/**
 * utils/codeMode/asyncReplReceipt.ts
 *
 * 异步派发收据（asyncDispatched）与轮次中断收据的判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t594wr3p.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";
import { unwrapAbortReason } from "../abortController.js";

//@ chunk-t594wr3p.js:263-313 placement
/**
 * 收据是否为轮次中断（turn-abort）。
 */
function turnAbortDetachesEval(reason) {
  return codeModeAccepted() && unwrapAbortReason(reason) === "turn-abort";
}
//@ chunk-t594wr3p.js:313-419 placement
/**
 * 值是否为异步派发收据（asyncDispatched）。
 */
function isAsyncReplReceipt(receipt) {
  return (
    codeModeAccepted() &&
    receipt !== null &&
    typeof receipt === "object" &&
    "asyncDispatched" in receipt &&
    receipt.asyncDispatched === true
  );
}
export { turnAbortDetachesEval, isAsyncReplReceipt };
