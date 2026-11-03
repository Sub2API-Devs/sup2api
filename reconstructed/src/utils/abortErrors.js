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
import { QJ, _Ue } from "../plugins/functionHooks/dispatch/chain.js";
import { StreamClosedAbortError } from "./errors.js";

//@ chunk-8nnf1scw.js:267-324 placement
var vAn = (r, e) => QJ(r, (o) => o instanceof StreamClosedAbortError) === !0 || _Ue(r, e);
//@ chunk-8nnf1scw.js:324-387 placement
var Zur = (r, e) => r.catch((o) => (_Ue(o, e) ? void 0 : Promise.reject(o)));

export { vAn, Zur };
