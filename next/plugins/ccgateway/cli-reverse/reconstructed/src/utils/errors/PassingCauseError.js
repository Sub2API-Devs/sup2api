/**
 * utils/errors/PassingCauseError.ts
 *
 * PassingCauseError 错误类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bjjd0r91.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CliUserError } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bjjd0r91.js:227-273 placement
let PassingCauseError; // deferred: uses CliUserError (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bjjd0r91.js:227", () => {
  PassingCauseError = class PassingCauseError extends CliUserError {
    name = "PassingCauseError";
  };
});
export { PassingCauseError };
