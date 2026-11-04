/**
 * utils/errors/PassingCauseError.ts
 *
 * PassingCauseError 错误类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1mnz7yj6.js (1)
 * attribution: placement 1
 */
import { CliUserError } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1mnz7yj6.js:227-273 placement
let PassingCauseError; // deferred: uses CliUserError (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1mnz7yj6.js:227", () => {
  PassingCauseError = class PassingCauseError extends CliUserError {
    name = "PassingCauseError";
  };
});
export { PassingCauseError };
