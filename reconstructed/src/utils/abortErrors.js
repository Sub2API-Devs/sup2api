/**
 * utils/abortErrors.ts
 *
 * 2.1.316 新增：中止错误判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8nnf1scw.js (2)
 * attribution: placement 2
 */
import { attempt, isAbortOf } from "../plugins/functionHooks/dispatch/chain.js";
import { StreamClosedAbortError } from "./errors.js";

//@ chunk-8nnf1scw.js:267-324 placement
/**
 * 判断错误是否为流关闭中止错误，或满足给定判断。
 */
var isStreamClosedOrAbortError = (error, signal) =>
  attempt(error, (o) => o instanceof StreamClosedAbortError) === true || isAbortOf(error, signal);
//@ chunk-8nnf1scw.js:324-387 placement
/**
 * 吞掉指定的中止错误，其他错误继续抛出。
 */
var swallowAbortError = (r, signal) =>
  r.catch((error) => (isAbortOf(error, signal) ? undefined : Promise.reject(error)));
export { isStreamClosedOrAbortError, swallowAbortError };
